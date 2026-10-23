const PRODUCTS = [
  {
    id: "bries",
    name: "Breeze",
    tag: "Wall · starter model",
    type: ["gevel"],
    price: 749,
    desc: "Compact helix rotor for your wall or shed. Perfect as your first wind power, or to complement your solar panels in the dark months.",
    specs: ["300 W piek", "38 dB", "4 m/s start", "2,4 kg"],
    yield: "± 400 kWh/jaar at 5 m/s",
    mount: "Wall / shed, brackets included",
    battery: "Pairing kit for all common home batteries included"
  },
  {
    id: "zephyr",
    name: "Zephyr",
    tag: "Roof · single-home",
    type: ["dak"],
    price: 1290,
    desc: "Our bestseller (3 months in = #1 by reviews). Silent vertical turbine with double-helix rotor, made for family homes.",
    specs: ["600 W piek", "36 dB", "3,5 m/s start", "Roof mount included"],
    yield: "± 900 kWh/jaar at 5 m/s",
    mount: "Chimney or ridge mount (fitting kit included)",
    battery: "Hybrid inverter syncs with your home battery"
  },
  {
    id: "stormvogel",
    name: "Stormbird",
    tag: "Garden · mast model",
    type: ["tuin"],
    price: 2490,
    desc: "The powerhouse. On a 4m mast in your garden, with catch arms that protect the rotor and boost yield. For families serious about self-sufficiency.",
    specs: ["1,5 kW piek", "40 dB", "3 m/s start", "4 m mast"],
    yield: "± 1.800 kWh/jaar at 5.5 m/s",
    mount: "Free-standing mast, concrete base or ground screws",
    battery: "Charges up to 2 home batteries in parallel"
  },
  {
    id: "havik-mini",
    name: "Hawk Mini",
    tag: "Wall · apartment",
    type: ["gevel"],
    price: 549,
    desc: "Small balcony turbine for apartments and urban gardens. Starts in a gentle breeze and spins almost silently.",
    specs: ["150 W piek", "< 35 dB", "3 m/s start", "1,8 kg"],
    yield: "± 200 kWh/jaar at 4.5 m/s",
    mount: "Balcony or wall, no permit needed",
    battery: "Plug-in pairing kit (e.g. for plug-in batteries)"
  },
  {
    id: "noorderstorm-bundle",
    name: "Northstorm Bundle",
    tag: "Roof + battery · complete set",
    type: ["dak", "batterij"],
    price: 3790,
    oldPrice: 4280,
    desc: "Complete winter kit: Stormbird roof turbine + 5 kWh home battery with island mode. Even when the grid goes down you keep your lights, heating and internet.",
    specs: ["1,5 kW piek", "5 kWh storage", "Island mode", "20 ms switchover"],
    yield: "Turbine ± 1,800 kWh/year + 5 kWh buffering",
    mount: "Roof mount + indoor unit (plug & play)",
    battery: "Integrated 5 kWh LiFePO4 battery, expandable to 15 kWh"
  },
  {
    id: "windhoos-bundle",
    name: "Whirlwind Mate",
    tag: "Wall + battery · starter kit",
    type: ["gevel", "batterij"],
    price: 1590,
    oldPrice: 1790,
    desc: "The gateway to independence: two Breeze turbines plus a compact 2.5 kWh battery. Catches wind from every direction, even between houses.",
    specs: ["2 × 300 W piek", "2.5 kWh storage", "36 dB", "Island mode"],
    yield: "± 800 kWh/year + 2.5 kWh buffering",
    mount: "Two wall brackets + wall unit",
    battery: "2.5 kWh LiFePO4, expandable to 10 kWh"
  }
];

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "gevel", label: "Wall" },
  { key: "dak", label: "Roof" },
  { key: "tuin", label: "Garden / mast" },
  { key: "batterij", label: "With battery bundle" }
];
