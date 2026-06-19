import path from "path";
import { MAP_DATA_URL } from "@/models/map-parking";

export const JSON_URL =
  "https://mobil.trk.de/geoserver/TBA/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=TBA%3Afahrradanlagen&outputFormat=application%2Fjson";

export const FETCH_TIMEOUT = 10000;

export const OSM_DATA_PATH = path.join(
  process.cwd(),
  "data",
  "osm-bike-parking.geojson",
);
export const OSM_STADTTEILE_PATH = path.join(
  process.cwd(),
  "data",
  "karlsruhe-stadtteile.geojson",
);
export const OSM_HISTORY_PATH = path.join(process.cwd(), "osm-history.json");

// Slimmed parking points emitted at build time and fetched by the client map.
// Lives under public/ so the static export copies it into out/.
export const MAP_DATA_PATH = path.join(process.cwd(), "public", MAP_DATA_URL);
