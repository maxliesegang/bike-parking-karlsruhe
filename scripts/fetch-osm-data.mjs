import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
// The main Overpass instance frequently returns 504 under load, so we fall
// back across mirrors and retry a few times before giving up.
const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

// Both queries below are scoped to these two admin_level 6 areas: Karlsruhe is
// a kreisfreie Stadt (its own AL6) and "Landkreis Karlsruhe" is a separate AL6
// around it. Together they are exactly the study area.
const AREAS = `area["name"="Karlsruhe"]["admin_level"="6"]["boundary"="administrative"]->.city;area["name"="Landkreis Karlsruhe"]["admin_level"="6"]["boundary"="administrative"]->.kreis;`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchOverpass(query, timeoutMs = 120_000, attempts = 3) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    for (const url of OVERPASS_URLS) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "bike-parking-karlsruhe/1.0",
          },
          body: query,
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!response.ok) {
          throw new Error(
            `Overpass API error: ${response.status} ${response.statusText}`,
          );
        }
        return await response.json();
      } catch (error) {
        lastError = error;
        console.warn(`  Overpass attempt failed (${url}): ${error.message}`);
      }
    }
    if (attempt < attempts - 1) await sleep(5_000 * (attempt + 1));
  }
  throw lastError;
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

const WIKIDATA_SPARQL = "https://query.wikidata.org/sparql";

/**
 * Fill in the `population` tag of the surrounding municipalities from Wikidata.
 *
 * OSM itself carries a population for only 6 of the 32 Gemeinden, and those it
 * has are rounded guesses ("18500", "15000"). Everything downstream that needs
 * residents — the per-capita supply figures and the settlement-type peer groups
 * on /analyse — was therefore unavailable for 26 of them. Wikidata has all 32
 * with the official Statistisches Landesamt figure and its reference date, and
 * every AL8 boundary here carries a `wikidata` tag to join on.
 *
 * Karlsruhe's own districts are not touched: they use the authoritative city
 * figures in src/data/karlsruhe-districts.ts.
 *
 * Failure is non-fatal — the boundaries are still worth writing, and the
 * previous file's populations stay in place until the next successful run.
 */
async function enrichMunicipalityPopulations(boundaries) {
  const targets = boundaries.features.filter(
    (f) => f.properties.admin_level === "8" && f.properties.wikidata,
  );
  if (targets.length === 0) return;

  const values = targets.map((f) => `wd:${f.properties.wikidata}`).join(" ");
  const query = `SELECT ?item ?pop ?date WHERE { VALUES ?item { ${values} } ?item p:P1082 ?st. ?st ps:P1082 ?pop. OPTIONAL { ?st pq:P585 ?date. } }`;

  let bindings;
  try {
    const response = await fetch(
      `${WIKIDATA_SPARQL}?format=json&query=${encodeURIComponent(query)}`,
      {
        headers: { "User-Agent": "bike-parking-karlsruhe/1.0" },
        signal: AbortSignal.timeout(60_000),
      },
    );
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    bindings = (await response.json()).results.bindings;
  } catch (error) {
    console.warn(`  Wikidata population lookup failed: ${error.message}`);
    console.warn("  Keeping the population tags as they came from OSM.");
    return;
  }

  // Keep the most recent statement per municipality; Wikidata holds a full
  // historical series for most of them.
  const newest = new Map();
  for (const b of bindings) {
    const id = b.item.value.split("/").pop();
    const date = b.date?.value ?? "";
    const previous = newest.get(id);
    if (!previous || date > previous.date) {
      newest.set(id, { population: Math.round(Number(b.pop.value)), date });
    }
  }

  let updated = 0;
  for (const f of targets) {
    const hit = newest.get(f.properties.wikidata);
    if (!hit) continue;
    f.properties.population = String(hit.population);
    f.properties["source:population"] = "Wikidata (P1082)";
    if (hit.date) f.properties["population:date"] = hit.date.slice(0, 10);
    updated++;
  }
  console.log(
    `Filled in population for ${updated} of ${targets.length} municipalities from Wikidata`,
  );
}

async function main() {
  console.log("Fetching OSM bike parking data in Stadt + Landkreis Karlsruhe");

  // Scoped to the administrative areas rather than a bounding box. A rectangle
  // around the Landkreis overshoots into Rheinland-Pfalz, Rastatt and the
  // Enzkreis; those points belong to no region here and were dropped again in
  // parseOsmBikeParking, after being downloaded and committed. Asking Overpass
  // for the right area instead cuts ~37% of the elements.
  const bikeParkingQuery = `[out:json][timeout:180];${AREAS}(node["amenity"="bicycle_parking"](area.city);way["amenity"="bicycle_parking"](area.city);node["amenity"="bicycle_parking"](area.kreis);way["amenity"="bicycle_parking"](area.kreis););out center;`;

  // Boundaries for clustering, from the same two areas: Karlsruhe city's
  // admin_level 9 + 10 districts tile the city, and the Landkreis contains the
  // admin_level 8 municipalities. Drawing AL8 only from the Landkreis area
  // avoids fetching Karlsruhe-city's own AL8 polygon (which would overlap the
  // AL9/10 tiling). The result file holds AL8 (surrounding) + AL9/10 (city).
  const stadtteilQuery = `[out:json][timeout:180];${AREAS}(rel(area.city)["admin_level"="9"]["boundary"="administrative"];rel(area.city)["admin_level"="10"]["boundary"="administrative"];rel(area.kreis)["admin_level"="8"]["boundary"="administrative"];);out geom;`;

  try {
    console.log("Fetching bike parking data...");
    const bikeParkingRaw = await fetchOverpass(bikeParkingQuery, 180_000);
    console.log(
      `Got ${bikeParkingRaw.elements?.length || 0} bike parking elements`,
    );

    console.log("Fetching district boundaries...");
    const stadtteilRaw = await fetchOverpass(stadtteilQuery, 180_000);
    console.log(`Got ${stadtteilRaw.elements?.length || 0} boundary elements`);

    const bikeParkingGeoJSON = overpassBikeParkingToGeoJSON(bikeParkingRaw);
    const stadtteilGeoJSON = overpassBoundariesToGeoJSON(stadtteilRaw);
    await enrichMunicipalityPopulations(stadtteilGeoJSON);

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const bikeParkingPath = path.join(DATA_DIR, "osm-bike-parking.geojson");
    fs.writeFileSync(
      bikeParkingPath,
      JSON.stringify(bikeParkingGeoJSON, null, 2),
    );
    console.log(
      `Saved ${bikeParkingGeoJSON.features.length} bike parking spots`,
    );

    const stadtteilPath = path.join(DATA_DIR, "karlsruhe-stadtteile.geojson");
    fs.writeFileSync(stadtteilPath, JSON.stringify(stadtteilGeoJSON, null, 2));
    console.log(
      `Saved ${stadtteilGeoJSON.features.length} district boundaries`,
    );

    console.log("Done!");
  } catch (error) {
    console.error("Failed to fetch OSM data:", error.message);
    process.exit(1);
  }
}

main();
