import fs from "fs";
import { FeatureCollection, Feature, Polygon, MultiPolygon } from "geojson";
import { OSM_DATA_PATH, OSM_STADTTEILE_PATH } from "./config";

export interface DistrictFeature {
  name: string;
  adminLevel: number;
  // Population from the OSM `population` tag where present, else null.
  population: number | null;
  polygons: number[][][][];
}

export function loadOsmBikeParkingData(): FeatureCollection {
  const data = JSON.parse(fs.readFileSync(OSM_DATA_PATH, "utf8"));
  if (data.type !== "FeatureCollection") {
    throw new Error(
      "Invalid OSM bike parking GeoJSON: expected FeatureCollection",
    );
  }
  return data as FeatureCollection;
}

function extractPolygonsFromOverpassElement(
  el: Record<string, unknown>,
): number[][][][] {
  const members = el.members as Array<Record<string, unknown>> | undefined;

  if (!members) return [];

  const outerRings: number[][][] = [];
  const innerRings: number[][][] = [];

  for (const m of members) {
    if (m.type === "way" && m.geometry) {
      const geom = m.geometry as Array<{ lat: number; lon: number }>;
      const ring = geom.map((p) => [p.lon, p.lat]);

      if (m.role === "inner") {
        innerRings.push(ring);
      } else {
        outerRings.push(ring);
      }
    }
  }

  if (outerRings.length === 0) return [];

  return [[outerRings[0], ...innerRings]];
}

export function loadStadtteilBoundaries(): DistrictFeature[] {
  const raw = fs.readFileSync(OSM_STADTTEILE_PATH, "utf8");
  const data = JSON.parse(raw);

  if (data.type === "FeatureCollection") {
    return data.features
      .filter((f: Feature<Polygon | MultiPolygon>) => f.geometry)
      .map((f: Feature<Polygon | MultiPolygon>) => {
        const props = f.properties || {};
        const coords =
          f.geometry.type === "MultiPolygon"
            ? f.geometry.coordinates
            : [f.geometry.coordinates];

        const pop = parseInt(props.population || "", 10);
        return {
          name: props.name || "Unknown",
          adminLevel: parseInt(props.admin_level || "0", 10),
          population: isNaN(pop) ? null : pop,
          polygons: coords,
        };
      });
  }

  if (data.elements) {
    return data.elements
      .filter(
        (el: { type: string }) => el.type === "relation" || el.type === "way",
      )
      .map((el: Record<string, unknown>) => {
        const tags = (el.tags || {}) as Record<string, string>;
        const pop = parseInt(tags.population || "", 10);
        return {
          name: tags.name || "Unknown",
          adminLevel: parseInt(tags.admin_level || "0", 10),
          population: isNaN(pop) ? null : pop,
          polygons: extractPolygonsFromOverpassElement(el),
        };
      })
      .filter((d: DistrictFeature) => d.polygons.length > 0);
  }

  return [];
}

/** Raw boundary FeatureCollection, as needed by the map choropleth layer. */
export function loadStadtteilGeoJSON(): FeatureCollection {
  const data = JSON.parse(fs.readFileSync(OSM_STADTTEILE_PATH, "utf8"));
  return data.type === "FeatureCollection"
    ? (data as FeatureCollection)
    : { type: "FeatureCollection", features: [] };
}

export function dataFilesExist(): boolean {
  return fs.existsSync(OSM_DATA_PATH) && fs.existsSync(OSM_STADTTEILE_PATH);
}
