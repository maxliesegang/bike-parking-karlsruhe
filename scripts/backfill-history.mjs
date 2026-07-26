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

const OHSOME_URL = "https://api.ohsome.org/v1/elements/count";
const FULL_BBOX = "8.0,48.7,9.0,49.3";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function computeCityBbox() {
  if (!fs.existsSync(STADTTEILE_PATH)) {
    console.warn(
      "No stadtteile GeoJSON found — falling back to approximate city bbox",
    );
    return "8.28,48.94,8.54,49.09";
  }
  const geojson = JSON.parse(fs.readFileSync(STADTTEILE_PATH, "utf8"));
  const cityFeatures = geojson.features.filter((f) => {
    const al = f.properties?.admin_level;
    return al === "9" || al === "10" || al === 9 || al === 10;
  });

  let minLon = Infinity,
    minLat = Infinity,
    maxLon = -Infinity,
    maxLat = -Infinity;

  for (const feature of cityFeatures) {
    const coords = flattenCoords(feature.geometry);
    for (const [lon, lat] of coords) {
      if (lon < minLon) minLon = lon;
      if (lat < minLat) minLat = lat;
      if (lon > maxLon) maxLon = lon;
      if (lat > maxLat) maxLat = lat;
    }
  }

  return `${minLon},${minLat},${maxLon},${maxLat}`;
}

function flattenCoords(geometry) {
  switch (geometry.type) {
    case "Point":
      return [geometry.coordinates];
    case "MultiPoint":
    case "LineString":
      return geometry.coordinates;
    case "MultiLineString":
    case "Polygon":
      return geometry.coordinates.flat();
    case "MultiPolygon":
      return geometry.coordinates.flat(2);
    default:
      return [];
  }
}

function latestAvgCapacity() {
  if (!fs.existsSync(HISTORY_PATH)) return 0;
  const history = JSON.parse(fs.readFileSync(HISTORY_PATH, "utf8"));
  const snapshots = Object.values(history);
  if (snapshots.length === 0) return 0;

  snapshots.sort((a, b) => b.date.localeCompare(a.date));

  const latest = snapshots.find(
    (s) => s.cityCapacity !== undefined && s.cityFacilities > 0,
  );
  if (!latest) return 0;

  return latest.cityCapacity / latest.cityFacilities;
}

async function queryOhsome(bbox, timeRange, retries = 3) {
  const params = new URLSearchParams({
    bboxes: bbox,
    filter: "amenity=bicycle_parking",
    time: timeRange,
  });
  const url = `${OHSOME_URL}?${params}`;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "bike-parking-karlsruhe/1.0" },
        signal: AbortSignal.timeout(60_000),
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`${response.status}: ${body.slice(0, 200)}`);
      }
      const data = await response.json();
      if (!Array.isArray(data?.result)) {
        throw new Error("Unexpected response format: " + JSON.stringify(data));
      }
      return data.result;
    } catch (err) {
      console.warn(
        `  Attempt ${attempt + 1}/${retries} failed: ${err.message}`,
      );
      if (attempt < retries - 1) {
        await sleep(3000 * (attempt + 1));
      }
    }
  }
  throw new Error(`All queries failed for bbox=${bbox}`);
}

async function main() {
  let history = {};
  if (fs.existsSync(HISTORY_PATH)) {
    history = JSON.parse(fs.readFileSync(HISTORY_PATH, "utf8"));
  }

  const avgCap = latestAvgCapacity();
  console.log(`Latest avg capacity per facility (city): ${avgCap.toFixed(1)}`);

  const cityBbox = computeCityBbox();
  console.log(`City bbox (AL9+AL10): ${cityBbox}`);
  console.log(`Full region bbox: ${FULL_BBOX}`);

  const timeRange = "2014-01-01/2025-01-01/P1Y";

  console.log("\nQuerying ohsome for full region...");
  const fullResults = await queryOhsome(FULL_BBOX, timeRange);
  console.log(`  Got ${fullResults.length} data points`);

  await sleep(2000);

  console.log("Querying ohsome for city region...");
  const cityResults = await queryOhsome(cityBbox, timeRange);
  console.log(`  Got ${cityResults.length} data points`);

  let added = 0;
  for (const fullResult of fullResults) {
    const date = fullResult.timestamp.split("T")[0];
    if (history[date]) {
      console.log(`  Skipping ${date} (already in history)`);
      continue;
    }

    const totalFacilities = Math.round(fullResult.value);
    const cityResult = cityResults.find(
      (r) => r.timestamp === fullResult.timestamp,
    );
    const cityFacilities = cityResult ? Math.round(cityResult.value) : 0;
    const estCityCapacity =
      avgCap > 0 ? Math.round(cityFacilities * avgCap) : undefined;

    history[date] = {
      date,
      totalFacilities,
      totalCapacity:
        avgCap > 0 ? Math.round(totalFacilities * avgCap) : undefined,
      cityFacilities,
      ...(estCityCapacity !== undefined ? { cityCapacity: estCityCapacity } : {}),
    };

    console.log(
      `  ${date}: ${totalFacilities} total, ${cityFacilities} city` +
        (estCityCapacity !== undefined
          ? ` (est. ${estCityCapacity} city places)`
          : ""),
    );
    added++;
  }

  const sorted = Object.keys(history)
    .sort()
    .reduce((obj, key) => {
      obj[key] = history[key];
      return obj;
    }, {});

  fs.writeFileSync(HISTORY_PATH, JSON.stringify(sorted, null, 2) + "\n");
  console.log(
    `\nAdded ${added} historical snapshots. Total entries: ${Object.keys(history).length}`,
  );
}

main().catch((err) => {
  console.error("Backfill failed:", err.message);
  process.exit(1);
});
