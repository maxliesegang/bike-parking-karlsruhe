import path from "path";

export const JSON_URL =
  "https://mobil.trk.de/geoserver/TBA/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=TBA%3Afahrradanlagen&outputFormat=application%2Fjson";

export const FETCH_TIMEOUT = 10000;

export const OSM_DATA_PATH = path.join(process.cwd(), "data", "osm-bike-parking.geojson");
export const OSM_STADTTEILE_PATH = path.join(process.cwd(), "data", "karlsruhe-stadtteile.geojson");
export const OSM_HISTORY_PATH = path.join(process.cwd(), "osm-history.json");
