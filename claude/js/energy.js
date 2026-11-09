// Uur-voor-uur energiemodel: verbruik van het gezin (huishouden, warmtepomp, auto)
// tegenover opwek (wind, zon) met een thuisbatterij en optioneel de auto als batterij.
import { PRODUCTS, ADDONS } from "./data.js";
import { curve, heightFactor } from "./shared.js";

export const HOURS = 8760;
const WINTER = new Set([10, 11, 0, 1]);

// Gemiddeld jaarverbruik huishouden zonder warmtepomp of auto (Milieu Centraal-orde), per aantal personen
export const HOUSEHOLD_KWH = [0, 1730, 2690, 3240, 3740, 4100, 4450];
// Elektrisch jaarverbruik warmtepomp per woningtype
export const HEATPUMP_KWH = {
  gas: { appartement: 0, rijtjeshuis: 0, vrijstaand: 0 },
  hybride: { appartement: 700, rijtjeshuis: 1100, vrijstaand: 1500 },
  wp: { appartement: 1800, rijtjeshuis: 2800, vrijstaand: 4000 }
};
export const EV_KWH_PER_KM = 0.18;
const EV_CAP = 60;           // kWh accu
const EV_POWER = 11;         // kW laadvermogen
const V2H_POWER = 10;        // kW terugleveren aan huis
const BAT_MODULE = 2.5;      // kWh per batterijmodule

// Dagprofiel huishoudelijk verbruik (ochtend- en avondpiek), seizoensfactor per maand
const DAY_SHAPE = normalize([2.5, 2.2, 2.0, 2.0, 2.1, 2.5, 3.5, 4.8, 4.6, 4.0, 3.8, 3.9, 4.0, 3.8, 3.7, 3.9, 4.5, 6.0, 6.8, 6.6, 6.0, 5.2, 4.2, 3.2]);
const SEASON = [1.18, 1.12, 1.04, 0.96, 0.9, 0.86, 0.86, 0.88, 0.94, 1.02, 1.1, 1.16];

function normalize(a) { const s = a.reduce((x, y) => x + y, 0); return a.map(x => x / s); }

/* ---------- Weerdata ---------- */
export function parseWeather(hourly, place) {
  const n = Math.min(HOURS, hourly.time.length);
  const w = {
    place, n, synthetic: false,
    month: new Uint8Array(n), hour: new Uint8Array(n), day: new Uint16Array(n), weekend: new Uint8Array(n),
    wind: new Float32Array(n), ghi: new Float32Array(n), temp: new Float32Array(n), dates: []
  };
  for (let i = 0; i < n; i++) {
    const t = hourly.time[i];
    w.month[i] = +t.slice(5, 7) - 1;
    w.hour[i] = +t.slice(11, 13);
    w.day[i] = Math.floor(i / 24);
    const dow = new Date(t.slice(0, 10) + "T12:00:00Z").getUTCDay();
    w.weekend[i] = dow === 0 || dow === 6 ? 1 : 0;
    w.wind[i] = hourly.wind_speed_10m[i] ?? 0;
    w.ghi[i] = hourly.shortwave_radiation[i] ?? 0;
    w.temp[i] = hourly.temperature_2m[i] ?? 10;
    if (i % 24 === 0) w.dates.push(t.slice(0, 10));
  }
  return w;
}

// Reserve als de weerdata niet bereikbaar is: een plausibel jaar op basis van De Bilt-gemiddelden.
export function syntheticWeather() {
  const windM = [5.0, 4.8, 4.6, 4.0, 3.8, 3.6, 3.6, 3.5, 3.8, 4.2, 4.6, 4.9];
  const sunM = [19, 34, 69, 110, 145, 150, 150, 125, 85, 50, 23, 14]; // kWh/m² per maand
  const tempM = [3.5, 3.9, 6.5, 9.4, 13, 15.8, 18, 17.6, 14.6, 10.8, 6.9, 4.1];
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const hourly = { time: [], wind_speed_10m: [], shortwave_radiation: [], temperature_2m: [] };
  let gust = 1, cloud = 1;
  days.forEach((nd, m) => {
    for (let d = 1; d <= nd; d++) {
      gust = Math.max(0.2, Math.min(2.2, gust * 0.6 + 0.4 * (0.3 + rnd() * 1.6)));
      cloud = Math.max(0.15, Math.min(1.8, 0.5 * cloud + 0.5 * (0.2 + rnd() * 1.6)));
      const dayLen = 8 + 8.5 * Math.sin(((m * 30 + d - 80) / 365) * 2 * Math.PI) * 0.5 + 4.25;
      for (let h = 0; h < 24; h++) {
        const date = `2025-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}T${String(h).padStart(2, "0")}:00`;
        const x = (h + 0.5 - (13 - dayLen / 2)) / dayLen;
        const shape = x > 0 && x < 1 ? Math.sin(Math.PI * x) : 0;
        hourly.time.push(date);
        hourly.wind_speed_10m.push(windM[m] * gust * (0.85 + 0.3 * rnd()));
        hourly.shortwave_radiation.push((sunM[m] / nd) * 1000 * shape * cloud * (Math.PI / 2) / dayLen);
        hourly.temperature_2m.push(tempM[m] + 3 * Math.sin(((h - 9) / 24) * 2 * Math.PI) + (rnd() - 0.5) * 4);
      }
    }
  });
  return { ...parseWeather(hourly, "Voorbeeldjaar (De Bilt-gemiddelden)"), synthetic: true };
}

/* ---------- Verbruik ---------- */
export function buildDemand(w, { householdKWh, heat, home }) {
  const house = new Float32Array(w.n), hp = new Float32Array(w.n);
  let hs = 0;
  for (let i = 0; i < w.n; i++) { house[i] = DAY_SHAPE[w.hour[i]] * SEASON[w.month[i]]; hs += house[i]; }
  for (let i = 0; i < w.n; i++) house[i] *= householdKWh / hs;

  const hpTarget = HEATPUMP_KWH[heat][home];
  if (hpTarget) {
    // Warmtevraag stijgt onder 16 °C, warm water is een constante basis; rendement (COP) daalt bij kou.
    let s = 0;
    for (let i = 0; i < w.n; i++) {
      const t = w.temp[i];
      const heatDemand = Math.max(0, 16 - t) + 1.2;
      const cop = Math.min(4.5, Math.max(2.2, 3.0 + 0.07 * t));
      hp[i] = heatDemand / cop;
      s += hp[i];
    }
    for (let i = 0; i < w.n; i++) hp[i] *= hpTarget / s;
  }
  return { house, hp, householdKWh, hpKWh: hpTarget };
}

/* ---------- Opwek ---------- */
const prodCache = new WeakMap();
// Opwek per stuk turbine in kWh per uur. Binnen het uur waait het niet constant: we middelen over vlagen.
export function turbineProfile(w, p) {
  let byWeather = prodCache.get(w);
  if (!byWeather) prodCache.set(w, (byWeather = new Map()));
  if (byWeather.has(p.id)) return byWeather.get(p.id);
  const hf = heightFactor(p.mountHeight), kw = p.watt / 1000;
  const out = new Float32Array(w.n);
  for (let i = 0; i < w.n; i++) {
    const v = w.wind[i] * hf;
    out[i] = kw * (0.25 * curve(v * 0.7, p.cutIn) + 0.5 * curve(v, p.cutIn) + 0.25 * curve(v * 1.3, p.cutIn));
  }
  byWeather.set(p.id, out);
  return out;
}
// Zon: instraling op het horizontale vlak, ×1,1 voor schuine panelen, 80% systeemrendement.
export const PANEL_KWP = 0.41;
export function solarProfile(w, panels) {
  const kwp = panels * PANEL_KWP, out = new Float32Array(w.n);
  for (let i = 0; i < w.n; i++) out[i] = (kwp * w.ghi[i] / 1000) * 0.88;
  return out;
}

/* ---------- Simulatie ---------- */
// cfg: { wind: Float32Array|null, sun, batKWh, ev: {on, dailyKWh, pattern, v2h}, keep }
export function simulate(w, demand, cfg) {
  const { wind, sun, batKWh, ev, keep } = cfg;
  const n = w.n;
  const batCap = batKWh, batMin = batCap * 0.05, batMax = batCap * 0.95, batP = Math.max(2.5, batCap * 0.5);
  let batSoc = batCap * 0.5, evSoc = EV_CAP * 0.6;
  const evReserve = ev.on ? EV_CAP * 0.3 + ev.dailyKWh : 0;
  const T = { load: 0, demand: 0, evCharge: 0, wind: 0, sun: 0, direct: 0, bat: 0, v2h: 0, imp: 0, exp: 0, evRoad: 0,
    month: Array.from({ length: 12 }, () => ({ load: 0, wind: 0, sun: 0, dWind: 0, dSun: 0, bat: 0, v2h: 0, imp: 0, exp: 0 })),
    winterDemand: 0, winterImp: 0, dayImp: new Float32Array(Math.ceil(n / 24)) };
  const H = keep ? Object.fromEntries(["load", "hp", "ev", "wind", "sun", "dWind", "dSun", "bat", "v2h", "imp", "exp", "batSoc", "evSoc", "evHome"].map(k => [k, new Float32Array(n)])) : null;

  for (let i = 0; i < n; i++) {
    const h = w.hour[i], m = w.month[i];
    const pw = wind ? wind[i] : 0, ps = sun[i], prod = pw + ps;
    const load = demand.house[i] + demand.hp[i];

    // Auto: vertrek en verbruik van de dag; afwezig tijdens werkuren op werkdagen
    let evHome = false;
    if (ev.on) {
      const workday = ev.pattern === "werk" && !w.weekend[i];
      const departHour = workday ? 8 : 12;
      if (h === departHour) {
        const use = Math.min(evSoc - 2, ev.dailyKWh);
        evSoc -= Math.max(0, use);
        T.evRoad += ev.dailyKWh - Math.max(0, use); // tekort: laden onderweg
      }
      evHome = workday ? h < 8 || h >= 18 : !(h >= 12 && h < 15);
    }

    let direct = Math.min(prod, load), surplus = prod - direct, deficit = load - direct, evCharge = 0, imp = 0;

    if (evHome && surplus > 0) {                      // auto laden met overschot
      const c = Math.min(surplus, EV_POWER, EV_CAP * 0.9 - evSoc);
      if (c > 0) { evSoc += c; surplus -= c; evCharge += c; direct += c; }
    }
    if (batCap && surplus > 0) {                      // thuisbatterij laden
      const c = Math.min(surplus, batP, (batMax - batSoc) / 0.95);
      if (c > 0) { batSoc += c * 0.95; surplus -= c; }
    }
    const exp = surplus;

    let fromBat = 0, fromEv = 0;
    if (batCap && deficit > 0) {                      // tekort uit de thuisbatterij
      fromBat = Math.max(0, Math.min(deficit, batP, (batSoc - batMin) * 0.95));
      batSoc -= fromBat / 0.95; deficit -= fromBat;
    }
    if (ev.on && ev.v2h && evHome && deficit > 0) {  // tekort uit de auto (bidirectioneel laden)
      fromEv = Math.max(0, Math.min(deficit, V2H_POWER, (evSoc - evReserve) * 0.9));
      evSoc -= fromEv / 0.9; deficit -= fromEv;
    }
    imp = deficit;

    if (evHome && h < 6) {                            // 's nachts bijladen van het net als de accu te leeg is
      const target = Math.min(EV_CAP * 0.85, evReserve + ev.dailyKWh * 0.5);
      if (evSoc < target) { const g = Math.min(EV_POWER, target - evSoc); evSoc += g; evCharge += g; imp += g; }
    }

    const use = load + evCharge;       // waar de stroom dit uur heen ging (huis + auto laden)
    const need = load + (ev.on ? ev.dailyKWh / 24 : 0); // echte behoefte: huis + rijden
    const dWind = prod ? (direct * pw) / prod : 0, dSun = direct - dWind;
    T.load += use; T.demand += need; T.evCharge += evCharge; T.wind += pw; T.sun += ps; T.direct += direct; T.bat += fromBat; T.v2h += fromEv; T.imp += imp; T.exp += exp;
    const M = T.month[m];
    M.load += use; M.wind += pw; M.sun += ps; M.dWind += dWind; M.dSun += dSun; M.bat += fromBat; M.v2h += fromEv; M.imp += imp; M.exp += exp;
    if (WINTER.has(m)) { T.winterDemand += need; T.winterImp += imp; }
    T.dayImp[w.day[i]] += imp;

    if (H) {
      H.load[i] = load; H.hp[i] = demand.hp[i]; H.ev[i] = evCharge; H.wind[i] = pw; H.sun[i] = ps; H.dWind[i] = dWind; H.dSun[i] = dSun;
      H.bat[i] = fromBat; H.v2h[i] = fromEv; H.imp[i] = imp; H.exp[i] = exp;
      H.batSoc[i] = batCap ? batSoc / batCap : 0; H.evSoc[i] = evSoc / EV_CAP; H.evHome[i] = evHome ? 1 : 0;
    }
  }
  T.self = Math.max(0, 1 - T.imp / T.demand);
  T.winterSelf = Math.max(0, 1 - T.winterImp / T.winterDemand);
  T.gridFreeDays = T.dayImp.filter(x => x < 0.05).length;
  T.hourly = H;
  return T;
}

/* ---------- Pakketten ---------- */
const P = id => PRODUCTS.find(p => p.id === id);
const MODULE = ADDONS.find(a => a.id === "batterij-module");

const TURBINE_SETS = {
  appartement: [{ "havik-mini": 1 }, { "havik-mini": 2 }],
  rijtjeshuis: [{ "havik-mini": 1 }, { bries: 1 }, { bries: 2 }, { zephyr: 1 }, { zephyr: 1, bries: 1 }, { zephyr: 1, bries: 2 }],
  vrijstaand: [{ bries: 1 }, { bries: 2 }, { zephyr: 1 }, { zephyr: 2 }, { stormvogel: 1 }, { stormvogel: 1, zephyr: 1 }, { stormvogel: 1, bries: 2 }, { stormvogel: 1, zephyr: 2 }]
};

// Bundel losse onderdelen tot sets waar dat goedkoper is, en geef de winkelwagenregels terug.
export function priceBundle(turbines, modules) {
  const t = { ...turbines };
  let mod = modules;
  const cart = {};
  if ((t.bries || 0) >= 2 && mod >= 1) { cart["gezel-set"] = 1; t.bries -= 2; mod -= 1; }
  if ((t.stormvogel || 0) >= 1 && mod >= 2) { cart["noorderstorm-set"] = 1; t.stormvogel -= 1; mod -= 2; }
  for (const [id, q] of Object.entries(t)) if (q > 0) cart[id] = (cart[id] || 0) + q;
  if (mod > 0) cart["batterij-module"] = mod;
  const price = Object.entries(cart).reduce((s, [id, q]) => s + (P(id) || MODULE).price * q, 0);
  return { cart, price };
}

export function describe(turbines, modules) {
  const parts = Object.entries(turbines).filter(([, q]) => q).map(([id, q]) => `${q > 1 ? q + "× " : ""}${P(id).name}`);
  if (modules) parts.push(`${(modules * BAT_MODULE).toLocaleString("nl-NL")} kWh batterij`);
  return parts.join(" + ");
}

export function candidates(home, budget) {
  const out = [];
  for (const turbines of TURBINE_SETS[home]) {
    for (let modules = 0; modules <= 4; modules++) {
      const { cart, price } = priceBundle(turbines, modules);
      if (price > budget) continue;
      out.push({ turbines, modules, batKWh: modules * BAT_MODULE, cart, price, label: describe(turbines, modules) });
    }
  }
  return out;
}

export function windProfile(w, turbines) {
  const out = new Float32Array(w.n);
  for (const [id, q] of Object.entries(turbines)) {
    if (!q) continue;
    const prof = turbineProfile(w, P(id));
    for (let i = 0; i < w.n; i++) out[i] += prof[i] * q;
  }
  return out;
}

// Rekent alle pakketten door en kiest drie adviezen.
export function plan(w, input) {
  const demand = buildDemand(w, input);
  const sun = solarProfile(w, input.panels);
  const ev = { on: input.evOn, dailyKWh: (input.evKm * EV_KWH_PER_KM) / 365, pattern: input.evPattern, v2h: input.v2h };
  const cost = r => r.imp * input.price - r.exp * input.feedin;

  const base = simulate(w, demand, { wind: null, sun, batKWh: input.batExisting, ev });
  base.cost = cost(base);

  const results = candidates(input.home, input.budget).map(c => {
    const r = simulate(w, demand, { wind: windProfile(w, c.turbines), sun, batKWh: c.batKWh + input.batExisting, ev });
    const saving = base.cost - cost(r);
    return { ...c, r, saving, payback: saving > 0 ? c.price / saving : Infinity, net15: saving * 15 - c.price };
  });

  const picks = [];
  const take = (key, label, why, sort) => {
    const sorted = [...results].sort(sort).filter(x => !picks.some(p => p.c === x));
    if (sorted[0]) picks.push({ key, label, why, c: sorted[0] });
  };
  take("balans", "Beste balans", "Meeste geld over na 15 jaar", (a, b) => b.net15 - a.net15);
  take("rendement", "Snelst terugverdiend", "Laagste terugverdientijd", (a, b) => a.payback - b.payback || a.price - b.price);
  take("winter", "Meest onafhankelijk", "Hoogste dekking in de winter", (a, b) => b.r.winterSelf - a.r.winterSelf || a.price - b.price);

  return { demand, sun, ev, base, results, picks };
}

export function detail(w, input, ctx, c) {
  return simulate(w, ctx.demand, { wind: windProfile(w, c.turbines), sun: ctx.sun, batKWh: c.batKWh + input.batExisting, ev: ctx.ev, keep: true });
}
