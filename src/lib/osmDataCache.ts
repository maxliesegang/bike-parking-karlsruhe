import { FeatureCollection } from "geojson";
import { OsmBikeParking } from "@/models/osm-bike-parking";
import { RegionInfo } from "@/models/region";
import {
  loadOsmBikeParkingData,
  loadStadtteilBoundaries,
  loadStadtteilGeoJSON,
  dataFilesExist,
} from "./osmDataFetcher";
import { parseOsmBikeParking } from "./osm/parse";
import { buildRegionInfos } from "./osm/regions";
import { OsmHistoryManager, OsmSnapshot } from "./osmHistoryMapper";

export interface OsmData {
  parkings: OsmBikeParking[];
  regions: RegionInfo[];
  boundaries: FeatureCollection;
  history: OsmSnapshot[];
}

let cached: OsmData | null = null;

export function getOsmData(): OsmData {
  if (cached === null) {
    if (!dataFilesExist()) {
      cached = {
        parkings: [],
        regions: [],
        boundaries: { type: "FeatureCollection", features: [] },
        history: [],
      };
      return cached;
    }

    const rawBikeParkingData = loadOsmBikeParkingData();
    const stadtteilData = loadStadtteilBoundaries();
    const parkings = parseOsmBikeParking(rawBikeParkingData, stadtteilData);
    const regions = buildRegionInfos(stadtteilData);
    const history = new OsmHistoryManager().recordSnapshot(parkings);

    cached = {
      parkings,
      regions,
      boundaries: loadStadtteilGeoJSON(),
      history,
    };
  }
  return cached;
}
