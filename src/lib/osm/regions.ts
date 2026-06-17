import { RegionInfo } from "@/models/region";
import { districtLookup } from "@/data/karlsruhe-districts";
import { DistrictFeature } from "../osmDataFetcher";
import { pointInPolygon, polygonAreaKm2 } from "../geoUtils";

export type RegionLevel = 8 | 9 | 10;
export type RegionLevelOrNone = RegionLevel | 0;

// Admin levels that form the mutually-exclusive region partition:
// AL10 (Stadtbezirk) > AL9 (Stadtteil) tile Karlsruhe city; AL8 (surrounding
// Gemeinde) is disjoint from it. Priority order matters for assignment.
const ASSIGNMENT_LEVELS: readonly RegionLevel[] = [10, 9, 8];

/**
 * Build the merged region reference table: the 28 Karlsruhe districts use the
 * authoritative census data in `districtLookup`; surrounding municipalities use
 * the OSM population tag (where present) and an area computed from geometry.
 */
export function buildRegionInfos(districts: DistrictFeature[]): RegionInfo[] {
  return districts
    .filter((d): d is DistrictFeature & { adminLevel: RegionLevel } =>
      ASSIGNMENT_LEVELS.includes(d.adminLevel as RegionLevel),
    )
    .map((d) => {
      const override = districtLookup.get(d.name);
      return {
        name: d.name,
        adminLevel: d.adminLevel,
        population: override?.population ?? d.population ?? null,
        areaKm2: override?.areaKm2 ?? polygonAreaKm2(d.polygons),
      };
    });
}

/**
 * Assign a point to one region by point-in-polygon test, honouring the
 * AL10 > AL9 > AL8 priority. Returns `{ region: "", regionLevel: 0 }` when the
 * point lies outside every known boundary.
 */
export function findContainingRegion(
  lon: number,
  lat: number,
  districts: DistrictFeature[],
): { region: string; regionLevel: RegionLevelOrNone } {
  for (const level of ASSIGNMENT_LEVELS) {
    for (const d of districts) {
      if (d.adminLevel !== level) continue;
      for (const polygon of d.polygons) {
        if (pointInPolygon(lon, lat, polygon)) {
          return { region: d.name, regionLevel: level };
        }
      }
    }
  }
  return { region: "", regionLevel: 0 };
}
