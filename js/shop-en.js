(function () {
  "use strict";

  const grid = document.getElementById("product-grid");
  const tpl = document.getElementById("tpl-product");
  const filters = document.querySelectorAll(".chip");
  const state = { filter: "all" };

  const fmt = (n) => "€ " + n.toLocaleString("en-GB");
  const priceFor = (p, variant) => (variant === "without" && p.priceWithout) ? p.priceWithout : p.price;
  const byId = (id) => PRODUCTS.find((p) => p.id === id);

  function matches(p, f) {
    return f === "all" || p.type.includes(f);
  }

  function renderGrid() {
    grid.innerHTML = "";
    PRODUCTS.filter((p) => matches(p, state.filter)).forEach((p) => {
      const node = tpl.content.cloneNode(true);
      const root = node.querySelector(".product");
      root.dataset.id = p.id;
      node.querySelector(".product-name").textContent = p.name;
      node.querySelector(".product-tag").textContent = p.tag;
      node.querySelector(".product-desc").textContent = p.desc;
      const ul = node.querySelector(".product-specs");
      p.specs.forEach((s) => {
        const li = document.createElement("li");
        li.textContent = s;
        ul.appendChild(li);
      });
      if (p.priceWithout) {
        const li = document.createElement("li");
        li.textContent = "with / without controller";
        ul.appendChild(li);
      }
      const priceEl = node.querySelector(".product-price");
      if (p.oldPrice) {
        priceEl.innerHTML = "";
        const del = document.createElement("del");
        del.style.color = "var(--muted)";
        del.style.marginRight = ".4em";
        del.textContent = fmt(p.oldPrice);
        priceEl.appendChild(del);
        priceEl.appendChild(document.createTextNode(fmt(p.price)));
      } else {
        priceEl.textContent = fmt(p.price);
      }
      node.querySelector(".add").addEventListener("click", () => Cart.add(p.id));
      node.querySelector(".link-more").addEventListener("click", () => openModal(p.id));
      grid.appendChild(node);
    });
  }

  filters.forEach((chip) => {
    chip.addEventListener("click", () => {
      filters.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      state.filter = chip.dataset.filter;
      renderGrid();
    });
  });

  /* ---------- Winkelwagen ---------- */
  const Cart = (() => {
    const KEY = "windvanger-cart-v1";
    let items = [];
    try {
      items = JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch (e) { items = []; }
    items.forEach((it) => { if (!it.variant) it.variant = "with"; });

    const el = {
      panel: document.getElementById("cart"),
      overlay: document.getElementById("cart-overlay"),
      openBtn: document.getElementById("cart-open"),
      closeBtn: document.getElementById("cart-close"),
      list: document.getElementById("cart-items"),
      empty: document.getElementById("cart-empty"),
      count: document.getElementById("cart-count"),
      total: document.getElementById("cart-total"),
      checkout: document.getElementById("checkout"),
      toast: document.getElementById("toast")
    };

    function save() {
      localStorage.setItem(KEY, JSON.stringify(items));
    }

    function total() {
      return items.reduce((sum, it) => sum + priceFor(byId(it.id), it.variant) * it.qty, 0);
    }

    function render() {
      const count = items.reduce((s, it) => s + it.qty, 0);
      el.count.textContent = count;
      el.total.textContent = fmt(total());
      el.empty.style.display = items.length ? "none" : "block";
      el.list.innerHTML = "";
      items.forEach((it) => {
        const p = byId(it.id);
        const li = document.createElement("li");
        li.className = "cart-item";
        li.innerHTML =
          '<div class="ci-name"></div>' +
          '<div class="qty"><button type="button" aria-label="Less">−</button><span></span><button type="button" aria-label="More">+</button></div>' +
          '<div class="ci-price"></div>' +
          '<button type="button" class="ci-remove" aria-label="Remove">✕</button>';
        li.querySelector(".ci-name").textContent = p.name + (it.variant === "without" ? " — without controller" : "");
        li.querySelector(".qty span").textContent = it.qty;
        li.querySelector(".ci-price").textContent = fmt(p.price * it.qty);
        const [minus, plus] = li.querySelectorAll(".qty button");
        minus.addEventListener("click", () => change(it.id, it.variant, -1));
        plus.addEventListener("click", () => change(it.id, it.variant, 1));
        li.querySelector(".ci-remove").addEventListener("click", () => remove(it.id, it.variant));
        el.list.appendChild(li);
      });
    }

    function change(id, variant, delta) {
      const it = items.find((i) => i.id === id && i.variant === variant);
      if (!it) return;
      it.qty += delta;
      if (it.qty <= 0) remove(id, variant);
      save(); render();
    }

    function remove(id, variant) {
      items = items.filter((i) => !(i.id === id && i.variant === variant));
      save(); render();
    }

    function toast(msg) {
      el.toast.textContent = msg;
      el.toast.classList.add("show");
      clearTimeout(el.toast._t);
      el.toast._t = setTimeout(() => el.toast.classList.remove("show"), 2200);
    }

    function open() {
      el.panel.hidden = false;
      el.overlay.hidden = false;
      document.body.style.overflow = "hidden";
      el.closeBtn.focus();
    }

    function close() {
      el.panel.hidden = true;
      el.overlay.hidden = true;
      document.body.style.overflow = "";
    }

    el.openBtn.addEventListener("click", open);
    el.closeBtn.addEventListener("click", close);
    el.overlay.addEventListener("click", close);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { close(); closeModal(); }
    });

    el.checkout.addEventListener("click", () => {
      if (!items.length) { toast("Your cart is still empty ⌀"); return; }
      toast("Demo — checkout would go here 🛒");
    });

    render();

    return { add: (id, variant) => {
      variant = variant || "with";
      const it = items.find((i) => i.id === id && i.variant === variant);
      if (it) it.qty += 1; else items.push({ id: id, qty: 1, variant: variant });
      save(); render();
      toast(byId(id).name + (variant === "without" ? " (without controller)" : "") + " added ✓");
    }};
  })();

  /* ---------- Productmodal ---------- */
  const modal = document.getElementById("modal");
  const modalBody = document.getElementById("modal-body");
  const modalOverlay = document.getElementById("modal-overlay");

  function openModal(id) {
    const p = byId(id);
    let variant = "with";
    modalBody.innerHTML =
      '<span class="m-tag"></span><h3></h3>' +
      '<div class="m-art"><div class="turbine"><div class="pole"></div>' +
      '<div class="rotor"><div class="blade b1"></div><div class="blade b2"></div><div class="blade b3"></div></div></div></div>' +
      '<p class="m-desc"></p><ul class="m-specs"></ul>' +
      '<div class="m-ctrl"></div>' +
      '<div class="m-foot"><span class="m-price"></span><button class="btn btn-primary">Add to cart</button></div>';
    modalBody.querySelector(".m-tag").textContent = p.tag;
    modalBody.querySelector("h3").textContent = p.name;
    modalBody.querySelector(".m-desc").textContent = p.desc;
    const ul = modalBody.querySelector(".m-specs");
    const rows = [
      ["Yield", p.yield],
      ["Mounting", p.mount],
      ["Battery", p.battery],
      ["Specs", p.specs.join(" · ")]
    ];
    if (p.controller) rows.push(["Controller", p.controller]);
    (p.tech || []).forEach((t) => rows.push(["Tech", t]));
    rows.forEach(([k, v]) => {
      const li = document.createElement("li");
      li.innerHTML = "<strong></strong>";
      li.querySelector("strong").textContent = k.toUpperCase();
      li.appendChild(document.createTextNode(v));
      ul.appendChild(li);
    });
    const priceEl = modalBody.querySelector(".m-price");
    const setPrice = () => { priceEl.textContent = fmt(priceFor(p, variant)); };
    const ctrlBox = modalBody.querySelector(".m-ctrl");
    if (p.priceWithout) {
      const chips = document.createElement("div");
      chips.className = "filters";
      chips.setAttribute("role", "tablist");
      chips.setAttribute("aria-label", "Controller option");
      const mk = (label, val) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "chip" + (val === variant ? " active" : "");
        b.textContent = label;
        b.addEventListener("click", () => {
          variant = val;
          chips.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
          b.classList.add("active");
          setPrice();
        });
        chips.appendChild(b);
      };
      mk("With MPPT controller (+" + fmt(p.price - p.priceWithout) + ")", "with");
      mk("Without controller — I already have an inverter", "without");
      const note = document.createElement("p");
      note.style.margin = ".5rem 0 0";
      note.style.color = "var(--muted)";
      note.style.fontSize = ".75rem";
      note.textContent = "The controller is CE-marked and charges your battery safely. Grid feed-in requires an RfG-certified inverter (EN 50549) and registration with your grid operator.";
      ctrlBox.append(chips, note);
    }
    setPrice();
    modalBody.querySelector(".btn").addEventListener("click", () => {
      Cart.add(p.id, variant);
      closeModal();
    });
    modal.hidden = false;
    modalOverlay.hidden = false;
  }

  function closeModal() {
    modal.hidden = true;
    modalOverlay.hidden = true;
  }
  document.getElementById("modal-close").addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", closeModal);

  (function initCalc() {
    const solarEl = document.getElementById("calc-solar");
    const solarOut = document.getElementById("calc-solar-out");
    const turbineEl = document.getElementById("calc-turbine");
    const countEl = document.getElementById("calc-count");
    const countOut = document.getElementById("calc-count-out");
    const priceEl = document.getElementById("calc-price");
    const chart = document.getElementById("calc-chart");
    const results = document.getElementById("calc-results");
    if (!solarEl || !chart) return;

    /* Average NL data per month (index 0 = Jan):
       zonUren = full-sun hours per day; panel yield ≈ wp * sunHours * days * 0.75 (system efficiency)
       windCF = realistic capacity factor of a small VAWT in NL (research-based, ±3–5% annual average);
       turbine yield ≈ watt * 24 * days * CF */
    const MAANDEN = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
    const DAGEN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const ZONUREN = [1.3, 2.4, 3.9, 5.4, 6.6, 6.9, 6.6, 5.9, 4.5, 2.9, 1.6, 1.1];
    const WINDCF = [0.052, 0.049, 0.043, 0.036, 0.031, 0.027, 0.025, 0.025, 0.029, 0.038, 0.046, 0.054];

    /* Gemeten NL-data 2025 (KNMI, benadering): gemiddelde zonuren per dag
       en % winddagen (dagen met voldoende wind, >= 5 m/s) per maand */
    const ZONUREN_2025 = [1.2, 2.6, 4.2, 6.1, 7.3, 6.4, 7.1, 6.0, 4.8, 3.1, 1.7, 0.9];
    const WINDDAGEN_2025 = [68, 62, 55, 48, 42, 38, 35, 37, 45, 55, 63, 70];
    let modus = "setup";

    function is2025() { return modus === "2025"; }

    function solarKwh(maand, panelen) {
      const kWp = panelen * 0.365;
      return kWp * ZONUREN[maand] * DAGEN[maand] * 0.75;
    }

    function windKwh(maand, watt) {
      return (watt / 1000) * 24 * DAGEN[maand] * WINDCF[maand];
    }

    function render() {
      const panelen = +solarEl.value;
      const watt = +turbineEl.value;
      const prijs = +priceEl.value || 0.33;
      const aantal = +(countEl ? countEl.value : 1);
      solarOut.textContent = panelen + " panels (± " + (panelen * 0.365).toFixed(1) + " kWp)";
      if (countOut) countOut.textContent = aantal + (aantal === 1 ? " turbine" : " turbines");

      const zonnen = is2025()
        ? ZONUREN_2025.map((z) => (z / 12) * 100)
        : MAANDEN.map((_, i) => solarKwh(i, panelen));
      const winden = is2025()
        ? WINDDAGEN_2025.slice()
        : MAANDEN.map((_, i) => windKwh(i, watt) * aantal);

      const lz = document.getElementById("legend-zon");
      const lw = document.getElementById("legend-wind");
      if (lz) lz.textContent = is2025() ? "sun (% of daylight)" : "solar (panels)";
      if (lw) lw.textContent = is2025() ? "wind (% of days)" : "wind (turbine)";
      const max = Math.max(...winden, ...zonnen, 1);

      chart.innerHTML = "";
      MAANDEN.forEach((m, i) => {
        const col = document.createElement("div");
        col.className = "calc-bar";
        col.title = is2025()
          ? m + " 2025: sun " + zonnen[i].toFixed(0) + "% of daylight · wind on " + winden[i].toFixed(0) + "% of days"
          : m + ": solar " + zonnen[i].toFixed(0) + " kWh / wind " + winden[i].toFixed(0) + " kWh";
        const stack = document.createElement("div");
        stack.className = "bar-stack";
        const zs = document.createElement("div");
        zs.className = "bar-solar";
        zs.style.height = Math.max(zonnen[i] / max * 100, 1.5) + "%";
        const ws = document.createElement("div");
        ws.className = "bar-wind";
        ws.style.height = Math.max(winden[i] / max * 100, 1.5) + "%";
        const lbl = document.createElement("div");
        lbl.className = "bar-month";
        lbl.textContent = m;
        stack.append(ws, zs);
        col.append(stack, lbl);
        chart.appendChild(col);
      });

      const totZon = zonnen.reduce((a, b) => a + b, 0);
      const totWind = winden.reduce((a, b) => a + b, 0);
      const winterWind = winden.slice(10).concat(winden.slice(0, 2)).reduce((a, b) => a + b, 0);
      const winterZon = zonnen.slice(10).concat(zonnen.slice(0, 2)).reduce((a, b) => a + b, 0);
      const besparing = (totWind) * prijs;
      const stukprijs = +(turbineEl.selectedOptions[0].dataset.price || 0);
      const investering = stukprijs * aantal;
      const terugverdient = besparing > 0 ? investering / besparing : 0;

      results.innerHTML = "";
      let kaarten;
      if (is2025()) {
        const jaarWindP = WINDDAGEN_2025.reduce((a, b) => a + b, 0) / 12;
        const jaarZonP = ZONUREN_2025.reduce((a, b) => a + b, 0) / 12 / 12 * 100;
        const zomerWindP = (WINDDAGEN_2025[4] + WINDDAGEN_2025[5] + WINDDAGEN_2025[6] + WINDDAGEN_2025[7]) / 4;
        const zomerZonP = (ZONUREN_2025[4] + ZONUREN_2025[5] + ZONUREN_2025[6] + ZONUREN_2025[7]) / 4 / 12 * 100;
        const winterWindP = (WINDDAGEN_2025[0] + WINDDAGEN_2025[1] + WINDDAGEN_2025[10] + WINDDAGEN_2025[11]) / 4;
        const winterZonP = (ZONUREN_2025[0] + ZONUREN_2025[1] + ZONUREN_2025[10] + ZONUREN_2025[11]) / 4 / 12 * 100;
        kaarten = [
          [Math.round(jaarWindP) + "% · " + Math.round(jaarZonP) + "%", "full year 2025: wind available vs sunshine"],
          [Math.round(zomerWindP) + "% · " + Math.round(zomerZonP) + "%", "summer (May–Aug): sun just wins here"],
          [Math.round(winterWindP) + "% · " + Math.round(winterZonP) + "%", "winter (Nov–Feb): wind beats sun 5×"],
          ["24/7", "wind keeps blowing at night — sun only by daylight"],
          ["—", "switch back for your setup and payback time"]
        ];
      } else {
        kaarten = [
          [Math.round(totWind) + " kWh", "wind yield " + aantal + "× turbine per year ≈ € " + besparingFmt(besparing)],
          [Math.round(totZon) + " kWh", "solar yield " + panelen + " panels per year"],
          [Math.round(winterWind) + " kWh", "wind in winter (Nov–Feb)"],
          [Math.round(winterZon) + " kWh", "solar in winter (Nov–Feb) — compare!"],
          [terugverdient > 0 ? (terugverdient > 25 ? "25+ yrs" : Math.round(terugverdient) + " yrs") : "—", "payback at current power prices ≈ € " + investering.toLocaleString("en-GB") + " investment"]
        ];
      }
      kaarten.forEach(([v, l]) => {
        const stat = document.createElement("div");
        stat.className = "calc-stat";
        const strong = document.createElement("strong");
        strong.textContent = v;
        const span = document.createElement("span");
        span.textContent = l;
        stat.append(strong, span);
        results.appendChild(stat);
      });
    }

    function besparingFmt(n) {
      return n.toLocaleString("en-GB", { maximumFractionDigits: 0 });
    }

    document.querySelectorAll(".calc-mode").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".calc-mode").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        modus = btn.dataset.mode;
        render();
      });
    });

    [solarEl, turbineEl, priceEl, countEl].forEach(el => el.addEventListener("input", render));
    render();
  })();

  /* ---------- Newsletter (demo, geen echte verzending) ---------- */
  const nlForm = document.getElementById("newsletter-form");
  const nlMsg = document.getElementById("newsletter-msg");
  nlForm.addEventListener("submit", (e) => {
    e.preventDefault();
    nlMsg.textContent = "Thanks! (demo — not a real signup)";
    nlForm.reset();
  });

  renderGrid();
})();
