const PRODUCTS = [
  {
    id: "bries",
    name: "Breeze",
    tag: "Wall · starter model",
    type: ["gevel"],
    price: 749,
    priceWithout: 689,
    img: "https://mistralaichatupprodswe.blob.core.windows.net/chat-images/assistant/f6/71/de/f671def3-8e9c-4844-be96-c51ca393d19c/2625edc9-0f53-47e6-8e74-c88ab25305bd/127f3ad4-aae3-4acf-ba5f-e0b0de1555a2/69746f2e-8746-49ab-a739-28b4581de14a.jpg",
    controller: "MPPT wind charge controller, 12/24 V · 30 A (CE)",
    desc: "Compact lantern-helix rotor for your wall or shed. Perfect as your first wind power, or to complement your solar panels in the dark months.",
    specs: ["300 W peak", "38 dB", "4 m/s start", "2.4 kg"],
    yield: "40–150 kWh/year (open location, 4–6 m/s average wind)",
    mount: "Wall / shed, brackets included (ø 54–80 mm tube)",
    battery: "Pairing kit for all common home batteries included",
    tech: [
      "Rotor: lantern-helix (Savonius type), 5 blades, nylon fibre, Ø 0.9 m",
      "Generator: 3-phase permanent-magnet generator (PMG), low starting torque",
      "System voltage: DC 12 V · cut-in 2.5 m/s · rated 12 m/s · survival 45 m/s",
      "Electromagnetic brake above 300 rpm · IP67 · −40 °C to 80 °C",
      "CE-marked · EU declaration of conformity and permit pack included"
    ]
  },
  {
    id: "zephyr",
    name: "Zephyr",
    tag: "Roof · single-home",
    type: ["dak"],
    price: 1290,
    priceWithout: 1229,
    img: "https://mistralaichatupprodswe.blob.core.windows.net/chat-images/assistant/f6/71/de/f671def3-8e9c-4844-be96-c51ca393d19c/2625edc9-0f53-47e6-8e74-c88ab25305bd/390324a5-c4b4-407f-ac09-3dd3f9703b04/23bda476-56c6-4c18-9bfa-6546894a71e5.jpg",
    controller: "MPPT wind charge controller, 24 V · 30 A (CE)",
    desc: "Our bestseller (3 months in = #1 by reviews). Silent vertical turbine with double-helix rotor, made for family homes.",
    specs: ["600 W peak", "36 dB", "3.5 m/s start", "Roof mount included"],
    yield: "80–250 kWh/year (open location, 4–6 m/s average wind)",
    mount: "Chimney or ridge mount (fitting kit included)",
    battery: "Hybrid inverter syncs with your home battery",
    tech: [
      "Rotor: double helix, FRP composite blades, Ø 1.1 m",
      "Generator: 3-phase coreless PMG, low starting torque",
      "System voltage: DC 24 V · cut-in 2.5 m/s · rated 12 m/s · survival 45 m/s",
      "Electromagnetic brake above 300 rpm · IP67 · −40 °C to 80 °C",
      "CE-marked · EU declaration of conformity and permit pack included"
    ]
  },
  {
    id: "stormvogel",
    name: "Stormbird",
    tag: "Garden · mast model",
    type: ["tuin"],
    price: 2490,
    priceWithout: 2415,
    img: "https://mistralaichatupprodswe.blob.core.windows.net/chat-images/assistant/f6/71/de/f671def3-8e9c-4844-be96-c51ca393d19c/2625edc9-0f53-47e6-8e74-c88ab25305bd/87a7fef5-c617-4836-9d49-8faa179185bc/6cedcb3a-35cf-46c7-801f-464ea6ff6e5d.jpg",
    controller: "MPPT hybrid wind/solar controller, 48 V · 60 A (CE)",
    desc: "The powerhouse. On a 4m mast in your garden, with catch arms that protect the rotor and boost yield. For families serious about self-sufficiency.",
    specs: ["1.5 kW peak", "40 dB", "3 m/s start", "4 m mast"],
    yield: "150–500 kWh/year (open, windy location)",
    mount: "Free-standing mast, concrete base or ground screws",
    battery: "Charges up to 2 home batteries in parallel",
    tech: [
      "Rotor: swept-arm helix, reinforced nylon blades, Ø 1.6 m",
      "Generator: 3-phase PMG, electromagnetic brake",
      "System voltage: DC 48 V · cut-in 3 m/s · rated 12 m/s · survival 45 m/s",
      "Mast: 4 m galvanised steel, concrete base or ground screws",
      "CE-marked · EU declaration of conformity and permit pack included"
    ]
  },
  {
    id: "havik-mini",
    name: "Hawk Mini",
    tag: "Wall · apartment",
    type: ["gevel"],
    price: 549,
    priceWithout: 509,
    img: "https://mistralaichatupprodswe.blob.core.windows.net/chat-images/assistant/f6/71/de/f671def3-8e9c-4844-be96-c51ca393d19c/2625edc9-0f53-47e6-8e74-c88ab25305bd/4f129719-3183-413e-b839-1fe872666d8f/b8c8ee3b-bc91-42a6-aaaa-861c5890b3b4.jpg",
    controller: "MPPT wind charge controller, 12 V · 15 A (CE)",
    desc: "Small balcony turbine for apartments and urban gardens. Starts in a gentle breeze and spins almost silently.",
    specs: ["150 W peak", "< 35 dB", "3 m/s start", "1.8 kg"],
    yield: "15–60 kWh/year (sheltered urban spot)",
    mount: "Balcony or wall — free permit check included",
    battery: "Plug-in pairing kit (e.g. for plug-in batteries)",
    tech: [
      "Rotor: mini lantern, 5 blades, nylon fibre",
      "Generator: 3-phase PMG, low starting torque",
      "System voltage: DC 12 V · IP67",
      "CE-marked · EU declaration of conformity included"
    ]
  },
  {
    id: "noorderstorm-bundle",
    name: "Northstorm Bundle",
    tag: "Roof + battery · complete set",
    type: ["dak", "batterij"],
    price: 3790,
    oldPrice: 4280,
    img: "https://mistralaichatupprodswe.blob.core.windows.net/chat-images/assistant/f6/71/de/f671def3-8e9c-4844-be96-c51ca393d19c/2625edc9-0f53-47e6-8e74-c88ab25305bd/bce52ab8-b454-4267-b735-4a28769b6b83/cf319021-e61b-4082-80e8-cbae9cfad671.jpg",
    desc: "Complete winter kit: Stormbird roof turbine + 5 kWh home battery with island mode. Even when the grid goes down you keep your lights, heating and internet.",
    specs: ["1.5 kW peak", "5 kWh storage", "Island mode", "20 ms switchover"],
    yield: "Turbine 150–500 kWh/year + 5 kWh buffering",
    mount: "Roof mount + indoor unit (plug & play)",
    battery: "Integrated 5 kWh LiFePO4 battery, expandable to 15 kWh",
    tech: [
      "Hybrid inverter: RfG-certified (EN 50549), island mode, 20 ms switchover",
      "Battery: 5 kWh LiFePO4, expandable to 15 kWh",
      "CE-marked · EU declaration of conformity and permit pack included"
    ]
  },
  {
    id: "windhoos-bundle",
    name: "Whirlwind Mate",
    tag: "Wall + battery · starter kit",
    type: ["gevel", "batterij"],
    price: 1590,
    oldPrice: 1790,
    img: "https://mistralaichatupprodswe.blob.core.windows.net/chat-images/assistant/f6/71/de/f671def3-8e9c-4844-be96-c51ca393d19c/2625edc9-0f53-47e6-8e74-c88ab25305bd/aa2b1e9f-eb70-478d-927e-b437e5de0589/557cc57b-c1bd-4c15-89f9-c5e23b707523.jpg",
    desc: "The gateway to independence: two Breeze turbines plus a compact 2.5 kWh battery. Catches wind from every direction, even between houses.",
    specs: ["2 × 300 W peak", "2.5 kWh storage", "36 dB", "Island mode"],
    yield: "2 × 40–150 kWh/year + 2.5 kWh buffering",
    mount: "Two wall brackets + wall unit",
    battery: "2.5 kWh LiFePO4, expandable to 10 kWh",
    tech: [
      "Hybrid inverter: RfG-certified (EN 50549), island mode",
      "Battery: 2.5 kWh LiFePO4, expandable to 10 kWh",
      "CE-marked · EU declaration of conformity and permit pack included"
    ]
  }
];

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "gevel", label: "Wall" },
  { key: "dak", label: "Roof" },
  { key: "tuin", label: "Garden / mast" },
  { key: "batterij", label: "With battery bundle" }
];
