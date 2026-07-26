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

const SAMPLE_GRID = 24; // 24×24 over the bounding box
const SUBDIVIDED_THRESHOLD = 0.95;

type Bounds = {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
};

function boundsOf(polygons: number[][][][]): Bounds {
  const bounds: Bounds = {
    minLon: Infinity,
    minLat: Infinity,
    maxLon: -Infinity,
    maxLat: -Infinity,
  };
  for (const polygon of polygons) {
    for (const [lon, lat] of polygon[0] || []) {
      if (lon < bounds.minLon) bounds.minLon = lon;
      if (lon > bounds.maxLon) bounds.maxLon = lon;
      if (lat < bounds.minLat) bounds.minLat = lat;
      if (lat > bounds.maxLat) bounds.maxLat = lat;
    }
  }
  return bounds;
}

const overlaps = (a: Bounds, b: Bounds): boolean =>
  a.minLon <= b.maxLon &&
  a.maxLon >= b.minLon &&
  a.minLat <= b.maxLat &&
  a.maxLat >= b.minLat;

const contains = (
  polygons: number[][][][],
  lon: number,
  lat: number,
): boolean => polygons.some((polygon) => pointInPolygon(lon, lat, polygon));

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
    .filter((d) => overlaps(bounds, d.bounds));
  if (children.length === 0) return false;

  // Sample interior points on a grid rather than testing the children's own
  // vertices: parent and child share boundary segments, and a ray cast against
  // a point lying exactly on an edge can land either way.
  let sampled = 0;
  let covered = 0;
  for (let i = 0; i < SAMPLE_GRID; i++) {
    const lon =
      bounds.minLon +
      ((i + 0.5) / SAMPLE_GRID) * (bounds.maxLon - bounds.minLon);
    for (let j = 0; j < SAMPLE_GRID; j++) {
      const lat =
        bounds.minLat +
        ((j + 0.5) / SAMPLE_GRID) * (bounds.maxLat - bounds.minLat);
      if (!contains(district.polygons, lon, lat)) continue;
      sampled++;
      if (children.some((c) => contains(c.polygons, lon, lat))) covered++;
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
