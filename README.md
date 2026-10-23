# WINDVANGER 🌬️ — Verticale windturbines voor thuis

Prototype-webshop voor verticale windturbines die aan een thuisbatterij gekoppeld worden.
Wind in de winter, zon in de zomer, batterij als brug — het grid wordt je back-up.

## Live demo

De site staat live via GitHub Pages:

**https://duncanborsboom.github.io/windvanger/**

## Wat zit erin

- `index.html` — Nederlandse versie (default)
- `index-en.html` — Engelse versie (WINDCATCHER)
- `css/style.css` — volledige styling, incl. licht/donker-thema
- `js/` — productdata, winkelwagen, filters, rekentool (zon vs. wind)

## Features

- Productcatalogus met 6 turbines en batterij-bundles
- Filterchips (gevel / dak / tuin / batterij)
- Winkelwagen met localStorage (blijft bewaard tussen sessies)
- **Rekentool**: zon-uren vs. winduren in Nederland per maand × jouw panelen en turbine → kWh en € per jaar, inclusief de wintervergelijking (nov–feb)
- Licht/donker thema-toggle (◐)
- Taalwissel NL ↔ EN
- 100% statisch: geen build, geen dependencies

## Lokaal draaien

Optie 1 — dubbelklik `index.html` (werkt direct).

Optie 2 — mini webserver:

```bash
node server.js
```

Daarna: http://localhost:8080

## Status

Prototype. Producten, prijzen en opbrengst-cijfers zijn indicatief.
