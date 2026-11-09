(function () {
  "use strict";

  const grid = document.getElementById("product-grid");
  const tpl = document.getElementById("tpl-product");
  const filters = document.querySelectorAll(".chip");
  const state = { filter: "all" };

  const fmt = (n) => "€ " + n.toLocaleString("nl-NL");
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
      if (p.image) {
        const art = node.querySelector(".product-art");
        art.innerHTML = "";
        const img = document.createElement("img");
        img.src = p.image;
        img.alt = p.name;
        img.loading = "lazy";
        art.appendChild(img);
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
      return items.reduce((sum, it) => sum + byId(it.id).price * it.qty, 0);
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
          '<div class="qty"><button type="button" aria-label="Minder">−</button><span></span><button type="button" aria-label="Meer">+</button></div>' +
          '<div class="ci-price"></div>' +
          '<button type="button" class="ci-remove" aria-label="Verwijderen">✕</button>';
        li.querySelector(".ci-name").textContent = p.name;
        li.querySelector(".qty span").textContent = it.qty;
        li.querySelector(".ci-price").textContent = fmt(p.price * it.qty);
        const [minus, plus] = li.querySelectorAll(".qty button");
        minus.addEventListener("click", () => change(it.id, -1));
        plus.addEventListener("click", () => change(it.id, 1));
        li.querySelector(".ci-remove").addEventListener("click", () => remove(it.id));
        el.list.appendChild(li);
      });
    }

    function change(id, delta) {
      const it = items.find((i) => i.id === id);
      if (!it) return;
      it.qty += delta;
      if (it.qty <= 0) items = items.filter((i) => i.id !== id);
      save(); render();
    }

    function remove(id) {
      items = items.filter((i) => i.id !== id);
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
      if (!items.length) { toast("Je wagentje is nog leeg ⌀"); return; }
      toast("Demo — hier zou de kassa komen 🛒");
    });

    render();

    return { add: (id) => {
      const it = items.find((i) => i.id === id);
      if (it) it.qty += 1; else items.push({ id, qty: 1 });
      save(); render();
      toast(byId(id).name + " toegevoegd ✓");
    }};
  })();

  /* ---------- Productmodal ---------- */
  const modal = document.getElementById("modal");
  const modalBody = document.getElementById("modal-body");
  const modalOverlay = document.getElementById("modal-overlay");

  function openModal(id) {
    const p = byId(id);
    let artHtml = '<div class="m-art"><div class="turbine"><div class="pole"></div>' +
      '<div class="rotor"><div class="blade b1"></div><div class="blade b2"></div><div class="blade b3"></div></div></div></div>';
    if (p.image) {
      artHtml = '<div class="m-art"><img src="' + p.image + '" alt="' + p.name + '" loading="lazy"></div>';
    }
    modalBody.innerHTML =
      '<span class="m-tag"></span><h3></h3>' +
      artHtml +
      '<p class="m-desc"></p><ul class="m-specs"></ul>' +
      '<div class="m-foot"><span class="m-price"></span><button class="btn btn-primary">In winkelwagen</button></div>';
    modalBody.querySelector(".m-tag").textContent = p.tag;
    modalBody.querySelector("h3").textContent = p.name;
    modalBody.querySelector(".m-desc").textContent = p.desc;
    const ul = modalBody.querySelector(".m-specs");
    [
      ["Opbrengst", p.yield],
      ["Montage", p.mount],
      ["Batterij", p.battery],
      ["Specificaties", p.specs.join(" · ")]
    ].forEach(([k, v]) => {
      const li = document.createElement("li");
      li.innerHTML = "<strong></strong>";
      li.querySelector("strong").textContent = k.toUpperCase();
      li.appendChild(document.createTextNode(v));
      ul.appendChild(li);
    });
    modalBody.querySelector(".m-price").textContent = fmt(p.price);
    modalBody.querySelector(".btn").addEventListener("click", () => {
      Cart.add(p.id);
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

  /* ---------- Rektool: consumenten berekening ---------- */
  (function initCalc() {
    const homeTypeEl = document.getElementById("calc-home-type");
    const peopleEl = document.getElementById("calc-people");
    const peopleOut = document.getElementById("calc-people-out");
    const consumptionEl = document.getElementById("calc-consumption");
    const consumptionField = document.getElementById("calc-consumption-field");
    const turbineEl = document.getElementById("calc-turbine");
    const countEl = document.getElementById("calc-count");
    const countOut = document.getElementById("calc-count-out");
    const priceEl = document.getElementById("calc-price");
    const chart = document.getElementById("calc-chart");
    const results = document.getElementById("calc-results");
    
    if (!homeTypeEl || !turbineEl || !countEl || !priceEl) return;

    // Gemiddeld verbruik per woningtype (kWh/jaar)
    const HOME_TYPES = {
      appartement: 2500,
      rijtjes: 3500,
      "twee-onder-een-kap": 4500,
      vrijstaand: 6000
    };

    // Gemiddelde verbruik per persoon (kWh/jaar)
    const PERSON_CONSUMPTION = 1000;

    // Turbine data: watt -> jaarlijkse opbrengst in kWh
    const TURBINE_YIELD = {
      150: 200,
      300: 400,
      600: 900,
      1500: 1800
    };

    // Turbine prijzen
    const TURBINE_PRICES = {
      150: 549,
      300: 749,
      600: 1290,
      1500: 2490
    };

    // Maanddata voor grafiek (gemiddelde NL windopbrengst per maand)
    const MAANDEN = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
    const DAGEN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const WINDCF = [0.34, 0.32, 0.28, 0.23, 0.20, 0.17, 0.16, 0.16, 0.19, 0.24, 0.29, 0.35];

    function calculate() {
      const homeType = homeTypeEl.value;
      const people = +peopleEl.value;
      const turbineWatt = +turbineEl.value;
      const count = +countEl.value;
      const price = +priceEl.value || 0.33;

      // Bereken verbruik
      let consumption;
      if (homeType === "custom") {
        consumption = +consumptionEl.value || 4500;
      } else {
        // Basis verbruik op woningtype + extra per persoon
        const base = HOME_TYPES[homeType] || 4500;
        consumption = base + (people - 2) * PERSON_CONSUMPTION;
        if (consumption < 1000) consumption = 1000;
      }

      // Bereken opbrengst
      const yieldPerTurbine = TURBINE_YIELD[turbineWatt] || 400;
      const totalYield = yieldPerTurbine * count;
      
      // Bereken coverage
      const coverage = consumption > 0 ? Math.round((totalYield / consumption) * 100) : 0;
      
      // Bereken besparing
      const savings = totalYield * price;
      
      // Bereken terugverdientijd
      const turbinePrice = TURBINE_PRICES[turbineWatt] || 749;
      const investment = turbinePrice * count;
      const payback = savings > 0 ? Math.round(investment / savings * 10) / 10 : 0;

      // Update outputs
      peopleOut.textContent = people + " " + (people === 1 ? "persoon" : "personen");
      countOut.textContent = count + " " + (count === 1 ? "turbine" : "turbines");

      // Update results
      document.getElementById("result-yield").textContent = totalYield.toLocaleString("nl-NL") + " kWh";
      document.getElementById("result-coverage").textContent = coverage + "%";
      document.getElementById("result-savings").textContent = "€ " + savings.toLocaleString("nl-NL", {minimumFractionDigits: 0, maximumFractionDigits: 0});
      document.getElementById("result-payback").textContent = payback.toLocaleString("nl-NL") + " jaar";

      // Render chart
      renderChart(turbineWatt, count);
    }

    function renderChart(turbineWatt, count) {
      if (!chart) return;

      const watt = +turbineWatt;
      const totalWatt = watt * count;
      const maxKwh = MAANDEN.map((_, i) => (totalWatt / 1000) * 24 * DAGEN[i] * WINDCF[i]);
      const maxVal = Math.max(...maxKwh, 1);

      chart.innerHTML = "";
      MAANDEN.forEach((m, i) => {
        const kwh = maxKwh[i];
        const col = document.createElement("div");
        col.className = "calc-bar";
        col.title = m + ": " + Math.round(kwh) + " kWh";
        const bar = document.createElement("div");
        bar.className = "bar-wind";
        bar.style.height = Math.max(kwh / maxVal * 100, 2) + "%";
        const lbl = document.createElement("div");
        lbl.className = "bar-month";
        lbl.textContent = m;
        col.append(bar, lbl);
        chart.appendChild(col);
      });
    }

    // Event listeners
    homeTypeEl.addEventListener("change", function() {
      const isCustom = this.value === "custom";
      consumptionField.style.display = isCustom ? "flex" : "none";
      calculate();
    });

    peopleEl.addEventListener("input", function() {
      peopleOut.textContent = this.value + " " + (+this.value === 1 ? "persoon" : "personen");
      calculate();
    });

    consumptionEl.addEventListener("input", calculate);
    turbineEl.addEventListener("change", calculate);
    countEl.addEventListener("input", function() {
      countOut.textContent = this.value + " " + (+this.value === 1 ? "turbine" : "turbines");
      calculate();
    });
    priceEl.addEventListener("input", calculate);

    // Initial calculate
    calculate();
  })();
  /* ---------- Newsletter (demo, geen echte verzending) ---------- */
  const nlForm = document.getElementById("newsletter-form");
  const nlMsg = document.getElementById("newsletter-msg");
  nlForm.addEventListener("submit", (e) => {
    e.preventDefault();
    nlMsg.textContent = "Bedankt! (demo — geen echte aanmelding)";
    nlForm.reset();
  });

  renderGrid();
})();
