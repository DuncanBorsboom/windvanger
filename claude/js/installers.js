import { $, $$, eur, store, normalizePostcode, validPostcode, geocode } from "./shared.js";
import { INSTALLERS, SKILLS } from "./installers-data.js";

const HOMES = { appartement: "appartement", rijtjeshuis: "rijtjeshuis", tweekapper: "twee-onder-een-kap", vrijstaand: "vrijstaand huis" };
const HEAT = { gas: "cv op gas", hybride: "hybride warmtepomp", wp: "volledige warmtepomp" };
const pct = x => Math.round(x * 100) + "%";

let origin = null, results = [], map = null, markers = new Map(), originMarker = null;
const plan = store.get("wv-plan-choice", null);

function km(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function planSummary() {
  if (!plan) return "";
  const parts = [`Pakket uit de rekentool: ${plan.label} (indicatie ${eur(plan.price)}).`];
  parts.push(`Situatie: ${HOMES[plan.home] || plan.home}, ${plan.persons} personen, ${plan.panels} zonnepanelen, ${HEAT[plan.heat] || plan.heat}${plan.ev ? ", elektrische auto" : ""}.`);
  parts.push(`Verwachting: ${pct(plan.self)} zelf opgewekt, ${pct(plan.winterSelf)} in de winter, ${eur(plan.saving)} besparing per jaar.`);
  return parts.join("\n");
}

/* ---------- Zoeken ---------- */
function search() {
  const radius = +$("#radius").value;
  const need = $$(".skill-filter input:checked").map(i => i.value);
  results = INSTALLERS
    .map(i => ({ ...i, dist: origin ? km(origin, i) : null }))
    .filter(i => (!origin || i.dist <= radius) && need.every(s => i.skills.includes(s)))
    .sort((a, b) => (origin ? a.dist - b.dist : b.rating - a.rating));
  render();
}

function render() {
  const list = $("#list");
  $("#result-count").textContent = origin
    ? `${results.length} installateur${results.length === 1 ? "" : "s"} binnen ${$("#radius").value === "999" ? "Nederland" : $("#radius").value + " km"} van ${origin.place}`
    : `${results.length} installateurs in Nederland. Vul je postcode in om op afstand te sorteren.`;
  $("#multi-quote").hidden = !(origin && results.length >= 2);
  $("#multi-quote").textContent = `Vraag ${Math.min(3, results.length)} offertes tegelijk aan`;
  if (!results.length) {
    list.innerHTML = `<li class="empty-note">Geen installateur gevonden met deze filters. Vergroot de afstand of zet een filter uit.</li>`;
  } else {
    list.innerHTML = results.map(i => `
      <li class="installer" data-id="${i.id}">
        <div class="inst-main">
          <h3>${i.name} <span class="demo-tag">voorbeeld</span></h3>
          <p class="inst-meta">${i.city}${i.dist != null ? ` · <b>${Math.round(i.dist)} km</b>` : ""} · <span class="stars" aria-label="${i.rating} van 5">★ ${i.rating.toLocaleString("nl-NL")}</span> <small>(${i.reviews})</small></p>
          <ul class="inst-tags">
            <li class="lvl ${i.level === "Gecertificeerd" ? "gold" : ""}">${i.level === "Gecertificeerd" ? "Gecertificeerd Windvanger-installateur" : "Windvanger-partner"}</li>
            ${i.skills.map(s => `<li>${SKILLS[s]}</li>`).join("")}
          </ul>
        </div>
        <div class="inst-side">
          <span class="slot">Eerste plek over <b>${i.weeks} ${i.weeks === 1 ? "week" : "weken"}</b></span>
          <button class="btn btn-primary" data-quote="${i.id}">Offerte aanvragen</button>
        </div>
      </li>`).join("");
  }
  drawMap();
}

/* ---------- Kaart ---------- */
function drawMap() {
  if (!window.L) { $(".map-wrap").hidden = true; return; }
  if (!map) {
    map = L.map("map", { scrollWheelZoom: false }).setView([52.2, 5.4], 7);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap-bijdragers" }).addTo(map);
  }
  markers.forEach(m => m.remove());
  markers.clear();
  for (const i of results) {
    const m = L.circleMarker([i.lat, i.lon], { radius: 9, color: "#0f1b24", weight: 2, fillColor: i.level === "Gecertificeerd" ? "#2fc4b2" : "#f5b52e", fillOpacity: 0.95 })
      .addTo(map).bindTooltip(`${i.name} · ${i.city}`);
    m.on("click", () => {
      const li = $(`.installer[data-id="${i.id}"]`);
      li?.scrollIntoView({ behavior: "smooth", block: "center" });
      li?.classList.add("flash");
      setTimeout(() => li?.classList.remove("flash"), 1200);
    });
    markers.set(i.id, m);
  }
  originMarker?.remove();
  if (origin) originMarker = L.marker([origin.lat, origin.lon], { title: "Jouw adres" }).addTo(map).bindTooltip("Jouw postcode");
  const pts = results.map(i => [i.lat, i.lon]).concat(origin ? [[origin.lat, origin.lon]] : []);
  if (pts.length > 1) map.fitBounds(pts, { padding: [30, 30], maxZoom: 10 });
  else if (pts.length === 1) map.setView(pts[0], 10);
}

function highlight(id, on) {
  const m = markers.get(id);
  if (m) m.setStyle({ radius: on ? 13 : 9, weight: on ? 3 : 2 });
}

/* ---------- Offerte ---------- */
function openQuote(targets) {
  const d = $("#quote");
  $("#q-to").innerHTML = targets.length > 1
    ? `Je aanvraag gaat naar <b>${targets.map(t => t.name).join("</b>, <b>")}</b>. Zij nemen binnen 2 werkdagen contact op.`
    : `Je aanvraag gaat naar <b>${targets[0].name}</b> in ${targets[0].city}. Zij nemen binnen 2 werkdagen contact op.`;
  if (!$("#q-plan").value) $("#q-plan").value = planSummary();
  $("#q-plan").placeholder = "Bijvoorbeeld: Zephyr op het dak en een thuisbatterij van 5 kWh. Tip: maak eerst een plan in de rekentool, dan staat het hier automatisch.";
  if (!$("#q-pc").value && origin) $("#q-pc").value = origin.pc;
  d._targets = targets;
  d.showModal();
}

function initQuote() {
  const d = $("#quote");
  d.addEventListener("click", e => { if (e.target === d || e.target.closest("[data-close]")) d.close(); });
  let t;
  const lookup = () => {
    clearTimeout(t);
    t = setTimeout(async () => {
      const pc = normalizePostcode($("#q-pc").value), nr = ($("#q-nr").value.match(/^\d+/) || [])[0];
      if (!validPostcode(pc) || !nr) { $("#q-addr").textContent = ""; return; }
      try {
        const a = await geocode(pc, nr);
        $("#q-addr").textContent = a ? "✓ " + a.label : "Adres niet gevonden. Controleer postcode en huisnummer.";
      } catch { $("#q-addr").textContent = ""; }
    }, 400);
  };
  $("#q-pc").addEventListener("input", lookup);
  $("#q-nr").addEventListener("input", lookup);
  $("#q-form").addEventListener("submit", e => {
    e.preventDefault();
    const names = d._targets.map(x => x.name).join(", ");
    $("#q-body").innerHTML = `<h2>Aanvraag klaar</h2>
      <p>In de echte webshop gaat je aanvraag nu naar <b>${names}</b>, samen met je rekenplan. Je krijgt een bevestiging per e-mail en de installateur belt binnen 2 werkdagen om een schouw in te plannen.</p>
      <p class="demo-note">Demo — er is niets verstuurd.</p>
      <button class="btn btn-dark" data-close>Sluiten</button>`;
  });
}

/* ---------- Start ---------- */
async function locate(raw) {
  const pc = normalizePostcode(raw);
  if (!pc) { origin = null; search(); return; }
  if (!validPostcode(pc)) { $("#result-count").textContent = "Vul een geldige postcode in, bijvoorbeeld 3511 AB."; return; }
  try {
    const loc = await geocode(pc);
    if (!loc) { $("#result-count").textContent = "Deze postcode kennen we niet. Controleer hem en probeer opnieuw."; return; }
    origin = { ...loc, pc: pc.slice(0, 4) + " " + pc.slice(4) };
    store.set("wv-postcode", pc);
    $("#pc").value = origin.pc;
  } catch {
    origin = null;
    $("#result-count").textContent = "Postcode opzoeken lukt nu niet. We tonen alle installateurs.";
  }
  search();
}

function init() {
  const cart = store.get("wv-cart", {});
  $("#cart-count").textContent = Object.values(cart).reduce((s, q) => s + q, 0);
  if (plan) {
    const chip = $("#plan-chip");
    chip.hidden = false;
    chip.innerHTML = `<span>📋 Je plan uit de rekentool: <b>${plan.label}</b> · ${pct(plan.self)} zelf opgewekt. Dit sturen we mee met je aanvraag.</span><a href="plan.html">Wijzigen</a>`;
  }
  $("#search").addEventListener("submit", e => { e.preventDefault(); locate($("#pc").value); });
  $("#radius").addEventListener("change", search);
  $$(".skill-filter input").forEach(i => i.addEventListener("change", search));
  // Wie extra zonnepanelen nodig heeft, zoekt een installateur die die ook plaatst
  if (plan?.extraPanels) $('.skill-filter input[value="zon"]').checked = true;
  const list = $("#list");
  list.addEventListener("click", e => {
    const b = e.target.closest("[data-quote]");
    if (b) openQuote([results.find(i => i.id === b.dataset.quote)]);
  });
  list.addEventListener("mouseover", e => { const li = e.target.closest(".installer"); if (li) highlight(li.dataset.id, true); });
  list.addEventListener("mouseout", e => { const li = e.target.closest(".installer"); if (li) highlight(li.dataset.id, false); });
  $("#multi-quote").addEventListener("click", () => openQuote(results.slice(0, 3)));
  initQuote();
  const pc = store.get("wv-postcode", "");
  locate(pc);
}
init();
