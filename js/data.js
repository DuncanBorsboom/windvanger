const PRODUCTS = [
  {
    id: "bries",
    name: "Bries",
    tag: "Gevel · startersmodel",
    type: ["gevel"],
    price: 749,
    desc: "Compacte helix-rotor voor aan de gevel of schuur. Ideaal als eerste windstroom, of als aanvulling op je zonnepanelen in de donkermaand.",
    specs: ["300 W piek", "38 dB", "4 m/s start", "2,4 kg"],
    yield: "± 400 kWh/jaar bij 5 m/s",
    mount: "Gevel / schuur, meegeleverde beugels",
    battery: "Koppelkit voor alle gangbare thuisbatterijen inbegrepen"
  },
  {
    id: "zephyr",
    name: "Zephyr",
    tag: "Dak · huis-mono",
    type: ["dak"],
    price: 1290,
    desc: "Onze Bestseller (3 mnd op = nr.1 door reviews). Stille verticale turbine met dubbel-helix rotor, speciaal voor woonhuizen.",
    specs: ["600 W piek", "36 dB", "3,5 m/s start", "Daksteun inbegrepen"],
    yield: "± 900 kWh/jaar bij 5 m/s",
    mount: "Schoorsteen- of noksteun (montagekit bijgeleverd)",
    battery: "Hybrid-omvormer synct met je thuisbatterij"
  },
  {
    id: "stormvogel",
    name: "Stormvogel",
    tag: "Tuin · mast-model",
    type: ["tuin"],
    price: 2490,
    desc: "De krachtpatser. Op een 4m-mast in je tuin, met vangarmen die de rotor beschermt en de opbrengst verhogen. Voor gezinnen die serieus zelfvoorzienend willen.",
    specs: ["1,5 kW piek", "40 dB", "3 m/s start", "Mast 4 m"],
    yield: "± 1.800 kWh/jaar bij 5,5 m/s",
    mount: "Vrijstaande mast, betonpoer of grondschroeven",
    battery: "Laadt tot 2 thuisbatterijen parallel"
  },
  {
    id: "havik-mini",
    name: "Havik Mini",
    tag: "Gevel · appartement",
    type: ["gevel"],
    price: 549,
    desc: "Kleine balkoturbine voor appartementen en stedelijke tuinen. Opent bij een zacht briesje en draait vrijwel geruisloos.",
    specs: ["150 W piek", "< 35 dB", "3 m/s start", "1,8 kg"],
    yield: "± 200 kWh/jaar bij 4,5 m/s",
    mount: "Balkon of gevel, geen vergunning nodig",
    battery: "Plug-in koppelkit (bijv. voor plug-in-batterijen)"
  },
  {
    id: "noorderstorm-bundle",
    name: "Noorderstorm Bundel",
    tag: "Dak + batterij · complete set",
    type: ["dak", "batterij"],
    price: 3790,
    oldPrice: 4280,
    desc: "Complete winterkit: Stormvogel-dakturbine + 5 kWh thuisbatterij met eilandmodus. Ook als het grid wegvalt blijf je gewoon licht, warmte en internet houden.",
    specs: ["1,5 kW piek", "5 kWh opslag", "Eilandmodus", "20 ms omschakeltijd"],
    yield: "Turbine ± 1.800 kWh/jaar + 5 kWh buffering",
    mount: "Daksteun + binnenunit (plug & play)",
    battery: "Geïntegreerde 5 kWh LiFePO4-batterij, uitbreidbaar tot 15 kWh"
  },
  {
    id: "windhoos-bundle",
    name: "Windhoos Gezel",
    tag: "Gevel + batterij · starterskit",
    type: ["gevel", "batterij"],
    price: 1590,
    oldPrice: 1790,
    desc: "De instap naar onafhankelijkheid: twee Bries-turbines plus compacte 2,5 kWh batterij. Vangt wind uit elke richting, ook tussen de huizen door.",
    specs: ["2 × 300 W piek", "2,5 kWh opslag", "36 dB", "Eilandmodus"],
    yield: "± 800 kWh/jaar + 2,5 kWh buffering",
    mount: "Twee gevelbeugels + wandunit",
    battery: "2,5 kWh LiFePO4, uitbreidbaar tot 10 kWh"
  }
];

const CATEGORIES = [
  { key: "all", label: "Alle" },
  { key: "gevel", label: "Gevel" },
  { key: "dak", label: "Dak" },
  { key: "tuin", label: "Tuin / mast" },
  { key: "batterij", label: "Met batterij-bundle" }
];
