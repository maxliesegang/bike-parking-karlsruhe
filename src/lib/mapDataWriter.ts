import fs from "fs";
import path from "path";
import { FeatureCollection, MultiPolygon } from "geojson";
import { OsmBikeParking } from "@/models/osm-bike-parking";
import { MapParking } from "@/models/map-parking";
import { CoverageGrid } from "@/models/coverage";
import { RegionShapeProperties } from "@/models/region-shape";
import { SupplyEntry } from "./osm/regionMetrics";
import { DistrictFeature } from "./osmDataFetcher";
import { simplifyRing } from "./geoUtils";
import { SECURE_TYPES } from "./osm/labels";
import {
  COVERAGE_DATA_PATH,
  MAP_DATA_PATH,
  REGION_SHAPES_PATH,
} from "./config";

function equipmentOf(p: OsmBikeParking): MapParking["equipment"] {
  if (SECURE_TYPES.has(p.type)) return "secure";
  return p.covered ? "covered" : "simple";
}

function toMapParking(p: OsmBikeParking): MapParking {
  return {
    equipment: equipmentOf(p),
    lat: p.lat,
    lng: p.lng,
    name: p.name,
    type: p.type,
    capacity: p.capacity,
    region: p.region,
    covered: p.covered,
    fee: p.fee,
    access: p.access,
    operator: p.operator,
    note: p.note,
  };
}

/**
 * Build-time side effect: write the slimmed parking points the client map
 * fetches asynchronously, so the ~7.5k-point array no longer rides along in
 * the page's static props. Mirrors the side-effecting pattern of
 * OsmHistoryManager; the file lands under public/ for the static export.
 */
export function writeMapData(parkings: OsmBikeParking[]): void {
  writeJson(MAP_DATA_PATH, parkings.map(toMapParking));
}

/** Walking-distance raster for the „Erreichbarkeit“ map view. */
export function writeCoverageData(grid: CoverageGrid): void {
  writeJson(COVERAGE_DATA_PATH, grid);
}

/**
 * Simplification tolerance for the choropleth outlines, in degrees — roughly
 * 20 m. Below the width of the stroke that draws them at the zoom levels this
 * map ever reaches, and it takes the boundary file from ~450 kB of OSM node
 * density to a fraction of that.
 */
const SIMPLIFY_TOLERANCE_DEG = 0.0002;

/**
 * Region polygons carrying their supply figures, for the choropleth on
 * /analyse. Only regions the supply analysis actually reports are written —
 * `buildRegionInfos` drops AL9 districts that AL10 children fully tile, and a
 * polygon without a row behind it would paint a region the table denies exists.
 */
export function writeRegionShapes(
  supply: SupplyEntry[],
  districts: DistrictFeature[],
): void {
  const byName = new Map(supply.map((entry) => [entry.name, entry]));

  const features = districts
    .filter((d) => byName.has(d.name))
    .map((d) => {
      const e = byName.get(d.name) as SupplyEntry;
      const properties: RegionShapeProperties = {
        name: e.name,
        group: e.group,
        population: e.population,
        facilities: e.facilities,
        capacity: e.capacity,
        everydayPerThousand: e.everydayPerThousand,
        hubPercent: e.hubPercent,
        nearestMedianM: e.nearestMedianM,
        rating: e.rating,
        sparselyMapped: e.sparselyMapped,
      };

      const geometry: MultiPolygon = {
        type: "MultiPolygon",
        coordinates: d.polygons.map((polygon) =>
          polygon.map((ring) => simplifyRing(ring, SIMPLIFY_TOLERANCE_DEG)),
        ),
      };

      return { type: "Feature" as const, properties, geometry };
    });

  const collection: FeatureCollection<MultiPolygon, RegionShapeProperties> = {
    type: "FeatureCollection",
    features,
  };
  writeJson(REGION_SHAPES_PATH, collection);
}

function writeJson(target: string, data: unknown): void {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(data));
}
