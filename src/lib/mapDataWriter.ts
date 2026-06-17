import fs from "fs";
import path from "path";
import { OsmBikeParking } from "@/models/osm-bike-parking";
import { MapParking } from "@/models/map-parking";
import { MAP_DATA_PATH } from "./config";

function toMapParking(p: OsmBikeParking): MapParking {
  return {
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
  fs.mkdirSync(path.dirname(MAP_DATA_PATH), { recursive: true });
  fs.writeFileSync(
    MAP_DATA_PATH,
    JSON.stringify(parkings.map(toMapParking)),
  );
}
