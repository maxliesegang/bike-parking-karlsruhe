# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the dev server at http://localhost:3000
- `npm run build` — produce the static export in `out/` (this is what CI deploys)
- `npm run lint` — ESLint with `--max-warnings=0` (warnings fail CI)
- `npm run lint:fix` — auto-fix lint issues
- `npm run format` — Prettier over `**/*.{ts,tsx,md,mdx,css,scss}`
- `node scripts/fetch-osm-data.mjs` — refresh the two GeoJSON files in `data/`

There is no test suite. Type-checking happens implicitly via `next build` (tsconfig has `noEmit`, `strict`).

`NODE_TLS_REJECT_UNAUTHORIZED=0` is set on `dev`/`build` because the City of Karlsruhe WFS endpoint (see `JSON_URL` in [config.ts](src/lib/config.ts)) has a certificate that Node rejects otherwise.

## Architecture

This is a **statically exported** Next.js app (Pages Router, `output: 'export'` in [next.config.mjs](next.config.mjs)). All data is fetched and processed at **build time** in `getStaticProps`/`getStaticPaths`; there is no runtime backend. The output deploys to GitHub Pages under `basePath: '/bike-parking-karlsruhe'`.

### OpenStreetMap is the core data source

The app analyzes **OpenStreetMap** bike parking (`amenity=bicycle_parking`). `scripts/fetch-osm-data.mjs` queries Overpass (with mirror fallback + retries) and writes two committed files to `data/`: `osm-bike-parking.geojson` (parking points across Karlsruhe + the Landkreis) and `karlsruhe-stadtteile.geojson` (boundary polygons — admin_level 10 + 9 for the city, admin_level 8 for surrounding municipalities). These are read at build time by [osmDataFetcher.ts](src/lib/osmDataFetcher.ts), processed in [osmDataProcessor.ts](src/lib/osmDataProcessor.ts), and memoized in [osmDataCache.ts](src/lib/osmDataCache.ts) via `getOsmData()` (returns `{ parkings, regions, boundaries, history }`).

The **Stadt Karlsruhe** WFS dataset is retained only as a comparison count: [dataFetcher.ts](src/lib/dataFetcher.ts) → `processGeoJsonToAbstellanlagen` in [dataProcessor.ts](src/lib/dataProcessor.ts) → `getAbstellanlagen()` in [staticDataCache.ts](src/lib/staticDataCache.ts). It feeds only `generateVergleichDaten` on the home page.

### OSM geo-processing specifics

- Each point is assigned to one region by point-in-polygon ray casting (`findContainingRegion`), priority **AL10 > AL9 > AL8**. AL9+AL10 tile Karlsruhe city; AL8 municipalities are disjoint, so this yields a single mutually-exclusive partition. The model field is `region` + `regionLevel` on [osm-bike-parking.ts](src/models/osm-bike-parking.ts).
- **Private parking is dropped**: features with `access` = `private`/`no`/`restricted` are filtered out in `processOsmBikeParkingData`.
- Geometry helpers (`pointInPolygon`, `polygonAreaKm2`) live in [geoUtils.ts](src/lib/geoUtils.ts). `buildRegionInfos` merges region reference data: the 28 Karlsruhe districts use authoritative population/area from [karlsruhe-districts.ts](src/data/karlsruhe-districts.ts); surrounding municipalities use the OSM `population` tag (where present) and an area computed from geometry. Regions without population show counts but no per-capita rating (`bewertung: "unbewertet"`).
- `bicycle_parking` values → German labels via `BICYCLE_PARKING_LABELS`; same labels drive `QUALITY_ART_SCORE`. Aggregations: `generateVersorgungAnalyse(parkings, regions)`, `generateQualitaetAnalyse`, `generateRegionAnalyse`, `generateTypAnalyse`, `generateTopFacilities` (largest facilities — surfaces transit hubs).

### Progress tracking and CI

[osmHistoryMapper.ts](src/lib/osmHistoryMapper.ts) appends a dated aggregate snapshot to `osm-history.json` (repo root) as a build-time side effect, deduped by day. This is the data behind the `/progress` chart and grows ~one point per day.

The deploy workflow fetches OSM data, **then builds** (which writes `osm-history.json`), **then commits** `data/*.geojson` + `osm-history.json`. The commit runs **only** on `schedule`/`workflow_dispatch` — keeping a versioned history and giving scheduled runs the repository activity that prevents auto-disable after 60 idle days (a push already counts, and committing on push could loop).

### Pages, models, components

- Pages: `/` (KPIs + Leaflet map + largest-facilities + city comparison), `/analyse` (Versorgung/Qualität/Typen tabs), `/progress` (history chart), `/about`.
- The map is Leaflet via react-leaflet + react-leaflet-cluster, in [ParkingMapInner.tsx](src/components/ParkingMapInner.tsx), loaded through [ParkingMap.tsx](src/components/ParkingMap.tsx) with `dynamic(..., { ssr: false })` (Leaflet needs `window`). Markers use a CSS `L.divIcon` dot — no image assets — to avoid the default-marker icon URLs breaking under the GitHub Pages basePath.
- TypeScript interfaces in [src/models/](src/models/); import via the `@/*` alias. UI is MUI v9 + Emotion (theme in [theme.ts](src/styles/theme.ts)); charts use Recharts. [DataTable.tsx](src/components/DataTable.tsx) is the generic sortable table; [StatCard.tsx](src/components/StatCard.tsx) exports `StatCard` + `BewertungBadge`.
