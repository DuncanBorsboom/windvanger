import { PRODUCTS, ADDONS, CATEGORIES, MONTHS, DAYS, FALLBACK_CLIMATE, SALDERING_END, REVIEWS } from "./data.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const eur = (n, dec = 0) => "€ " + n.toLocaleString("nl-NL", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const byId = id => PRODUCTS.find(p => p.id === id) || ADDONS.find(a => a.id === id);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const store = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* privémodus: alleen in geheugen */ } }
};

/* ---------- Windmodel ---------- */
// Vermogensfractie bij Rayleigh-verdeelde wind met gemiddelde v (m/s). Nominaal bij 12 m/s, stormstop bij 25 m/s.
const fracCache = new Map();
function powerFraction(v, cutIn, rated = 12, cutOut = 25) {
  const key = v.toFixed(2) + "|" + cutIn;
  if (fracCache.has(key)) return fracCache.get(key);
  const s = Math.max(v, 0.1) / Math.sqrt(Math.PI / 2);
  let e = 0;
  for (let x = 0.05; x < 30; x += 0.1) {
    const pdf = (x / (s * s)) * Math.exp(-(x * x) / (2 * s * s));
    e += curve(x, cutIn, rated, cutOut) * pdf * 0.1;
  }
  fracCache.set(key, e);
  return e;
}
function curve(x, cutIn, rated = 12, cutOut = 25) {
  if (x < cutIn || x >= cutOut) return 0;
  if (x >= rated) return 1;
  return (x ** 3 - cutIn ** 3) / (rated ** 3 - cutIn ** 3);
}
// Logaritmisch windprofiel: meetwaarde op 10 m omrekenen naar montagehoogte (ruwheid voorstedelijk).
const heightFactor = h => Math.log(h / 0.3) / Math.log(10 / 0.3);
const refYield = p => Math.round((p.watt / 1000) * 8760 * powerFraction(5 * heightFactor(p.mountHeight), p.cutIn));

/* ---------- Turbine-illustratie (3D-helix in SVG) ---------- */
const SVGNS = "http://www.w3.org/2000/svg";
const turbines = new Set();

function turbineSVG(p, { mount = p.cats[0], speed = 1.4 } = {}) {
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("viewBox", "0 0 120 220");
  svg.setAttribute("aria-hidden", "true");
  const cx = 60, top = 18, H = p.watt >= 1000 ? 112 : p.watt >= 500 ? 104 : 92, R = p.watt >= 1000 ? 44 : p.watt >= 500 ? 40 : 34;
  const bottom = top + H;
  let base = "";
  if (mount === "gevel" || mount === "batterij") {
    base = `<rect x="0" y="0" width="10" height="220" fill="var(--line)"/>
      <path d="M10 ${bottom + 26} H${cx} M10 ${bottom + 44} L${cx} ${bottom + 26}" stroke="var(--ink-2)" stroke-width="4" fill="none"/>
      <line x1="${cx}" y1="${top - 6}" x2="${cx}" y2="${bottom + 30}" stroke="var(--ink-2)" stroke-width="4"/>`;
  } else if (mount === "dak") {
    base = `<path d="M-10 230 L60 170 L130 230Z" fill="var(--line)"/>
      <line x1="${cx}" y1="${top - 6}" x2="${cx}" y2="176" stroke="var(--ink-2)" stroke-width="4"/>`;
  } else {
    base = `<line x1="${cx}" y1="${top - 6}" x2="${cx}" y2="212" stroke="var(--ink-2)" stroke-width="4"/>
      <ellipse cx="${cx}" cy="214" rx="34" ry="5" fill="var(--line)"/>`;
  }
  if (p.battery) base += `<rect x="86" y="182" width="26" height="34" rx="5" fill="var(--wind)" opacity=".9"/><rect x="94" y="178" width="10" height="5" rx="1.5" fill="var(--wind)"/><path d="M101 190l-5 9h6l-4 9" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  svg.innerHTML = base + `<g class="rotor"></g>`;
  const g = svg.querySelector(".rotor");
  const t = { svg, phase: Math.random() * 6, speed, visible: false };
  t.draw = () => {
    let back = "", front = "", struts = "";
    for (let b = 0; b < p.blades; b++) {
      const ph = t.phase + (b * 2 * Math.PI) / p.blades;
      let prevFront = null;
      for (let i = 0; i <= 28; i++) {
        const k = i / 28, a = ph + p.twist * Math.PI * k;
        const x = (cx + R * Math.sin(a)).toFixed(1), y = (top + H * k).toFixed(1), isFront = Math.cos(a) >= 0;
        const cmd = (isFront !== prevFront ? "M" : "L") + x + " " + y + " ";
        if (isFront !== prevFront && prevFront !== null) {
          // naad dichten tussen voor- en achterkant
          const seam = "L" + x + " " + y + " ";
          if (prevFront) front += seam; else back += seam;
        }
        if (isFront) front += cmd; else back += cmd;
        prevFront = isFront;
      }
      for (const k of [0, 1]) {
        const a = ph + p.twist * Math.PI * k;
        struts += `M${cx} ${top + H * k} L${(cx + R * Math.sin(a)).toFixed(1)} ${top + H * k} `;
      }
    }
    g.innerHTML = `<path d="${back}" stroke="var(--muted)" stroke-opacity=".45" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="${struts}" stroke="var(--ink-2)" stroke-width="2" fill="none"/>
      <path d="${front}" stroke="var(--ink)" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  };
  t.draw();
  turbines.add(t);
  io.observe(svg);
  svg._t = t;
  return svg;
}

const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.target._t) e.target._t.visible = e.isIntersecting; }));
let lastFrame = performance.now();
function animate(now) {
  const dt = Math.min((now - lastFrame) / 1000, 0.1);
  lastFrame = now;
  for (const t of turbines) {
    if (!t.svg.isConnected) { turbines.delete(t); continue; }
    if (!t.visible) continue;
    t.phase += t.speed * dt;
    t.draw();
  }
  requestAnimationFrame(animate);
}
if (!reduceMotion) requestAnimationFrame(animate);

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

/* ---------- Winkelwagen ---------- */
const FREE_SHIPPING = 1000;
let cart = store.get("wv-cart", {});

function cartLines() { return Object.entries(cart).filter(([id, q]) => q > 0 && byId(id)).map(([id, qty]) => ({ item: byId(id), qty })); }
function cartTotal() { return cartLines().reduce((s, l) => s + l.item.price * l.qty, 0); }

function addToCart(id, qty = 1) {
  cart[id] = (cart[id] || 0) + qty;
  saveCart();
  toast(`${byId(id).name} toegevoegd`);
  const btn = $("#cart-open");
  btn.classList.remove("bump"); void btn.offsetWidth; btn.classList.add("bump");
}
function setQty(id, qty) {
  if (qty <= 0) delete cart[id]; else cart[id] = qty;
  saveCart();
}
function saveCart() { store.set("wv-cart", cart); renderCart(); }

function renderCart() {
  const lines = cartLines();
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const total = cartTotal();
  $("#cart-count").textContent = count;
  $("#mobile-total").textContent = eur(total);
  $("#cart-total").textContent = eur(total);
  $("#co-total").textContent = eur(total);
  $("#cart-in3").textContent = total ? `of 3 × ${eur(total / 3, 2)} met in3, 0% rente` : "";
  $("#checkout-btn").disabled = !count;

  const left = FREE_SHIPPING - total;
  $("#ship-progress").innerHTML = total
    ? `${left > 0 ? `Nog <b>${eur(left)}</b> tot gratis bezorging &amp; installatiecheck` : "🎉 Gratis bezorging &amp; installatiecheck"}
       <div class="track"><span style="width:${Math.min(100, (total / FREE_SHIPPING) * 100)}%"></span></div>`
    : "";

  const body = $("#cart-items");
  body.replaceChildren();
  if (!lines.length) {
    body.innerHTML = `<div class="empty"><p>Je winkelwagen is nog leeg.</p><a class="btn btn-dark" href="#kiezer" data-close-cart>Doe de keuzehulp</a></div>`;
  }
  for (const { item, qty } of lines) {
    const row = document.createElement("div");
    row.className = "line";
    const art = document.createElement("div");
    art.className = "line-art";
    if (item.watt) art.append(turbineSVG(item, { speed: 0.8 })); else art.textContent = item.id === "installatie" ? "🔧" : item.id === "batterij-module" ? "🔋" : "🛡️";
    row.append(art);
    row.insertAdjacentHTML("beforeend", `
      <div><h4>${item.name}</h4><span class="muted">${item.tag || item.note}</span>
        <div class="qty"><button aria-label="Minder" data-q="-1">−</button><span>${qty}</span><button aria-label="Meer" data-q="1">+</button></div></div>
      <div class="line-price">${eur(item.price * qty)}</div>`);
    row.addEventListener("click", e => { const b = e.target.closest("[data-q]"); if (b) setQty(item.id, qty + +b.dataset.q); });
    body.append(row);
  }

  // Upsell alleen als er een turbine in zit
  const up = $("#cart-upsell");
  const hasTurbine = lines.some(l => l.item.watt);
  const offers = ADDONS.filter(a => !cart[a.id]);
  up.hidden = !hasTurbine || !offers.length;
  up.innerHTML = `<h3>Vaak samen gekocht</h3>` + offers.map(a =>
    `<div class="upsell"><div>${a.name}<small>${a.note}</small></div><button class="btn btn-ghost" data-add="${a.id}">+ ${eur(a.price)}</button></div>`).join("");
}

function initCart() {
  const drawer = $("#cart");
  const open = () => { drawer.showModal(); };
  $("#cart-open").addEventListener("click", open);
  $("#mobile-cart").addEventListener("click", open);
  drawer.addEventListener("click", e => {
    if (e.target === drawer || e.target.closest("[data-close]") || e.target.closest("[data-close-cart]")) drawer.close();
    const add = e.target.closest("[data-add]");
    if (add) addToCart(add.dataset.add);
  });
  $("#checkout-btn").addEventListener("click", () => { drawer.close(); $("#checkout").showModal(); });
  renderCart();
}

/* ---------- Productkaarten ---------- */
const compare = new Set();

function priceHTML(p) {
  return `<div class="price">${p.oldPrice ? `<s>${eur(p.oldPrice)}</s>` : ""}${eur(p.price)}<span class="per">of 3 × ${eur(p.price / 3, 2)} met in3</span></div>`;
}

function productCard(p) {
  const card = document.createElement("article");
  card.className = "card";
  card.style.viewTransitionName = "card-" + p.id;
  const pills = Object.values(p.specs).slice(0, 3).map(s => `<li>${s}</li>`).join("");
  card.innerHTML = `
    ${p.badge ? `<span class="badge">${p.badge}</span>` : ""}
    ${p.oldPrice ? `<span class="badge sale">−${eur(p.oldPrice - p.price)}</span>` : ""}
    <button class="card-art" aria-label="Details van ${p.name}"></button>
    <div class="card-body">
      <span class="card-tag">${p.tag}</span>
      <h3>${p.name}</h3>
      <p>${p.desc}</p>
      <ul class="spec-pills">${pills}</ul>
      <div class="yield">🌬️ ≈ <b>${refYield(p).toLocaleString("nl-NL")} kWh</b>/jaar bij 5 m/s · ${p.db} dB</div>
      <div class="price-row">${priceHTML(p)}<button class="btn btn-primary" data-buy>In winkelwagen</button></div>
      <div class="card-actions">
        <button class="link-btn" data-details>Details &amp; wat zit erin</button>
        <label class="compare-toggle"><input type="checkbox" data-compare ${compare.has(p.id) ? "checked" : ""}> Vergelijk</label>
      </div>
    </div>`;
  $(".card-art", card).append(turbineSVG(p));
  card.addEventListener("click", e => {
    if (e.target.closest("[data-buy]")) addToCart(p.id);
    if (e.target.closest("[data-details], .card-art")) openProduct(p.id);
  });
  $("[data-compare]", card).addEventListener("change", e => toggleCompare(p.id, e.target));
  return card;
}

let activeCat = "all";
function renderProducts() {
  const grid = $("#product-grid");
  const list = PRODUCTS.filter(p => activeCat === "all" || p.cats.includes(activeCat));
  grid.replaceChildren(...list.map(productCard));
}

function initProducts() {
  const bar = $("#filters");
  for (const c of CATEGORIES) {
    const b = document.createElement("button");
    b.className = "chip";
    b.textContent = c.label;
    b.setAttribute("aria-pressed", c.key === activeCat);
    b.addEventListener("click", () => {
      activeCat = c.key;
      $$(".chip", bar).forEach(x => x.setAttribute("aria-pressed", x === b));
      if (document.startViewTransition && !reduceMotion) document.startViewTransition(renderProducts);
      else renderProducts();
    });
    bar.append(b);
  }
  renderProducts();
}

function openProduct(id) {
  const p = byId(id);
  const m = $("#product-modal");
  const specs = Object.entries(p.specs).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
  $("#pm-body").innerHTML = `
    <div class="pm">
      <div class="pm-art"></div>
      <div>
        <span class="card-tag">${p.tag}</span>
        <h2 id="pm-title">${p.name}</h2>
        <p>${p.desc}</p>
        <dl>${specs}<dt>Opbrengst</dt><dd>≈ ${refYield(p).toLocaleString("nl-NL")} kWh/jaar bij 5 m/s</dd></dl>
        <strong>In de doos</strong>
        <ul>${p.inBox.map(i => `<li>${i}</li>`).join("")}</ul>
        <div class="price-row">${priceHTML(p)}<button class="btn btn-primary" data-buy>In winkelwagen</button></div>
        <p><button class="link-btn" data-calc>Bereken opbrengst op mijn adres →</button></p>
      </div>
    </div>`;
  $(".pm-art", m).append(turbineSVG(p, { speed: 1.8 }));
  m.onclick = e => {
    if (e.target === m || e.target.closest("[data-close]")) m.close();
    if (e.target.closest("[data-buy]")) { addToCart(p.id); m.close(); }
    if (e.target.closest("[data-calc]")) { m.close(); selectCalcTurbine(p.id); location.hash = "#windcheck"; }
  };
  m.showModal();
}

/* ---------- Vergelijken ---------- */
function toggleCompare(id, input) {
  if (input.checked && compare.size >= 3) { input.checked = false; toast("Je kunt maximaal 3 producten vergelijken"); return; }
  input.checked ? compare.add(id) : compare.delete(id);
  const bar = $("#compare-bar");
  bar.hidden = compare.size === 0;
  $("#compare-label").textContent = `${compare.size} geselecteerd`;
}
function initCompare() {
  $("#compare-clear").addEventListener("click", () => { compare.clear(); $("#compare-bar").hidden = true; $$("[data-compare]").forEach(i => (i.checked = false)); });
  $("#compare-open").addEventListener("click", () => {
    const items = [...compare].map(byId);
    const rows = [
      ["Prijs", p => eur(p.price)],
      ["Piekvermogen", p => p.specs.Piekvermogen],
      ["Geluid", p => p.db + " dB"],
      ["Startwind", p => p.cutIn.toLocaleString("nl-NL") + " m/s"],
      ["Opbrengst bij 5 m/s", p => "≈ " + refYield(p).toLocaleString("nl-NL") + " kWh/jaar"],
      ["Thuisbatterij", p => p.battery ? p.battery.toLocaleString("nl-NL") + " kWh inbegrepen" : "Koppelkit inbegrepen"],
      ["Montage", p => p.specs.Montage]
    ];
    $("#compare-table").innerHTML = `<table class="cmp"><thead><tr><td></td>${items.map(p => `<th scope="col">${p.name}</th>`).join("")}</tr></thead>
      <tbody>${rows.map(([label, fn]) => `<tr><th scope="row">${label}</th>${items.map(p => `<td>${fn(p)}</td>`).join("")}</tr>`).join("")}
      <tr><td></td>${items.map(p => `<td><button class="btn btn-primary" data-add="${p.id}">In winkelwagen</button></td>`).join("")}</tr></tbody></table>`;
    $("#compare-modal").showModal();
  });
  $("#compare-modal").addEventListener("click", e => {
    const m = $("#compare-modal");
    if (e.target === m || e.target.closest("[data-close]")) m.close();
    const add = e.target.closest("[data-add]");
    if (add) addToCart(add.dataset.add);
  });
}

/* ---------- Keuzehulp ---------- */
function initFinder() {
  const form = $("#finder");
  const sets = $$("fieldset", form);
  sets.slice(1).forEach(f => (f.disabled = true));
  form.addEventListener("change", () => {
    const d = Object.fromEntries(new FormData(form));
    sets[1].disabled = !d.home;
    sets[2].disabled = !d.goal;
    if (d.home && d.goal && d.battery) showRecommendation(d);
  });
}

function showRecommendation({ home, goal, battery }) {
  const scored = PRODUCTS.map(p => {
    let s = 0;
    if (p.fit.home.includes(home)) s += 3; else s -= 5;
    if (p.fit.goal.includes(goal)) s += 2;
    if (goal === "onafhankelijk" && battery === "nee" && p.battery) s += 2;
    if (battery === "ja" && p.battery) s -= 2;
    if (p.badge === "Bestseller") s += 0.5;
    if (home === "vrijstaand") s += p.watt / 1000; // meer ruimte = meer vermogen
    return { p, s };
  }).sort((a, b) => b.s - a.s);
  const p = scored[0].p;
  const reasons = [
    home === "appartement" ? "Past op een balkon, geen vergunning nodig" : home === "rijtjeshuis" ? "Compact genoeg voor gevel of dak van een rijtjeshuis" : "Je hebt de ruimte voor meer vermogen",
    battery === "ja" ? "Sluit direct aan op je bestaande thuisbatterij" : p.battery ? `Inclusief ${p.battery.toLocaleString("nl-NL")} kWh batterij met noodstroom` : "Later uit te breiden met een batterij",
    goal === "onafhankelijk" ? "Blijft opladen tijdens een stroomstoring" : `Slechts ${p.db} dB — stiller dan je koelkast`
  ];
  const out = $("#finder-result");
  out.hidden = false;
  out.innerHTML = `<div class="fr-art"></div>
    <div>
      <p class="eyebrow">Ons advies voor jou</p>
      <h3>${p.name}</h3>
      <span class="card-tag">${p.tag}</span>
      <ul>${reasons.map(r => `<li>${r}</li>`).join("")}</ul>
      <div class="fr-actions">
        <button type="button" class="btn btn-primary" data-buy>In winkelwagen · ${eur(p.price)}</button>
        <button type="button" class="link-btn" data-calc>Check opbrengst op mijn adres</button>
      </div>
    </div>`;
  $(".fr-art", out).append(turbineSVG(p, { speed: 1.8 }));
  out.onclick = e => {
    if (e.target.closest("[data-buy]")) addToCart(p.id);
    if (e.target.closest("[data-calc]")) { selectCalcTurbine(p.id); location.hash = "#windcheck"; }
  };
}

/* ---------- Locatie & klimaatdata ---------- */
const normalizePostcode = s => (s || "").replace(/\s+/g, "").toUpperCase();
const validPostcode = s => /^[1-9][0-9]{3}[A-Z]{2}$/.test(s);

async function geocode(postcode, number) {
  const q = number ? `postcode:${postcode} and huisnummer:${number}` : `postcode:${postcode}`;
  const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(q)}&fq=type:${number ? "adres" : "postcode"}&rows=1&fl=centroide_ll,woonplaatsnaam,weergavenaam`;
  const res = await fetch(url);
  const doc = (await res.json()).response.docs[0];
  if (!doc) return null;
  const [lon, lat] = doc.centroide_ll.match(/[-\d.]+/g).map(Number);
  return { lat, lon, place: doc.woonplaatsnaam, label: doc.weergavenaam };
}

async function fetchClimate(lat, lon) {
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&start_date=2025-01-01&end_date=2025-12-31&daily=wind_speed_10m_mean,shortwave_radiation_sum&wind_speed_unit=ms&timezone=Europe%2FAmsterdam`;
  const d = (await (await fetch(url)).json()).daily;
  const windDays = MONTHS.map(() => []);
  const sun = MONTHS.map(() => 0);
  d.time.forEach((t, i) => {
    const m = +t.slice(5, 7) - 1;
    if (d.wind_speed_10m_mean[i] != null) windDays[m].push(d.wind_speed_10m_mean[i]);
    sun[m] += (d.shortwave_radiation_sum[i] || 0) / 3.6; // MJ/m² → kWh/m²
  });
  return { windDays, sun };
}

async function liveWind(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&current=wind_speed_10m&wind_speed_unit=ms`;
  return (await (await fetch(url)).json()).current.wind_speed_10m;
}

/* ---------- Live windkaart in de hero ---------- */
const heroProduct = PRODUCTS.find(p => p.id === "stormvogel");
let heroTurbine;
async function updateLive(lat = 52.1, lon = 5.18, place = "De Bilt") {
  const zephyr = byId("zephyr");
  try {
    const v = await liveWind(lat, lon);
    const vh = v * heightFactor(zephyr.mountHeight);
    const w = Math.round(zephyr.watt * curve(vh, zephyr.cutIn));
    $("#live-wind").textContent = v.toLocaleString("nl-NL", { maximumFractionDigits: 1 }) + " m/s";
    $("#live-place").textContent = place;
    $("#live-watt").textContent = w + " W";
    $("#live-meter").style.width = Math.min(100, (w / zephyr.watt) * 100) + "%";
    if (heroTurbine) heroTurbine._t.speed = 0.6 + v * 0.45;
  } catch {
    $("#live-card").hidden = true;
  }
}

/* ---------- Windcheck ---------- */
let climate = { place: FALLBACK_CLIMATE.place, windDays: FALLBACK_CLIMATE.wind.map((v, m) => Array(DAYS[m]).fill(v)), sun: FALLBACK_CLIMATE.sun, monthlyOnly: true };

function selectCalcTurbine(id) { $("#calc-turbine").value = id; renderCalc(); }

function renderCalc() {
  const p = byId($("#calc-turbine").value);
  const panels = +$("#calc-panels").value;
  const price = +$("#calc-price").value;
  $("#calc-panels-out").textContent = panels;
  $("#calc-price-out").textContent = eur(price, 2);
  const hf = heightFactor(p.mountHeight);
  const kWp = panels * 0.41;

  const wind = climate.windDays.map(days => days.reduce((s, v) => s + (p.watt / 1000) * 24 * powerFraction(v * hf, p.cutIn), 0));
  const sun = climate.sun.map(rad => kWp * rad * 0.85);
  const max = Math.max(...wind, ...sun, 1);
  const chart = $("#calc-chart");
  if (!chart.children.length) {
    chart.innerHTML = MONTHS.map((m, i) => `<div class="bar${[0, 1, 10, 11].includes(i) ? " winter" : ""}"><i class="w"></i><i class="s"></i><small>${m}</small></div>`).join("");
  }
  $$(".bar", chart).forEach((bar, i) => {
    $(".w", bar).style.height = (wind[i] / max) * 100 + "%";
    $(".s", bar).style.height = (sun[i] / max) * 100 + "%";
    bar.title = `${MONTHS[i]}: wind ${Math.round(wind[i])} kWh · zon ${Math.round(sun[i])} kWh`;
  });
  chart.setAttribute("aria-label", "Maandopbrengst: " + MONTHS.map((m, i) => `${m} wind ${Math.round(wind[i])}, zon ${Math.round(sun[i])} kWh`).join("; "));

  const sum = a => a.reduce((s, x) => s + x, 0);
  const winter = a => a[0] + a[1] + a[10] + a[11];
  const total = sum(wind), saving = total * price;
  const payback = saving > 0 ? p.price / saving : Infinity;
  const kpis = [
    [Math.round(total).toLocaleString("nl-NL") + " kWh", `wind per jaar met ${p.name}`, true],
    [Math.round(winter(wind)).toLocaleString("nl-NL") + " kWh", "wind in nov–feb"],
    [Math.round(winter(sun)).toLocaleString("nl-NL") + " kWh", `zon in nov–feb (${panels} panelen)`],
    [eur(saving), "besparing per jaar bij eigen verbruik"],
    [payback > 25 ? "> 25 jr" : Math.round(payback) + " jr", `terugverdientijd op ${eur(p.price)}`]
  ];
  $("#calc-kpis").innerHTML = kpis.map(([b, s, hl]) => `<div class="kpi${hl ? " hl" : ""}"><b>${b}</b><span>${s}</span></div>`).join("");
}

async function runWindcheck(raw) {
  const pc = normalizePostcode(raw);
  const placeEl = $("#calc-place");
  if (!validPostcode(pc)) { placeEl.textContent = "Vul een geldige postcode in, bijv. 1781 AB"; return; }
  store.set("wv-postcode", pc);
  $("#calc-postcode").value = pc.slice(0, 4) + " " + pc.slice(4);
  placeEl.textContent = "Winddata ophalen";
  placeEl.classList.add("loading");
  try {
    const loc = await geocode(pc);
    if (!loc) throw new Error("Postcode niet gevonden");
    const c = await fetchClimate(loc.lat, loc.lon);
    climate = { place: loc.label, ...c };
    placeEl.textContent = `📍 ${loc.label} — gemeten wind & zon 2025`;
    updateLive(loc.lat, loc.lon, loc.place);
  } catch (err) {
    placeEl.textContent = `${err.message === "Postcode niet gevonden" ? "Postcode niet gevonden" : "Live data niet bereikbaar"} — we tonen het landelijk gemiddelde.`;
  } finally {
    placeEl.classList.remove("loading");
    renderCalc();
  }
}

function initCalc() {
  const sel = $("#calc-turbine");
  sel.innerHTML = PRODUCTS.map(p => `<option value="${p.id}">${p.name} — ${p.specs.Piekvermogen}</option>`).join("");
  sel.value = "zephyr";
  $("#calc-form").addEventListener("input", e => { if (e.target.id !== "calc-postcode") renderCalc(); });
  $("#calc-form").addEventListener("submit", e => { e.preventDefault(); runWindcheck($("#calc-postcode").value); });
  $("#hero-check").addEventListener("submit", e => {
    e.preventDefault();
    runWindcheck($("#hero-postcode").value);
    $("#windcheck").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  });
  renderCalc();
  const saved = store.get("wv-postcode", null);
  if (saved) { $("#hero-postcode").value = saved; runWindcheck(saved); }
}

/* ---------- Energiestroom ---------- */
function initFlow() {
  const btn = $("#outage-btn");
  const set = outage => {
    const on = (sel, state) => { const el = $(sel); el.classList.remove("on", "off"); if (state) el.classList.add(state); };
    on(".fl-wind", "on"); on(".fl-sun", "on"); on(".fl-house", "on");
    on(".fl-bat", outage ? "on" : "on"); on(".fl-bathouse", outage ? "on" : null);
    on(".fl-grid", outage ? "off" : null);
    $(".node-grid").classList.toggle("down", outage);
    $(".node-bat").classList.toggle("charging", !outage);
    $(".node-house").classList.add("lit");
    $("#grid-label").textContent = outage ? "net valt uit ✕" : "net · back-up";
    $("#bat-label").textContent = outage ? "batterij levert" : "batterij 72% ↑";
    btn.setAttribute("aria-pressed", outage);
    btn.textContent = outage ? "↺ Net herstellen" : "⚡ Simuleer stroomstoring";
  };
  btn.addEventListener("click", () => set(btn.getAttribute("aria-pressed") !== "true"));
  set(false);
}

/* ---------- Saldering-aftelklok ---------- */
function initCountdown() {
  const end = new Date(SALDERING_END).getTime();
  const tick = () => {
    const ms = Math.max(0, end - Date.now());
    const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4);
    $('[data-u="d"]').textContent = d;
    $('[data-u="h"]').textContent = h;
    $('[data-u="m"]').textContent = String(m).padStart(2, "0");
    $("#countdown-short").textContent = ms ? `nog ${d} dagen` : "vanaf nu";
  };
  tick();
  setInterval(tick, 30000);
}

/* ---------- Afrekenen (demo) ---------- */
function initCheckout() {
  const m = $("#checkout");
  m.addEventListener("click", e => { if (e.target === m || e.target.closest("[data-close]")) m.close(); });
  let timer;
  const lookup = () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const pc = normalizePostcode($("#co-postcode").value), nr = $("#co-number").value.trim();
      if (!validPostcode(pc) || !/^\d+/.test(nr)) { $("#co-address").textContent = ""; return; }
      try {
        const a = await geocode(pc, nr.match(/^\d+/)[0]);
        $("#co-address").textContent = a ? "✓ " + a.label : "Adres niet gevonden — controleer postcode en huisnummer";
      } catch { $("#co-address").textContent = ""; }
    }, 400);
  };
  $("#co-postcode").addEventListener("input", lookup);
  $("#co-number").addEventListener("input", lookup);
  $$(".btn-express", m).forEach(b => b.addEventListener("click", () => toast("Demo: express-betalen is niet gekoppeld")));
  $("#checkout-form").addEventListener("submit", e => {
    e.preventDefault();
    m.close();
    toast("Demo: bestelling is niet echt geplaatst");
  });
}

/* ---------- Overig ---------- */
function initReviews() {
  $("#reviews").innerHTML = REVIEWS.map(r => `<figure class="rev"><div class="stars" aria-label="${r.stars} van 5 sterren">${"★".repeat(r.stars)}${"☆".repeat(5 - r.stars)}</div>
    <blockquote>“${r.text}”</blockquote><figcaption>${r.name}, ${r.place} · ${r.product}</figcaption></figure>`).join("");
}

function initStructuredData() {
  const url = location.href.split("#")[0];
  const products = PRODUCTS.map(p => ({
    "@type": "Product", name: `Windvanger ${p.name}`, description: p.desc, sku: p.id, brand: { "@type": "Brand", name: "Windvanger" },
    offers: { "@type": "Offer", price: p.price, priceCurrency: "EUR", availability: "https://schema.org/InStock", url: url + "#turbines" }
  }));
  const faq = { "@type": "FAQPage", mainEntity: $$(".faq details").map(d => ({ "@type": "Question", name: $("summary", d).textContent, acceptedAnswer: { "@type": "Answer", text: $("p", d).textContent } })) };
  $("#ld-products").textContent = JSON.stringify({ "@context": "https://schema.org", "@graph": [...products, faq] });
}

function initChrome() {
  const header = $(".site-header"), bar = $("#mobile-bar");
  const onScroll = () => {
    header.classList.toggle("scrolled", scrollY > 10);
    bar.classList.toggle("show", scrollY > innerHeight * 0.8);
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  $("#signup-form").addEventListener("submit", e => { e.preventDefault(); e.target.reset(); toast("Bedankt! (demo — er is niets verstuurd)"); });
}

/* ---------- Start ---------- */
heroTurbine = turbineSVG(heroProduct, { mount: "tuin", speed: 2 });
$("#hero-turbine").append(heroTurbine);
initChrome();
initCart();
initProducts();
initCompare();
initFinder();
initCalc();
initFlow();
initCountdown();
initCheckout();
initReviews();
initStructuredData();
updateLive();
