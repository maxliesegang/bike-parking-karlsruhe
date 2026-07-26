# Fahrrad-Abstellanlagen in Karlsruhe

## Overview

A web app that explores and analyzes bicycle parking facilities in and around Karlsruhe, driven primarily by OpenStreetMap data. It maps every known facility, measures coverage (supply, quality, data completeness) by district, and tracks the growth of the dataset over time.

**[Live site →](https://maxliesegang.github.io/bike-parking-karlsruhe/)**

## Pages

- **/** — Overview KPIs, a three-view interactive map (clustered points, walking-distance coverage raster, equipment level), and the largest facilities.
- **/analyse** — Per-region analysis across four tabs: supply (per-capita ratings within peer groups), quality (covered/secure/lit shares), Bike+Ride capacity, and data completeness (tag coverage + survey freshness). The supply tab includes a choropleth whose colours mirror the table figures.
- **/vergleich** — OSM data vs. the City of Karlsruhe's official dataset.
- **/progress** — Monthly growth of the OSM dataset since early 2023.
- **/about** — Background, data sources, and methodology.

## Technology Stack

- [Next.js](https://nextjs.org/) (Pages Router, statically exported for GitHub Pages)
- [TypeScript](https://www.typescriptlang.org/)
- [MapLibre GL JS](https://maplibre.org/) — interactive maps with vector tiles from OpenFreeMap
- [Recharts](https://recharts.org/) — charts on the /progress and /analyse pages
- [KERN UX](https://kern-ux.com/) — design system
- Overpass API (OpenStreetMap) — primary data source

## Getting Started

### Prerequisites

- Node.js ≥ 18

### Installation

```bash
git clone https://github.com/maxliesegang/bike-parking-karlsruhe.git
cd bike-parking-karlsruhe
npm install
```

### Development

```bash
npm run dev        # Start dev server at http://localhost:3000
npm run build      # Static export to out/
npm run lint       # ESLint (--max-warnings=0)
npm run lint:fix   # Auto-fix lint issues
npm run format     # Prettier over *.ts,*.tsx,*.md,*.css,*.scss
```

### Refresh OSM data

```bash
node scripts/fetch-osm-data.mjs
```

This queries Overpass and writes two GeoJSON files to `data/` that are committed and read at build time.

## Project Structure

- `src/pages/` — Next.js pages and `getStaticProps` data loading
- `src/components/` — React components (maps, tables, charts)
- `src/models/` — TypeScript interfaces for the data models (shared by server and client)
- `src/lib/` — Data fetching, OSM parsing and analytics, map utilities
- `src/lib/osm/` — OSM-specific processing: parsing, region assignment, analytics, peer groups, coverage grid
- `src/lib/map/` — MapLibre GL JS setup: hooks, shared helpers, layer definitions, colour scales
- `src/styles/` — Global styles and KERN UX overrides
- `scripts/` — Data fetching and backfill scripts
- `data/` — Committed GeoJSON files (OSM parkings, boundaries)

## Data Sources

- **OpenStreetMap** (`amenity=bicycle_parking`) — the primary dataset. Covers Karlsruhe city, its 27 districts, and the 32 surrounding municipalities (the "Umland"). Updated via a scheduled GitHub Actions workflow that fetches fresh data from Overpass on the 1st of each month.
- **Stadt Karlsruhe WFS** — retained as a comparison reference on the /vergleich page.
- **Wikidata** — municipal population figures joined to boundary polygons via the `wikidata` OSM tag.
- **ohsome API** — historical backfill for the /progress chart (pre-2025 snapshots).

## Architecture

This is a **statically exported** Next.js app. All data is fetched and processed **at build time**; there is no runtime backend. Page data is computed in `getStaticProps`, and the three map data files (`parkings.json`, `coverage.json`, `regions.geojson`) are written to `public/data/` during the build so the client can fetch them asynchronously.

## Contributing

Contributions are welcome. Please submit a Pull Request.

## License

MIT — see [LICENSE](LICENSE).
