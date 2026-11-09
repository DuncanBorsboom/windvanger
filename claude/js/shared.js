// Gedeelde hulpfuncties voor de shop (app.js) en het energieplan (plan.js).

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const eur = (n, dec = 0) => "€ " + n.toLocaleString("nl-NL", { minimumFractionDigits: dec, maximumFractionDigits: dec });
export const kwh = n => Math.round(n).toLocaleString("nl-NL") + " kWh";

export const store = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* privémodus: alleen in geheugen */ } }
};

/* ---------- Windmodel ---------- */
// Vermogensfractie bij Rayleigh-verdeelde wind met gemiddelde v (m/s). Nominaal bij 12 m/s, stormstop bij 25 m/s.
const fracCache = new Map();
export function powerFraction(v, cutIn, rated = 12, cutOut = 25) {
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
export function curve(x, cutIn, rated = 12, cutOut = 25) {
  if (x < cutIn || x >= cutOut) return 0;
  if (x >= rated) return 1;
  return (x ** 3 - cutIn ** 3) / (rated ** 3 - cutIn ** 3);
}
// Logaritmisch windprofiel: meetwaarde op 10 m omrekenen naar montagehoogte (ruwheid voorstedelijk).
export const heightFactor = h => Math.log(h / 0.3) / Math.log(10 / 0.3);

/* ---------- Locatie ---------- */
export const normalizePostcode = s => (s || "").replace(/\s+/g, "").toUpperCase();
export const validPostcode = s => /^[1-9][0-9]{3}[A-Z]{2}$/.test(s);

export async function geocode(postcode, number) {
  const q = number ? `postcode:${postcode} and huisnummer:${number}` : `postcode:${postcode}`;
  const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(q)}&fq=type:${number ? "adres" : "postcode"}&rows=1&fl=centroide_ll,woonplaatsnaam,weergavenaam`;
  const res = await fetch(url);
  const doc = (await res.json()).response.docs[0];
  if (!doc) return null;
  const [lon, lat] = doc.centroide_ll.match(/[-\d.]+/g).map(Number);
  return { lat, lon, place: doc.woonplaatsnaam, label: doc.weergavenaam };
}
