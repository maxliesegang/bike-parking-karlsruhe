import { OsmBikeParking } from "@/models/osm-bike-parking";
import { loadOsmBikeParkingData, loadStadtteilBoundaries, dataFilesExist } from "./osmDataFetcher";
import { processOsmBikeParkingData } from "./osmDataProcessor";

let cachedOsmBikeParkings: OsmBikeParking[] | null = null;

export async function getOsmBikeParkings(): Promise<OsmBikeParking[]> {
  if (cachedOsmBikeParkings === null) {
    if (!dataFilesExist()) {
      cachedOsmBikeParkings = [];
      return cachedOsmBikeParkings;
    }

    const rawBikeParkingData = loadOsmBikeParkingData();
    const stadtteilData = loadStadtteilBoundaries();
    cachedOsmBikeParkings = processOsmBikeParkingData(
      rawBikeParkingData,
      stadtteilData,
    );
  }
  return cachedOsmBikeParkings;
}
