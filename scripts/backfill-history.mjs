// Backfills osm-history.json with measured historical aggregates from the
// ohsome API (full-history OSM). Both series are reconstructed so they line up
// with what the build-time snapshot in src/lib/osmHistoryMapper.ts records:
//
//   totalFacilities — every non-private point in the Overpass bbox. The app
//     keeps points that fall outside all boundaries (region ""), so the bbox,
//     not the boundary union, is the matching area for this series.
//   cityFacilities  — points inside the AL9+AL10 districts, queried via a
//     bpolys polygon rather than a bounding box (a rectangle around the city
//     overshoots by ~11%, pulling in Rheinstetten/Stutensee edges).
//   *Capacity       — real sums, via count/groupBy/tag on `capacity`:
//     Σ (capacity value × count). Untagged features count as 0, same as the
//     `capacity` default in src/lib/osm/parse.ts.
//
// Usage: node scripts/backfill-history.mjs [--from 2014-01-01] [--to <date>]
//                                          [--interval P1M] [--force]

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HISTORY_PATH = path.join(__dirname, "..", "osm-history.json");
const STADTTEILE_PATH = path.join(
  __dirname,
  "..",
  "data",
  "karlsruhe-stadtteile.geojson",
);

const OHSOME_BASE = "https://api.ohsome.org/v1";
// Same bbox as scripts/fetch-osm-data.mjs (lon/lat order for ohsome).
const FULL_BBOX = "8.0,48.7,9.0,49.3";
// Mirrors the access filter in parseOsmBikeParking.
const FILTER =
  "amenity=bicycle_parking and access!=private and access!=no and access!=restricted";

const DEFAULTS = { from: "2014-01-01", to: undefined, interval: "P1M" };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseArgs(argv) {
  const args = { ...DEFAULTS, force: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--force") {
      args.force = true;
    } else if (arg === "--from" || arg === "--to" || arg === "--interval") {
      const value = argv[++i];
      if (!value) throw new Error(`Missing value for ${arg}`);
      args[arg.slice(2)] = value;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

/** Latest date ohsome has full-history data for; querying beyond it 404s. */
async function fetchDataCutoff() {
  const response = await fetch(`${OHSOME_BASE}/metadata`, {
    headers: { "User-Agent": "bike-parking-karlsruhe/1.0" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`Metadata request failed: ${response.status}`);
  }
  const data = await response.json();
  const to = data?.extractRegion?.temporalExtent?.toTimestamp;
  if (!to)
    throw new Error("Metadata response lacks temporalExtent.toTimestamp");
  return to.split("T")[0];
}

/** One Feature holding all AL9+AL10 districts; they are disjoint, so the union counts each point once. */
function cityPolygons() {
  const geojson = JSON.parse(fs.readFileSync(STADTTEILE_PATH, "utf8"));
  const polygons = geojson.features
    .filter((f) => {
      const al = String(f.properties?.admin_level);
      return al === "9" || al === "10";
    })
    .flatMap((f) =>
      f.geometry.type === "MultiPolygon"
        ? f.geometry.coordinates
        : [f.geometry.coordinates],
    );

  if (polygons.length === 0) {
    throw new Error(`No AL9/AL10 features in ${STADTTEILE_PATH}`);
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { id: "karlsruhe-city" },
        geometry: { type: "MultiPolygon", coordinates: polygons },
      },
    ],
  };
}

/**
 * POSTs a form-encoded ohsome request. Retries transient failures only —
 * a 4xx other than 429 means the request itself is wrong, so retrying it
 * just burns time and hides the server's explanation.
 */
async function ohsomePost(endpoint, params, retries = 3) {
  const url = `${OHSOME_BASE}${endpoint}`;
  const body = new URLSearchParams({ filter: FILTER, ...params });
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "bike-parking-karlsruhe/1.0",
        },
        body,
        signal: AbortSignal.timeout(180_000),
      });
      if (!response.ok) {
        const text = await response.text();
        const error = new Error(
          `${response.status} from ${endpoint}: ${text.slice(0, 300)}`,
        );
        if (
          response.status >= 400 &&
          response.status < 500 &&
          response.status !== 429
        ) {
          throw Object.assign(error, { fatal: true });
        }
        throw error;
      }
      return await response.json();
    } catch (err) {
      if (err.fatal) throw err;
      lastError = err;
      console.warn(`  Attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt < retries) await sleep(3000 * attempt);
    }
  }
  throw new Error(`All ${retries} attempts failed for ${endpoint}`, {
    cause: lastError,
  });
}

/** date (YYYY-MM-DD) → facility count. */
async function fetchCounts(area, time) {
  const data = await ohsomePost("/elements/count", { ...area, time });
  if (!Array.isArray(data?.result)) {
    throw new Error("Unexpected count response: " + JSON.stringify(data));
  }
  return new Map(
    data.result.map((r) => [r.timestamp.split("T")[0], Math.round(r.value)]),
  );
}

/**
 * date (YYYY-MM-DD) → Σ capacity, reconstructed from per-tag-value counts.
 * Non-numeric values (e.g. "10;20") and the untagged remainder contribute 0,
 * matching how parse.ts falls back to 0.
 */
async function fetchCapacities(area, time) {
  const data = await ohsomePost("/elements/count/groupBy/tag", {
    ...area,
    time,
    groupByKey: "capacity",
  });
  if (!Array.isArray(data?.groupByResult)) {
    throw new Error("Unexpected groupBy response: " + JSON.stringify(data));
  }

  const sums = new Map();
  let skippedGroups = 0;

  for (const group of data.groupByResult) {
    const match = /^capacity=(.+)$/.exec(String(group.groupByObject));
    const capacity = match ? Number(match[1]) : NaN;
    if (!Number.isFinite(capacity)) {
      if (match) skippedGroups++;
      continue; // untagged remainder or a non-numeric value
    }
    for (const entry of group.result) {
      const date = entry.timestamp.split("T")[0];
      sums.set(date, (sums.get(date) ?? 0) + capacity * entry.value);
    }
  }

  if (skippedGroups > 0) {
    console.log(`  (ignored ${skippedGroups} non-numeric capacity values)`);
  }
  return new Map([...sums].map(([date, sum]) => [date, Math.round(sum)]));
}

function sortByKey(history) {
  return Object.fromEntries(
    Object.keys(history)
      .sort()
      .map((key) => [key, history[key]]),
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const history = fs.existsSync(HISTORY_PATH)
    ? JSON.parse(fs.readFileSync(HISTORY_PATH, "utf8"))
    : {};

  const cutoff = await fetchDataCutoff();
  const to = args.to && args.to < cutoff ? args.to : cutoff;
  if (args.to && args.to > cutoff) {
    console.warn(
      `--to ${args.to} is past the ohsome data cutoff; using ${cutoff}`,
    );
  }
  const time = `${args.from}/${to}/${args.interval}`;
  console.log(`Time range: ${time}`);
  console.log(`Filter: ${FILTER}`);

  const bbox = { bboxes: FULL_BBOX };
  const city = { bpolys: JSON.stringify(cityPolygons()) };

  console.log("\nFull region (bbox) — facilities...");
  const totalCounts = await fetchCounts(bbox, time);
  console.log(`  ${totalCounts.size} data points`);
  await sleep(1000);

  console.log("Full region (bbox) — capacity...");
  const totalCapacities = await fetchCapacities(bbox, time);
  await sleep(1000);

  console.log("City (AL9+AL10 polygons) — facilities...");
  const cityCounts = await fetchCounts(city, time);
  console.log(`  ${cityCounts.size} data points`);
  await sleep(1000);

  console.log("City (AL9+AL10 polygons) — capacity...");
  const cityCapacities = await fetchCapacities(city, time);

  let added = 0;
  let replaced = 0;
  let skipped = 0;
  let protectedCount = 0;

  for (const date of [...totalCounts.keys()].sort()) {
    const existing = history[date];
    if (existing) {
      if (!args.force) {
        skipped++;
        continue;
      }
      if (existing.source === "build") {
        // Never clobber a snapshot the build pipeline measured directly.
        protectedCount++;
        continue;
      }
    }

    history[date] = {
      date,
      totalFacilities: totalCounts.get(date),
      totalCapacity: totalCapacities.get(date) ?? 0,
      cityFacilities: cityCounts.get(date) ?? 0,
      cityCapacity: cityCapacities.get(date) ?? 0,
      source: "ohsome",
    };

    if (existing) replaced++;
    else added++;
  }

  fs.writeFileSync(
    HISTORY_PATH,
    JSON.stringify(sortByKey(history), null, 2) + "\n",
  );

  const first = [...totalCounts.keys()].sort()[0];
  const last = [...totalCounts.keys()].sort().at(-1);
  console.log(
    `\n${first} → ${last}: ${added} added, ${replaced} replaced, ` +
      `${skipped} left untouched (use --force to overwrite), ` +
      `${protectedCount} build snapshots protected.`,
  );
  console.log(`Total entries: ${Object.keys(history).length}`);
}

main().catch((err) => {
  console.error("Backfill failed:", err.message);
  if (err.cause) console.error("Caused by:", err.cause.message);
  process.exit(1);
});
