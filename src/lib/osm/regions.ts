import { RegionInfo } from "@/models/region";
import { districtLookup } from "@/data/karlsruhe-districts";
import { DistrictFeature } from "../osmDataFetcher";
import {
  boundsOf,
  boundsOverlap,
  inAnyPolygon,
  pointInPolygon,
  polygonAreaKm2,
} from "../geoUtils";

export type RegionLevel = 8 | 9 | 10;
export type RegionLevelOrNone = RegionLevel | 0;

// Admin levels that form the mutually-exclusive region partition:
// AL10 (Stadtbezirk) > AL9 (Stadtteil) tile Karlsruhe city; AL8 (surrounding
// Gemeinde) is disjoint from it. Priority order matters for assignment.
export const ASSIGNMENT_LEVELS: readonly RegionLevel[] = [10, 9, 8];

const SAMPLE_GRID = 24; // 24×24 over the bounding box
const SUBDIVIDED_THRESHOLD = 0.95;

/**
 * True if this AL9 district is entirely subdivided into AL10 districts, which
 * therefore absorb all of its points under the assignment priority. Karlsruhe
 * has one such case — Wettersbach is exactly Grünwettersbach + Palmbach — and
 * leaving it in the reference table produces a permanently empty region whose
 * population is also counted a second time by its children.
 *
 * Detected geometrically rather than by name, so a future boundary change is
 * handled without a hardcoded exception.
 */
function isSubdivided(
  district: DistrictFeature,
  districts: DistrictFeature[],
): boolean {
  if (district.adminLevel !== 9) return false;

  const bounds = boundsOf(district.polygons);
  const children = districts
    .filter((d) => d.adminLevel === 10)
    .map((d) => ({ polygons: d.polygons, bounds: boundsOf(d.polygons) }))
    .filter((d) => boundsOverlap(bounds, d.bounds));
  if (children.length === 0) return false;

  // Sample interior points on a grid rather than testing the children's own
  // vertices: parent and child share boundary segments, and a ray cast against
  // a point lying exactly on an edge can land either way.
  let sampled = 0;
  let covered = 0;
  for (let i = 0; i < SAMPLE_GRID; i++) {
    const lng =
      bounds.minLng +
      ((i + 0.5) / SAMPLE_GRID) * (bounds.maxLng - bounds.minLng);
    for (let j = 0; j < SAMPLE_GRID; j++) {
      const lat =
        bounds.minLat +
        ((j + 0.5) / SAMPLE_GRID) * (bounds.maxLat - bounds.minLat);
      if (!inAnyPolygon(district.polygons, lng, lat)) continue;
      sampled++;
      if (children.some((c) => inAnyPolygon(c.polygons, lng, lat))) covered++;
    }
  }

  return sampled > 0 && covered / sampled > SUBDIVIDED_THRESHOLD;
}

/**
 * Build the merged region reference table: the Karlsruhe districts use the
 * authoritative census data in `districtLookup`; surrounding municipalities use
 * the population tag on the boundary (official figures, filled in from Wikidata
 * by the fetch script) and an area computed from geometry. AL9 districts that
 * AL10 children fully replace are left out.
 */
export function buildRegionInfos(districts: DistrictFeature[]): RegionInfo[] {
  return districts
    .filter((d): d is DistrictFeature & { adminLevel: RegionLevel } =>
      ASSIGNMENT_LEVELS.includes(d.adminLevel as RegionLevel),
    )
    .filter((d) => !isSubdivided(d, districts))
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
