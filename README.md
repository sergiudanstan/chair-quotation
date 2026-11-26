> **Superseded by furniture-quotation** → <https://github.com/sergiudanstan/furniture-quotation> · <https://sergiudanstan.github.io/furniture-quotation/>
> It offers the same chair (all ten parameters, wood, finish, upholstery, live price, PDF quote, 3MF/STL/OBJ export) and adds a table.
> This repository is archived; the text below is kept as history.

# chair-quotation

[![CI](https://github.com/sergiudanstan/chair-quotation/actions/workflows/ci.yml/badge.svg)](https://github.com/sergiudanstan/chair-quotation/actions/workflows/ci.yml)
[![CodeQL](https://github.com/sergiudanstan/chair-quotation/actions/workflows/codeql.yml/badge.svg)](https://github.com/sergiudanstan/chair-quotation/actions/workflows/codeql.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/sergiudanstan/chair-quotation/badge)](https://scorecard.dev/viewer/?uri=github.com/sergiudanstan/chair-quotation)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Parametric chair configurator with a live price and a downloadable PDF quote, running entirely in
the browser. Sliders change the chair (Manifold WASM geometry, three.js preview, 3MF/STL/OBJ
download), and a quote panel recomputes the price from the chosen wood, finish and upholstery.

**Live:** https://sergiudanstan.github.io/chair-quotation/

## What it configures

The same ten chair parameters as [parametric-chair](https://github.com/sergiudanstan/parametric-chair)
(seat width/depth/height/thickness, backrest height and tilt, leg thickness, armrest height and
thickness, corner radius; ranges in `src/main.ts`), plus a material selection:

- wood: European Oak, American Walnut, European Beech, Scandinavian Pine
- finish: natural oil, clear lacquer, dark stain (oak, walnut) or whitewash (beech, pine)
- upholstery: none, standard fabric, full-grain leather

## Pricing logic

Prices come from `src/quote/pricing.ts` and the rates in `src/data/pricing-config.json`
(EUR; edit the JSON and rebuild to change them). All geometry is computed analytically from
the parameters (every part is a box), not from the rendered mesh:

1. Wood volume = sum of the boxes (seat, 4 aprons, 4 legs, front stretcher, plus back posts, top
   rail and 4 slats when the backrest height is above 0, plus 2 armrests when the armrest height
   is above 0), times a waste factor of 1.08. Material cost = volume x price per cm3 of the chosen
   wood (oak, walnut, beech, pine). Weight uses the wood's density.
2. Finish cost = surface area (all six faces of every box, an upper bound) x price per m2 of the
   chosen finish.
3. Upholstery = seat top area x price per m2 (none, fabric, leather).
4. Labor = 120 base minutes, +10 per backrest slat (4) and +2 per degree of backrest tilt when there
   is a backrest, +30 per armrest (2), at 45 EUR/h.
5. Overhead x1.15 on the subtotal, then a 25 % profit margin; the total is never below the 180 EUR
   minimum price.

The **Export PDF Quote** button writes an A4 PDF with a snapshot of the 3D view, the dimensions,
the material selection, the price breakdown and the total (valid 30 days, as printed on it).
The PDF is generated in the browser with jsPDF; nothing is uploaded.

## Deployment

`.github/workflows/deploy.yml` builds with `--base /chair-quotation/` and publishes `dist/` to GitHub Pages on
every push to `main`. `netlify.toml` (build `npm run build`, publish `dist`, SPA redirect and
security headers) is only used if the site is also connected to Netlify; GitHub Pages ignores it.

## Development

```bash
npm ci
npm run dev        # Vite dev server
npm run build      # tsc type-check + production build into dist/
npm test           # headless Chrome smoke test of dist/ (run the build first)
```

`npm test` needs Google Chrome installed (set `PW_CHANNEL=chromium` to use Playwright's Chromium).
CI runs the type-check and build, the smoke test, `npm audit`, `pip-audit` on the CI toolchain,
CodeQL and `zizmor` on the workflows.

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md) and [CHANGELOG.md](CHANGELOG.md).
