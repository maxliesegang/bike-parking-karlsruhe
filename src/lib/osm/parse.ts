import { FeatureCollection, Feature, Point } from "geojson";
import { OsmBikeParking } from "@/models/osm-bike-parking";
import { DistrictFeature } from "../osmDataFetcher";
import { parkingTypeLabel, PRIVATE_ACCESS } from "./labels";
import { findContainingRegion } from "./regions";

const COORD_PRECISION = 1e5; // ~1m, keeps the emitted point set small.

function isTrue(value: string | undefined): boolean {
  return value === "yes" || value === "true";
}

/** Most recent survey date across the tags mappers use for it. */
function surveyDate(tags: Record<string, string>): string {
  const dates = [
    tags["check_date:capacity"],
    tags.check_date,
    tags["survey:date"],
    tags.lastcheck,
  ].filter((d): d is string => Boolean(d));
  return dates.sort().pop() ?? "";
}

/**
 * Turn the raw OSM bicycle-parking GeoJSON into our flat model: drops features
 * without a point, drops non-public parking (private/no/restricted access),
 * assigns each remaining point to a region, and drops what falls outside every
 * boundary.
 *
 * scripts/fetch-osm-data.mjs already scopes its query to Stadt + Landkreis
 * Karlsruhe, so this drops little in practice. It stays as a guard: the points
 * and the boundaries come from two separate Overpass queries, and Overpass's
 * area test and our ray casting can disagree on a point sitting exactly on a
 * border. Anything that lands in no region has no place in a per-region
 * analysis, and silently summing it into the "gesamt" figures is how the site
 * previously ended up counting parking in Rheinland-Pfalz.
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
      if (regionLevel === 0) return null;

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
        bikeRide: Boolean(tags.bike_ride) && tags.bike_ride !== "no",
        lit: isTrue(tags.lit) || tags.lit === "automatic",
        litTagged: tags.lit !== undefined,
        capacityTagged: tags.capacity !== undefined,
        coveredTagged: tags.covered !== undefined,
        feeTagged: tags.fee !== undefined,
        checkDate: surveyDate(tags),
      };
    })
    .filter((p): p is OsmBikeParking => p !== null);
}
