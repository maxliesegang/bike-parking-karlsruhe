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

The app analyzes **OpenStreetMap** bike parking (`amenity=bicycle_parking`). `scripts/fetch-osm-data.mjs` queries Overpass (with mirror fallback + retries) and writes two committed files to `data/`: `osm-bike-parking.geojson` (parking points across Karlsruhe + the surrounding municipalities) and `karlsruhe-stadtteile.geojson` (boundary polygons — admin_level 10 + 9 for the city, admin_level 8 for surrounding municipalities). These are read at build time by [osmDataFetcher.ts](src/lib/osmDataFetcher.ts), processed in [src/lib/osm/](src/lib/osm/) (`parse.ts` → flat model, `regions.ts` → region assignment, `analytics.ts` → aggregations, `labels.ts` → tag labels/scores), and memoized in [osmDataCache.ts](src/lib/osmDataCache.ts) via `getOsmData()` (returns `{ parkings, regions, boundaries, history }`).

The **Stadt Karlsruhe** WFS dataset is retained only as a comparison count: [dataFetcher.ts](src/lib/dataFetcher.ts) → `processGeoJsonToAbstellanlagen` in [dataProcessor.ts](src/lib/dataProcessor.ts) → `getAbstellanlagen()` in [staticDataCache.ts](src/lib/staticDataCache.ts). It feeds only `generateComparison` on the home page.

### OSM geo-processing specifics

- Each point is assigned to one region by point-in-polygon ray casting (`findContainingRegion` in [regions.ts](src/lib/osm/regions.ts)), priority **AL10 > AL9 > AL8**. AL9+AL10 tile Karlsruhe city; AL8 municipalities are disjoint, so this yields a single mutually-exclusive partition. The model field is `region` + `regionLevel` on [osm-bike-parking.ts](src/models/osm-bike-parking.ts).
- **The study area is Stadt Karlsruhe + the surrounding municipalities** (OSM: `Landkreis Karlsruhe`, the AL6 area the Overpass query names — in user-facing German text the area is always called **Umland**, never "Landkreis"), and it is enforced twice. `scripts/fetch-osm-data.mjs` scopes _both_ Overpass queries to the same two `admin_level=6` areas (`AREAS`), so the download is already correct — it used to be a rectangular bbox that reached into Rheinland-Pfalz, Rastatt and the Enzkreis, and those points (38% of features, 43% of capacity) silently inflated every "gesamt" figure. `parseOsmBikeParking` ([parse.ts](src/lib/osm/parse.ts)) then still drops points that fall outside every boundary, because points and boundaries come from two separate queries and Overpass's area test and our ray casting can disagree on a point sitting exactly on a border. With the area-scoped query that guard currently drops zero features. `region` is therefore always set and `regionLevel` is never 0 on a parsed feature.
- **Private parking is dropped**: `access` = `private`/`no`/`restricted`, also in `parseOsmBikeParking`.
- Parse also lifts the tags the /analyse page needs: `bike_ride`, `lit` (+ `litTagged`), the tag-presence flags `capacityTagged`/`coveredTagged`/`feeTagged`, and `checkDate` (newest of `check_date:capacity`/`check_date`/`survey:date`/`lastcheck`). The presence flags matter because missing tags have silent defaults (capacity 0, covered false) that are otherwise indistinguishable from real values.
- Geometry helpers (`pointInPolygon`, `polygonAreaKm2`) live in [geoUtils.ts](src/lib/geoUtils.ts); shared numeric/collection helpers in [math.ts](src/lib/math.ts) + [collections.ts](src/lib/collections.ts). `buildRegionInfos` merges region reference data: the Karlsruhe districts use authoritative population/area from [karlsruhe-districts.ts](src/data/karlsruhe-districts.ts); AL9 districts that AL10 children fully tile are excluded via `isSubdivided` (grid-samples the interior — Wettersbach is exactly Grünwettersbach + Palmbach and would otherwise be an empty region double-counting its population); surrounding municipalities use the `population` tag on the boundary and an area computed from geometry. That tag is no longer OSM's: OSM carried a population for only 6 of the 32 Gemeinden, and rounded ones at that, so `enrichMunicipalityPopulations` in the fetch script joins each AL8 boundary's `wikidata` tag against Wikidata P1082 and writes the official figure (plus `population:date`, `source:population`) into the committed GeoJSON. A Wikidata outage is non-fatal — the previous file's values stay. Regions without population show counts but no per-capita rating (`rating: "unrated"`).
- `bicycle_parking` values → German labels via `parkingTypeLabel`; the same labels drive `SECURE_TYPES` ([labels.ts](src/lib/osm/labels.ts)). Site-wide aggregations in [analytics.ts](src/lib/osm/analytics.ts): `generateTypeStats`, `generateTopFacilities` (largest facilities — surfaces transit hubs), `generateOverviewStats`, `generateComparison`, `generateCoverageComparison`.

### The /analyse metrics ([regionMetrics.ts](src/lib/osm/regionMetrics.ts))

Regions are not directly comparable, and two devices in this module keep them honest — both are load-bearing, not cosmetic:

- **Peer groups** ([peerGroups.ts](src/lib/osm/peerGroups.ts)). `peerGroupOf` splits regions into `stadt` (AL9/AL10) and `umland` (AL8) — the administrative line, which is the division readers already have and rests on a hard fact rather than on thresholds. A finer split by settlement type (density/size/distance, which would have put Karlsruhe's village districts with the Umland villages) was built and dropped: the extra groups cost more explaining than they were worth. `buildPeerGroups` gives the by-name lookup that the quality/B+R/completeness analyses need, since those see only parkings. Ranking and rating happen only within a group; the page's chip filter selects one.
- `rateWithinGroup` rates against the **peer-group median**, not a fixed target (absolute ADFC-style targets are city-wide figures that break down at district level). ≥1,25× → `good`, ≤0,6× → `poor`. The baseline is floored at `MIN_RATING_BASELINE` (5 spaces per 1.000 residents, exposed as `ratingBaseline`): the villages' median is 0,7, and a ratio against that badged Palmbach's five spaces as `good`.
- `medianNearestNeighbourM` replaces "pro km²": the median distance from a facility to its nearest neighbour is unaffected by the forest and farmland that dominate the outer districts.
- `sparselyMapped` flags regions with <5 facilities or <80 % `capacity` tagging — the difference between poorly supplied and poorly mapped. Shown as `*` in the supply table.
- `generateQualityAnalysis` reports plain shares (überdacht / abschließbar / beleuchtet / kostenpflichtig) instead of the former composite 1–10 score, which mixed type weights, coverage and fees into an untraceable number. `litPercent` is taken over the **tagged subset only** (~a quarter of features carry `lit`), with the coverage itself in the completeness view.
- `generateBikeRideAnalysis` aggregates B+R **by region**, because almost no bicycle-parking feature here carries a `name` tag; a region's B+R sum is in practice the station in it.
- `generateCompletenessAnalysis` is the caveat behind every other table: per-region tag coverage plus survey freshness, sorted worst-first so it doubles as a mapping to-do list.

### Progress tracking and CI

[osmHistoryMapper.ts](src/lib/osmHistoryMapper.ts) appends a dated aggregate snapshot to `osm-history.json` (repo root) as a build-time side effect, throttled to at most one row per calendar month — builds in between leave the file untouched, and a rebuild on a day that already has a row refreshes it. This matches the monthly cadence of the ohsome backfill. This is the data behind the `/progress` chart and grows ~one point per month, in step with the scheduled run on the 1st. Both the snapshot and `scripts/backfill-history.mjs` measure the **AL8+AL9+AL10 boundary union** (Stadt + Landkreis Karlsruhe), matching what `parseOsmBikeParking` keeps — the backfill passes it as `bpolys`. If that scope ever changes again, the whole series has to be regenerated with `node scripts/backfill-history.mjs --force` or the chart gets a step (rows with `source: "build"` are protected from overwriting).

The deploy workflow fetches OSM data, **then builds** (which writes `osm-history.json`), **then commits** `data/*.geojson` + `osm-history.json`. The commit runs **only** on `schedule`/`workflow_dispatch` — keeping a versioned history and giving scheduled runs the repository activity that prevents auto-disable after 60 idle days (a push already counts, and committing on push could loop).

### Pages, models, components

- Pages: `/` (KPIs + map + largest-facilities), `/analyse` (Versorgung/Qualität/Bike+Ride/Datenqualität tabs, plus a peer-group chip filter that applies across all four), `/vergleich` (OSM vs. Stadt Karlsruhe), `/progress` (history chart), `/about`.
- The maps are **MapLibre GL JS** (vector tiles from the OpenFreeMap `liberty` style), in [ParkingMapInner.tsx](src/components/ParkingMapInner.tsx) and [TopFacilitiesMapInner.tsx](src/components/TopFacilitiesMapInner.tsx), each loaded through a thin `dynamic(..., { ssr: false })` wrapper (MapLibre needs `window`). Everything both maps share lives in [src/lib/map/](src/lib/map/): [maplibre.ts](src/lib/map/maplibre.ts) holds the style URL, view constants, canvas colours (duplicated from the CSS tokens — MapLibre paints on a canvas and can't read custom properties) and the `ensurePointSource` / `bindPointPopup` / `bindClusterZoom` / `escapeHtml` + `popupHtml` helpers; [useMapLibre.ts](src/lib/map/useMapLibre.ts) builds the base map from a **callback ref** and hands it back only after `style.load`, so a component may render a loading state for as long as it likes before the container mounts. Points are rendered as GeoJSON-source circle layers (clustered on the home map) — no marker DOM and no image assets, so nothing breaks under the GitHub Pages basePath.
- TypeScript interfaces in [src/models/](src/models/); import via the `@/*` alias. The UI is built on the **KERN UX** design system (`@kern-ux/native`, imported in [\_app.tsx](src/pages/_app.tsx)); app-specific styles and KERN-token overrides (e.g. green primary via `--kern-color-action-default`) live in [globals.css](src/styles/globals.css). Charts use Recharts. [DataTable.tsx](src/components/DataTable.tsx) is the generic sortable table (typed over its row shape, so column keys are checked against the data; supports a `bar` column type that draws a proportional in-cell fill); [StatCard.tsx](src/components/StatCard.tsx) exports `StatCard` + `RatingBadge`.
