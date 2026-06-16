import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const BBOX = "48.7,8.0,49.5,9.0";

async function fetchOverpass(query, timeoutMs = 120_000) {
  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "bike-parking-karlsruhe/1.0" },
    body: query,
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function overpassBikeParkingToGeoJSON(osmJson) {
  const features = (osmJson.elements || [])
    .filter((el) => el.type === "node" || el.type === "way")
    .map((el) => {
      let lon, lat;

      if (el.type === "node") {
        lon = el.lon;
        lat = el.lat;
      } else if (el.center) {
        lon = el.center.lon;
        lat = el.center.lat;
      } else {
        return null;
      }

      return {
        type: "Feature",
        id: el.id,
        geometry: {
          type: "Point",
          coordinates: [lon, lat],
        },
        properties: el.tags || {},
      };
    })
    .filter((f) => f !== null);

  return {
    type: "FeatureCollection",
    features,
  };
}

function assembleRings(segments) {
  if (segments.length === 0) return [];
  const items = segments.map((g) => g.map((p) => [p.lon, p.lat]));
  const used = new Array(items.length).fill(false);
  const rings = [];

  while (true) {
    const start = used.findIndex((u) => !u);
    if (start === -1) break;

    let ring = [...items[start]];
    used[start] = true;

    let grew = true;
    while (grew) {
      grew = false;
      for (let i = 0; i < items.length; i++) {
        if (used[i]) continue;
        const seg = items[i];
        const rf = ring[0];
        const rl = ring[ring.length - 1];
        const sf = seg[0];
        const sl = seg[seg.length - 1];

        if (rl[0] === sf[0] && rl[1] === sf[1]) {
          ring = ring.concat(seg.slice(1));
          used[i] = true;
          grew = true;
          break;
        }
        if (rl[0] === sl[0] && rl[1] === sl[1]) {
          ring = ring.concat(seg.slice(0, -1).reverse());
          used[i] = true;
          grew = true;
          break;
        }
        if (rf[0] === sl[0] && rf[1] === sl[1]) {
          ring = seg.concat(ring.slice(1));
          used[i] = true;
          grew = true;
          break;
        }
        if (rf[0] === sf[0] && rf[1] === sf[1]) {
          ring = seg.slice(0, -1).reverse().concat(ring);
          used[i] = true;
          grew = true;
          break;
        }
      }
    }

    if (ring.length > 0) {
      const rf = ring[0];
      const rl = ring[ring.length - 1];
      if (rf[0] !== rl[0] || rf[1] !== rl[1]) {
        ring.push([...rf]);
      }
    }

    rings.push(ring);
  }

  return rings;
}

function overpassBoundariesToGeoJSON(osmJson) {
  const features = (osmJson.elements || [])
    .filter((el) => el.type === "relation" || el.type === "way")
    .map((el) => {
      const tags = el.tags || {};
      let coordinates;

      if (el.type === "relation" && el.members) {
        const outerSegments = [];
        const innerSegments = [];

        for (const m of el.members) {
          if (m.type === "way" && m.geometry) {
            if (m.role === "inner") {
              innerSegments.push(m.geometry);
            } else {
              outerSegments.push(m.geometry);
            }
          }
        }

        if (outerSegments.length === 0) return null;

        const outerRings = assembleRings(outerSegments);
        const innerRings = assembleRings(innerSegments);

        coordinates = outerRings.map((outerRing) => [outerRing, ...innerRings]);
      } else if (el.type === "way" && el.geometry) {
        const ring = el.geometry.map((p) => [p.lon, p.lat]);
        const rf = ring[0];
        const rl = ring[ring.length - 1];
        if (rf[0] !== rl[0] || rf[1] !== rl[1]) ring.push([...rf]);
        coordinates = [[ring]];
      } else {
        return null;
      }

      return {
        type: "Feature",
        id: el.id,
        geometry: {
          type: "MultiPolygon",
          coordinates,
        },
        properties: tags,
      };
    })
    .filter((f) => f !== null);

  return {
    type: "FeatureCollection",
    features,
  };
}

async function main() {
  console.log("Fetching OSM bike parking data in bounding box:", BBOX);

  const bikeParkingQuery = `[out:json][timeout:120];(node["amenity"="bicycle_parking"](${BBOX});way["amenity"="bicycle_parking"](${BBOX}););out center;`;

  const stadtteilQuery = `[out:json][timeout:120];area["name"="Karlsruhe"]["admin_level"="6"]->.karlsruhe;(rel(area.karlsruhe)["admin_level"="9"]["boundary"="administrative"];rel(area.karlsruhe)["admin_level"="10"]["boundary"="administrative"];);out geom;`;

  try {
    console.log("Fetching bike parking data...");
    const bikeParkingRaw = await fetchOverpass(bikeParkingQuery, 180_000);
    console.log(`Got ${bikeParkingRaw.elements?.length || 0} bike parking elements`);

    console.log("Fetching district boundaries...");
    const stadtteilRaw = await fetchOverpass(stadtteilQuery, 180_000);
    console.log(`Got ${stadtteilRaw.elements?.length || 0} boundary elements`);

    const bikeParkingGeoJSON = overpassBikeParkingToGeoJSON(bikeParkingRaw);
    const stadtteilGeoJSON = overpassBoundariesToGeoJSON(stadtteilRaw);

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const bikeParkingPath = path.join(DATA_DIR, "osm-bike-parking.geojson");
    fs.writeFileSync(bikeParkingPath, JSON.stringify(bikeParkingGeoJSON, null, 2));
    console.log(`Saved ${bikeParkingGeoJSON.features.length} bike parking spots`);

    const stadtteilPath = path.join(DATA_DIR, "karlsruhe-stadtteile.geojson");
    fs.writeFileSync(stadtteilPath, JSON.stringify(stadtteilGeoJSON, null, 2));
    console.log(`Saved ${stadtteilGeoJSON.features.length} district boundaries`);

    console.log("Done!");
  } catch (error) {
    console.error("Failed to fetch OSM data:", error.message);
    process.exit(1);
  }
}

main();
