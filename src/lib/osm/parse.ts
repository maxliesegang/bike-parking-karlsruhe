import { FeatureCollection, Feature, Point } from "geojson";
import { OsmBikeParking } from "@/models/osm-bike-parking";
import { DistrictFeature } from "../osmDataFetcher";
import { parkingTypeLabel, PRIVATE_ACCESS } from "./labels";
import { findContainingRegion } from "./regions";

const COORD_PRECISION = 1e5; // ~1m, keeps the emitted point set small.

function isTrue(value: string | undefined): boolean {
  return value === "yes" || value === "true";
}

/**
 * Turn the raw OSM bicycle-parking GeoJSON into our flat model: drops features
 * without a point, drops non-public parking (private/no/restricted access), and
 * assigns each remaining point to a region.
 */
export function parseOsmBikeParking(
  bikeParkingData: FeatureCollection,
  districts: DistrictFeature[],
): OsmBikeParking[] {
  return bikeParkingData.features
    .map((item): OsmBikeParking | null => {
      const feature = item as Feature<Point>;
      const coords = feature.geometry?.coordinates;
      if (!coords || coords.length < 2) return null;

      const props = feature.properties || {};
      const tags = (props.tags || props) as Record<string, string>;

      if (PRIVATE_ACCESS.has((tags.access || "").toLowerCase())) return null;

      const [lon, lat] = coords;
      const { region, regionLevel } = findContainingRegion(lon, lat, districts);
      const capacity = parseInt(tags.capacity || "0", 10);

      return {
        id: (feature.id as number) || 0,
        name: tags.name || tags.street || "",
        type: parkingTypeLabel(tags.bicycle_parking),
        capacity: isNaN(capacity) ? 0 : capacity,
        region,
        regionLevel,
        covered: isTrue(tags.covered),
        fee: isTrue(tags.fee),
        access: tags.access || "",
        operator: tags.operator || "",
        lng: Math.round(lon * COORD_PRECISION) / COORD_PRECISION,
        lat: Math.round(lat * COORD_PRECISION) / COORD_PRECISION,
        note: tags.note || tags.description || "",
      };
    })
    .filter((p): p is OsmBikeParking => p !== null);
}
