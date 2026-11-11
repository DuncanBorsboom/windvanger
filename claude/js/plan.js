import { $, $$, eur, kwh, store, normalizePostcode, validPostcode, geocode } from "./shared.js";
import { HOUSEHOLD_KWH, parseWeather, syntheticWeather, plan, detail, turbineProfile } from "./energy.js";
import { PRODUCTS } from "./data.js";

const MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const pct = x => Math.round(x * 100) + "%";
const num = (x, d = 0) => x.toLocaleString("nl-NL", { minimumFractionDigits: d, maximumFractionDigits: d });

// Waar de stroom vandaan komt; dezelfde kleuren in maand- en daggrafiek
const SOURCES = [
  { k: "dWind", label: "Wind, direct", color: "var(--wind)" },
  { k: "dSun", label: "Zon, direct", color: "var(--sun)" },
  { k: "bat", label: "Thuisbatterij", color: "var(--bat)" },
  { k: "v2h", label: "Auto levert terug", color: "var(--accent)" },
  { k: "imp", label: "Stroomnet", color: "var(--gridc)" }
];

let weather = null, ctx = null, chosen = "balans", hourly = null, input = null, currentDay = null;

/* ---------- Invoer ---------- */
const saved = store.get("wv-plan", {});
let annualManual = !!saved.annualManual;

function readInput() {
  const f = $("#plan-form");
  return {
    home: f.home.value,
    householdKWh: Math.max(500, +$("#annual").value || HOUSEHOLD_KWH[+$("#persons").value]),
    heat: f.heat.value,
    panels: +$("#panels").value,
    batExisting: +$("#batex").value,
    evOn: $("#ev-on").checked,
    evKm: +$("#evkm").value,
    evPattern: f.evpat.value,
    v2h: $("#v2h").checked,
    price: +$("#price").value,
    feedin: +$("#feedin").value,
    budget: +$("#budget").value,
    batChoice: $("#batchoice").value,
    backup: $("#backup").checked
  };
}

function syncOutputs() {
  const persons = +$("#persons").value;
  $("#persons-out").textContent = persons;
  if (!annualManual) $("#annual").value = HOUSEHOLD_KWH[persons];
  $("#panels-out").textContent = $("#panels").value;
  const b = +$("#batex").value;
  $("#batex-out").textContent = b ? b + " kWh" : "geen";
  $("#evkm-out").textContent = num(+$("#evkm").value);
  $("#price-out").textContent = eur(+$("#price").value, 2);
  $("#feedin-out").textContent = eur(+$("#feedin").value, 2);
  $("#budget-out").textContent = eur(+$("#budget").value);
  $("#ev-fields").hidden = !$("#ev-on").checked;
}

function restore() {
  const f = $("#plan-form");
  for (const [k, v] of Object.entries(saved.values || {})) {
    const el = f.elements[k];
    if (!el) continue;
    if (el instanceof RadioNodeList) el.value = v;
    else if (el.type === "checkbox") el.checked = v;
    else el.value = v;
  }
}
function persist() {
  const f = $("#plan-form"), values = {};
  for (const name of ["home", "heat", "evpat"]) values[name] = f.elements[name].value;
  for (const id of ["persons", "annual", "panels", "batex", "evkm", "price", "feedin", "budget", "batchoice"]) values[id] = $("#" + id).value;
  for (const id of ["ev-on", "v2h", "backup"]) values[id] = $("#" + id).checked;
  store.set("wv-plan", { values, annualManual });
}

/* ---------- Weerdata ---------- */
const weatherCache = new Map();
async function loadWeather(lat, lon, place) {
  const key = lat.toFixed(2) + "," + lon.toFixed(2);
  if (weatherCache.has(key)) return weatherCache.get(key);
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&start_date=2025-01-01&end_date=2025-12-31&hourly=wind_speed_10m,shortwave_radiation,temperature_2m&wind_speed_unit=ms&timezone=Europe%2FAmsterdam`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("weer");
  const w = parseWeather((await res.json()).hourly, place);
  weatherCache.set(key, w);
  return w;
}

async function locate(raw) {
  const status = $("#pc-status");
  const pc = normalizePostcode(raw);
  if (raw && !validPostcode(pc)) { status.textContent = "Vul een geldige postcode in, bijvoorbeeld 1781 AB."; return; }
  status.textContent = "Weerdata van 2025 ophalen…";
  try {
    let loc = { lat: 52.1, lon: 5.18, place: "De Bilt", label: "De Bilt (midden van het land)" };
    if (pc) {
      loc = await geocode(pc);
      if (!loc) { status.textContent = "Deze postcode kennen we niet. Controleer hem en probeer opnieuw."; return; }
      store.set("wv-postcode", pc);
      $("#pc").value = pc.slice(0, 4) + " " + pc.slice(4);
    }
    weather = await loadWeather(loc.lat, loc.lon, loc.place);
    currentDay = null;
    status.textContent = `📍 ${loc.label} — gemeten weer van 2025, ${num(weather.n)} uur`;
  } catch {
    weather = syntheticWeather();
    status.textContent = "Weerdata niet bereikbaar. We rekenen met een voorbeeldjaar op basis van landelijke gemiddelden.";
  }
  renderVs();
  recompute();
}

/* ---------- Stap 1: wind tegenover zon ---------- */
function renderVs() {
  const zephyr = PRODUCTS.find(p => p.id === "zephyr");
  const windRaw = turbineProfile(weather, zephyr), kw = zephyr.watt / 1000;
  const grid = () => Array.from({ length: 12 }, () => ({ sum: new Float64Array(24), n: new Uint16Array(24) }));
  const gw = grid(), gs = grid();
  let wTot = 0, sTot = 0, wNight = 0, sNight = 0, wWinter = 0, sWinter = 0, wDJ = 0, sDJ = 0;
  for (let i = 0; i < weather.n; i++) {
    const m = weather.month[i], h = weather.hour[i];
    const wv = windRaw[i] / kw, sv = (weather.ghi[i] / 1000) * 0.88; // kWh per geïnstalleerde kW
    gw[m].sum[h] += wv; gw[m].n[h]++; gs[m].sum[h] += sv; gs[m].n[h]++;
    wTot += wv; sTot += sv;
    if (h >= 18 || h < 8) { wNight += wv; sNight += sv; }
    if ([10, 11, 0, 1].includes(m)) { wWinter += wv; sWinter += sv; }
    if (m === 11 || m === 0) { wDJ += wv; sDJ += sv; }
  }
  heatmap($("#heat-wind"), gw, "var(--wind)", "kW per kW wind");
  heatmap($("#heat-sun"), gs, "var(--sun)", "kW per kW zon");
  const share = (a, b) => pct(b ? a / b : 0);
  $("#vs-kpis").innerHTML = [
    [`${share(wNight, wTot)} · ${share(sNight, sTot)}`, "van de stroom komt 's avonds en 's nachts (18–8 uur): wind · zon"],
    [`${share(wWinter, wTot)} · ${share(sWinter, sTot)}`, "van de jaaropbrengst valt in nov–feb: wind · zon"],
    [`${num(wDJ, 0)} · ${num(sDJ, 0)} kWh`, "per kW in december en januari: wind · zon"]
  ].map(([b, t]) => `<div class="kpi"><b>${b}</b><span>${t}</span></div>`).join("");
  const ratio = sDJ ? wDJ / sDJ : 0;
  $("#vs-text").textContent = ratio >= 1
    ? `Op jouw adres levert een kilowatt wind in december en januari ${num(ratio, 1)} keer zoveel als een kilowatt zon. Wind en zon vullen elkaar dus precies aan: zon in de zomer, wind in de winter en 's nachts.`
    : `Op jouw adres levert zon per kilowatt ook in de winter meer op dan wind. Wind maakt hier vooral het verschil 's avonds en 's nachts, wanneer je panelen niets doen. Combineer wind daarom met een batterij.`;
}

function heatmap(el, g, color, unit) {
  const avg = g.map(row => Array.from(row.sum, (v, h) => (row.n[h] ? v / row.n[h] : 0)));
  const max = Math.max(...avg.flat(), 1e-6);
  let html = `<div class="hm-corner"></div>` + [0, 6, 12, 18].map(h => `<div class="hm-hour" style="grid-column:${h + 2} / span 6">${String(h).padStart(2, "0")}u</div>`).join("");
  avg.forEach((row, m) => {
    html += `<div class="hm-month">${MONTHS[m]}</div>`;
    row.forEach((v, h) => {
      html += `<div class="hm-cell" style="background:color-mix(in srgb, ${color} ${Math.round((v / max) * 100)}%, var(--paper))" title="${MONTHS[m]} ${String(h).padStart(2, "0")}:00 — ${num(v, 2)} ${unit}"></div>`;
    });
  });
  el.innerHTML = html;
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", `${unit} per maand en uur, donkerder is meer`);
}

/* ---------- Rekenen & tonen ---------- */
let timer;
function schedule() { clearTimeout(timer); timer = setTimeout(recompute, 120); }

function recompute() {
  if (!weather) return;
  input = readInput();
  ctx = plan(weather, input);
  renderNeed();
  renderPackages();
  const pick = ctx.picks.find(p => p.key === chosen) || ctx.picks[0];
  if (pick) { chosen = pick.key; renderDetail(pick); }
  else renderEmpty();
}

function renderNeed() {
  const d = ctx.demand, evKWh = input.evOn ? (input.evKm * 0.18) : 0;
  const parts = [
    { label: "Huishouden", v: d.householdKWh, color: "var(--ink-2)" },
    { label: "Warmtepomp", v: d.hpKWh, color: "var(--heat)" },
    { label: "Auto", v: evKWh, color: "var(--accent)" }
  ].filter(p => p.v > 0);
  const total = parts.reduce((s, p) => s + p.v, 0);
  $("#need-bar").innerHTML = parts.map(p =>
    `<div style="flex:${p.v};--c:${p.color}"><b>${kwh(p.v)}</b><span>${p.label}</span></div>`).join("");

  // Gemiddelde dag in december en januari: verbruik tegenover zonopbrengst
  let need = 0, sun = 0, hours = 0;
  for (let i = 0; i < weather.n; i++) {
    const m = weather.month[i];
    if (m !== 11 && m !== 0) continue;
    need += d.house[i] + d.hp[i]; sun += ctx.sun[i]; hours++;
  }
  const days = hours / 24, needDay = need / days + evKWh / 365, sunDay = sun / days;
  $("#need-text").innerHTML = `Samen <b>${kwh(total)}</b> per jaar. Op een gemiddelde dag in december en januari gebruik je <b>${num(needDay, 1)} kWh</b>` +
    (input.panels ? `, terwijl je ${input.panels} panelen dan gemiddeld <b>${num(sunDay, 1)} kWh</b> per dag leveren. Dat gat moet uit wind, batterij of het net komen.` : `. Zonder zonnepanelen moet dat helemaal uit wind, batterij of het net komen.`);
}

function renderPackages() {
  const el = $("#packages");
  if (!ctx.picks.length) {
    el.innerHTML = `<p class="empty-note">Er past geen pakket bij deze keuzes. Verhoog het budget${input.batChoice !== "auto" ? ", laat de rekentool de batterij kiezen" : ""}${input.backup ? " of zet noodstroom uit" : ""}.</p>`;
    return;
  }
  const base = ctx.base;
  el.innerHTML = ctx.picks.map(p => {
    const c = p.c, r = c.r;
    return `<button type="button" class="pkg" role="radio" aria-checked="${p.key === chosen}" data-key="${p.key}">
      <span class="pkg-tag">${p.label}</span>
      <span class="pkg-name">${c.label}</span>
      <span class="pkg-why">${p.why}</span>
      <span class="pkg-stats">
        <span><b>${pct(r.self)}</b> zelf opgewekt <small>nu ${pct(base.self)}</small></span>
        <span><b>${pct(r.winterSelf)}</b> in de winter <small>nu ${pct(base.winterSelf)}</small></span>
        <span><b>${eur(c.saving)}</b> per jaar bespaard</span>
      </span>
      <span class="pkg-price">${eur(c.price)} <small>${c.extraPanels ? `waarvan ${eur(c.shopPrice)} in de webshop · ` : ""}${isFinite(c.payback) ? "terug in " + num(c.payback, c.payback < 10 ? 1 : 0) + " jaar" : "verdient zich niet terug"}</small></span>
    </button>`;
  }).join("");
  $("#panel-note").hidden = !ctx.picks.some(p => p.c.extraPanels);
}

function renderEmpty() {
  $("#det-title").textContent = "Geen pakket binnen budget";
  $("#det-kpis").innerHTML = "";
  $("#month-chart").innerHTML = "";
  $("#day-chart").innerHTML = "";
  $("#day-text").textContent = "";
  $("#det-buy").hidden = true;
  $("#det-installer").hidden = true;
}

let current = null;
function renderDetail(pick) {
  current = pick;
  const c = pick.c, base = ctx.base;
  const r = detail(weather, input, ctx, c);
  hourly = r.hourly;
  $("#det-eyebrow").textContent = pick.label;
  $("#det-title").textContent = c.label;
  $("#det-buy").hidden = false;
  $("#det-installer").hidden = false;
  $("#det-buy").textContent = `In winkelwagen · ${eur(c.shopPrice)}`;
  const k = [
    [pct(r.self), `zelf opgewekt over het jaar (nu ${pct(base.self)})`, true],
    [pct(r.winterSelf), `in november t/m februari (nu ${pct(base.winterSelf)})`],
    [num(r.gridFreeDays), `dagen helemaal zonder net (nu ${num(base.gridFreeDays)})`],
    [kwh(r.wind), "windopbrengst per jaar"],
    [eur(c.saving), "besparing per jaar"],
    [isFinite(c.payback) ? num(c.payback, 1) + " jr" : "—", "terugverdientijd"],
    [kwh(r.exp), "teruggeleverd aan het net"]
  ];
  $("#det-kpis").innerHTML = k.map(([b, s, hl]) => `<div class="kpi${hl ? " hl" : ""}"><b>${b}</b><span>${s}</span></div>`).join("");

  const sources = SOURCES.filter(s => s.k !== "v2h" || (input.evOn && input.v2h));
  $("#legend").innerHTML = sources.map(s => `<span style="--c:${s.color}">${s.label}</span>`).join("") + `<span class="lg-line">Opwek wind + zon</span><span class="lg-soc">Batterij vol (%)</span>`;

  barChart($("#month-chart"), {
    labels: MONTHS,
    stacks: sources.map(s => ({ ...s, values: r.month.map(m => m[s.k]) })),
    line: r.month.map(m => m.wind + m.sun),
    unit: "kWh",
    caption: "Stroom per maand naar bron"
  });

  jumps = findJumps();
  showDay(currentDay ?? jumps.dark);
}

/* ---------- Dagweergave ---------- */
let jumps = {};
function findJumps() {
  const nd = Math.floor(weather.n / 24), sun = new Float32Array(nd), wind = new Float32Array(nd);
  for (let i = 0; i < nd * 24; i++) { sun[weather.day[i]] += weather.ghi[i]; wind[weather.day[i]] += weather.wind[i]; }
  const monthOf = d => weather.month[d * 24];
  const winter = [...Array(nd).keys()].filter(d => [10, 11, 0, 1].includes(monthOf(d)));
  const summer = [...Array(nd).keys()].filter(d => [5, 6].includes(monthOf(d)));
  const by = (arr, f) => arr.reduce((a, b) => (f(b) < f(a) ? b : a));
  const sunMed = [...winter].map(d => sun[d]).sort((a, b) => a - b)[Math.floor(winter.length / 2)];
  return {
    dark: by(winter, d => sun[d]),
    calm: by(winter.filter(d => sun[d] <= sunMed), d => wind[d]),
    storm: by([...Array(nd).keys()], d => -wind[d]),
    summer: by(summer, d => -sun[d])
  };
}

function showDay(d) {
  currentDay = d;
  $("#day").value = d;
  const date = new Date(weather.dates[d] + "T12:00:00");
  const label = date.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
  $("#day-label").textContent = label.charAt(0).toUpperCase() + label.slice(1);
  const s = d * 24, idx = [...Array(24).keys()].map(h => s + h);
  const sources = SOURCES.filter(x => x.k !== "v2h" || (input.evOn && input.v2h));
  const pick = k => idx.map(i => hourly[k][i]);
  const stacks = sources.map(x => ({ ...x, values: x.k === "imp" ? pick("imp") : pick(x.k) }));
  barChart($("#day-chart"), {
    labels: [...Array(24).keys()].map(h => String(h).padStart(2, "0")),
    labelEvery: 3,
    stacks,
    line: idx.map(i => hourly.wind[i] + hourly.sun[i]),
    soc: current.c.batKWh + input.batExisting > 0 ? pick("batSoc") : null,
    unit: "kWh",
    caption: "Stroom per uur naar bron"
  });
  const sum = k => idx.reduce((a, i) => a + hourly[k][i], 0);
  const house = sum("load") - sum("hp"), hp = sum("hp"), ev = sum("ev");
  const parts = [`huis ${num(house, 1)}`];
  if (hp > 0.05) parts.push(`warmtepomp ${num(hp, 1)}`);
  if (ev > 0.05) parts.push(`auto laden ${num(ev, 1)}`);
  const avgWind = idx.reduce((a, i) => a + weather.wind[i], 0) / 24;
  const bat = current.c.batKWh + input.batExisting;
  $("#day-text").innerHTML = `Gemiddeld <b>${num(avgWind, 1)} m/s</b> wind. Verbruik <b>${num(house + hp + ev, 1)} kWh</b> (${parts.join(", ")}). ` +
    `Wind leverde <b>${num(sum("wind"), 1)} kWh</b>, zon <b>${num(sum("sun"), 1)} kWh</b>` +
    (bat ? `, de batterij <b>${num(sum("bat"), 1)} kWh</b>` : "") +
    (input.evOn && input.v2h ? `, de auto <b>${num(sum("v2h"), 1)} kWh</b>` : "") +
    `. Van het net: <b>${num(sum("imp"), 1)} kWh</b>.`;
  $$(".day-tools .chip").forEach(b => b.setAttribute("aria-pressed", jumps[b.dataset.jump] === d));
}

/* ---------- Grafiek ---------- */
function niceMax(v) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v)), n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

function barChart(el, { labels, stacks, line, soc, unit, labelEvery = 1, caption }) {
  const n = labels.length, W = 640, H = 262, L = 46, R = soc ? 40 : 12, T = 24, B = 26;
  const totals = labels.map((_, i) => stacks.reduce((s, st) => s + st.values[i], 0));
  const max = niceMax(Math.max(...totals, ...(line || [0])));
  const y = v => T + (H - T - B) * (1 - v / max);
  const band = (W - L - R) / n, bw = band * 0.68;
  let svg = "";
  for (let t = 0; t <= 4; t++) {
    const v = (max / 4) * t, yy = y(v);
    svg += `<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}" class="grid"/><text x="${L - 6}" y="${yy + 4}" text-anchor="end">${num(v, v < 10 && v % 1 ? 1 : 0)}</text>`;
  }
  svg += `<text x="${L - 6}" y="10" text-anchor="end" class="unit">${unit}</text>`;
  labels.forEach((lab, i) => {
    const x = L + band * i + (band - bw) / 2;
    let acc = 0, rects = "";
    for (const st of stacks) {
      const v = st.values[i];
      if (v <= 0) continue;
      const y1 = y(acc + v), h = y(acc) - y1;
      rects += `<rect x="${x.toFixed(1)}" y="${y1.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0.5, h).toFixed(1)}" fill="${st.color}"/>`;
      acc += v;
    }
    const tip = `${lab}: ` + stacks.filter(s => s.values[i] > 0.05).map(s => `${s.label} ${num(s.values[i], 1)}`).join(", ") + ` ${unit}`;
    svg += `<g><title>${tip}</title>${rects}<rect x="${(L + band * i).toFixed(1)}" y="${T}" width="${band.toFixed(1)}" height="${H - T - B}" fill="transparent"/></g>`;
    if (i % labelEvery === 0) svg += `<text x="${(L + band * i + band / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle">${lab}</text>`;
  });
  if (line) {
    const pts = line.map((v, i) => `${(L + band * i + band / 2).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    svg += `<polyline points="${pts}" class="prod-line"/>`;
  }
  if (soc) {
    const ys = v => T + (H - T - B) * (1 - v);
    const pts = soc.map((v, i) => `${(L + band * i + band / 2).toFixed(1)},${ys(v).toFixed(1)}`).join(" ");
    svg += `<polyline points="${pts}" class="soc-line"/>`;
    for (const v of [0, 0.5, 1]) svg += `<text x="${W - R + 6}" y="${ys(v) + 4}" class="soc-axis">${v * 100}%</text>`;
  }
  const summary = labels.map((lab, i) => `${lab} ${num(totals[i], 1)}`).join("; ");
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${caption}: ${summary} ${unit}">${svg}</svg>`;
}

/* ---------- Winkelwagen ---------- */
function cartCount() {
  const cart = store.get("wv-cart", {});
  $("#cart-count").textContent = Object.values(cart).reduce((s, q) => s + q, 0);
}
function toast(msg) {
  const t = $("#toast");
  t.innerHTML = msg;
  t.classList.add("show");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove("show"), 3200);
}

/* ---------- Start ---------- */
function init() {
  restore();
  syncOutputs();
  const form = $("#plan-form");
  form.addEventListener("submit", e => e.preventDefault());
  form.addEventListener("input", e => {
    if (e.target.id === "pc") return;
    if (e.target.id === "annual") annualManual = true;
    if (e.target.id === "persons") annualManual = false;
    syncOutputs();
    persist();
    schedule();
  });
  $("#pc-btn").addEventListener("click", () => locate($("#pc").value));
  $("#pc").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); locate($("#pc").value); } });

  $("#packages").addEventListener("click", e => {
    const b = e.target.closest(".pkg");
    if (!b) return;
    chosen = b.dataset.key;
    $$(".pkg").forEach(x => x.setAttribute("aria-checked", x === b));
    renderDetail(ctx.picks.find(p => p.key === chosen));
  });
  $("#day").addEventListener("input", e => showDay(+e.target.value));
  $$(".day-tools .chip").forEach(b => b.addEventListener("click", () => showDay(jumps[b.dataset.jump])));
  $("#det-buy").addEventListener("click", () => {
    const cart = store.get("wv-cart", {});
    for (const [id, q] of Object.entries(current.c.cart)) cart[id] = (cart[id] || 0) + q;
    store.set("wv-cart", cart);
    cartCount();
    toast(`Toegevoegd · <a href="index.html#winkelwagen">Winkelwagen</a> · <a href="installateurs.html">Kies een installateur</a>`);
  });
  // Het gekozen pakket gaat mee naar de offerteaanvraag bij de installateur
  $("#det-installer").addEventListener("click", () => {
    const c = current.c;
    store.set("wv-plan-choice", {
      label: c.label, price: c.price, shopPrice: c.shopPrice, extraPanels: c.extraPanels,
      self: c.r.self, winterSelf: c.r.winterSelf, saving: Math.round(c.saving),
      home: input.home, persons: +$("#persons").value, heat: input.heat, panels: input.panels, ev: input.evOn
    });
  });

  cartCount();
  const pc = store.get("wv-postcode", "");
  if (pc) $("#pc").value = pc;
  locate(pc);
}
init();
