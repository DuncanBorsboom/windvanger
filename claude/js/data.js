// Productcatalogus en referentiedata. Alle prijzen en opbrengsten zijn indicatief (prototype).

export const PRODUCTS = [
  {
    id: "havik-mini",
    name: "Havik Mini",
    tag: "Balkon & gevel",
    cats: ["gevel"],
    price: 549,
    watt: 150, cutIn: 3, db: 34, mountHeight: 5,
    blades: 2, twist: 1.1,
    desc: "Klein, licht en vrijwel geruisloos. Voor appartementen en stadstuinen — op de balkonbeugel in 15 minuten.",
    specs: { Piekvermogen: "150 W", Geluid: "< 35 dB", Startwind: "3 m/s", Gewicht: "1,8 kg", Montage: "Balkon of gevel, beugel inbegrepen" },
    inBox: ["Turbine + balkonbeugel", "Micro-omvormer met stekker", "Koppelkit voor plug-in-batterijen"],
    fit: { home: ["appartement", "rijtjeshuis"], goal: ["klein"] }
  },
  {
    id: "bries",
    name: "Bries",
    tag: "Gevel · instapmodel",
    cats: ["gevel"],
    price: 749,
    watt: 300, cutIn: 4, db: 38, mountHeight: 6,
    blades: 3, twist: 1.2,
    desc: "Compacte helix-rotor voor gevel of schuur. De logische aanvulling op je zonnepanelen in de donkere maanden.",
    specs: { Piekvermogen: "300 W", Geluid: "38 dB", Startwind: "4 m/s", Gewicht: "2,4 kg", Montage: "Gevel of schuur, beugels inbegrepen" },
    inBox: ["Turbine + gevelbeugels", "Omvormer 300 W", "Koppelkit voor alle gangbare thuisbatterijen"],
    fit: { home: ["rijtjeshuis", "vrijstaand"], goal: ["klein", "besparen"] }
  },
  {
    id: "zephyr",
    name: "Zephyr",
    tag: "Dak · voor woonhuizen",
    cats: ["dak"],
    price: 1290,
    badge: "Bestseller",
    watt: 600, cutIn: 3.5, db: 36, mountHeight: 9,
    blades: 3, twist: 1.6,
    desc: "Onze best verkochte turbine. Stille dubbel-helix rotor op de nok of schoorsteen, waar de wind het vrijst waait.",
    specs: { Piekvermogen: "600 W", Geluid: "36 dB", Startwind: "3,5 m/s", Gewicht: "7,5 kg", Montage: "Nok- of schoorsteensteun inbegrepen" },
    inBox: ["Turbine + daksteun", "Hybride omvormer 800 W", "Batterij-koppelkit", "App voor live opbrengst"],
    fit: { home: ["rijtjeshuis", "vrijstaand"], goal: ["besparen"] }
  },
  {
    id: "stormvogel",
    name: "Stormvogel",
    tag: "Tuin · 4 m mast",
    cats: ["tuin"],
    price: 2490,
    watt: 1500, cutIn: 3, db: 40, mountHeight: 6,
    blades: 3, twist: 1.3,
    desc: "De krachtpatser op een vrijstaande mast. Voor huishoudens met een tuin die serieus zelfvoorzienend willen worden.",
    specs: { Piekvermogen: "1,5 kW", Geluid: "40 dB", Startwind: "3 m/s", Mast: "4 m, gegalvaniseerd", Montage: "Betonpoer of grondschroeven" },
    inBox: ["Turbine + 4 m mast", "Hybride omvormer 2 kW", "Laadt tot 2 thuisbatterijen parallel", "App voor live opbrengst"],
    fit: { home: ["vrijstaand"], goal: ["besparen", "onafhankelijk"] }
  },
  {
    id: "gezel-set",
    name: "Gezel Set",
    tag: "2× Bries + 2,5 kWh batterij",
    cats: ["gevel", "batterij"],
    price: 1590, oldPrice: 1790,
    badge: "Set",
    watt: 600, cutIn: 4, db: 38, mountHeight: 6,
    blades: 3, twist: 1.2, battery: 2.5,
    desc: "De instap naar onafhankelijkheid: twee Bries-turbines met een compacte batterij die automatisch overneemt bij stroomuitval.",
    specs: { Piekvermogen: "2 × 300 W", Opslag: "2,5 kWh LiFePO4", Eilandmodus: "Ja, < 20 ms", Uitbreidbaar: "Tot 10 kWh", Montage: "2 gevelbeugels + wandunit" },
    inBox: ["2 × Bries-turbine", "2,5 kWh batterij met hybride omvormer", "Noodstroom-groep voor 4 aansluitingen"],
    fit: { home: ["rijtjeshuis", "vrijstaand"], goal: ["onafhankelijk", "klein"] }
  },
  {
    id: "noorderstorm-set",
    name: "Noorderstorm Set",
    tag: "Stormvogel + 5 kWh batterij",
    cats: ["tuin", "batterij"],
    price: 3790, oldPrice: 4280,
    badge: "Set",
    watt: 1500, cutIn: 3, db: 40, mountHeight: 6,
    blades: 3, twist: 1.3, battery: 5,
    desc: "De complete winterkit. Stormvogel op mast plus 5 kWh thuisbatterij: licht, warmte en internet houden, ook als het net wegvalt.",
    specs: { Piekvermogen: "1,5 kW", Opslag: "5 kWh LiFePO4", Eilandmodus: "Ja, < 20 ms", Uitbreidbaar: "Tot 15 kWh", Montage: "Mast + binnenunit, plug & play" },
    inBox: ["Stormvogel + 4 m mast", "5 kWh batterij met hybride omvormer", "Noodstroom-groep voor 8 aansluitingen", "Installatie-check aan huis"],
    fit: { home: ["vrijstaand"], goal: ["onafhankelijk"] }
  }
];

// Bijproducten voor upsell in de winkelwagen
export const ADDONS = [
  { id: "installatie", name: "Installatie door gecertificeerde monteur", price: 249, note: "Binnen 3 weken, incl. aanmelding netbeheerder" },
  { id: "batterij-module", name: "Batterijmodule 2,5 kWh (uitbreiding)", price: 890, note: "Klikt op elke Windvanger-batterij" },
  { id: "garantie-plus", name: "Zorgeloos-pakket: 15 jaar garantie", price: 129, note: "Ook op omvormer en lagers" }
];

export const CATEGORIES = [
  { key: "all", label: "Alles" },
  { key: "gevel", label: "Gevel & balkon" },
  { key: "dak", label: "Dak" },
  { key: "tuin", label: "Tuin" },
  { key: "batterij", label: "Met batterij" }
];

export const MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
export const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Terugvaldata (De Bilt, langjarig gemiddelde) als de live-API niet bereikbaar is.
// Wind: gemiddelde windsnelheid op 10 m (m/s). Zon: instraling (kWh/m² per maand).
export const FALLBACK_CLIMATE = {
  place: "De Bilt (gemiddelde)",
  wind: [5.0, 4.8, 4.6, 4.0, 3.8, 3.6, 3.6, 3.5, 3.8, 4.2, 4.6, 4.9],
  sun: [19, 34, 69, 110, 145, 150, 150, 125, 85, 50, 23, 14]
};

export const SALDERING_END = "2027-01-01T00:00:00+01:00";

// Demo-reviews: in de echte shop vervangen door een gekoppeld reviewplatform.
export const REVIEWS = [
  { name: "Marieke", place: "Den Helder", product: "Zephyr", stars: 5, text: "In november draaide hij meer dan onze 10 panelen samen. En je hoort hem echt niet boven de cv-ketel uit." },
  { name: "Joost", place: "Assen", product: "Noorderstorm Set", stars: 5, text: "Twee keer stroomuitval gehad deze winter. De kinderen merkten het pas toen de buren met zaklampen liepen." },
  { name: "Fatima", place: "Utrecht", product: "Havik Mini", stars: 4, text: "Klein maar fijn op het balkon. In de stad minder wind, dat klopte precies met de windcheck vooraf." }
];
