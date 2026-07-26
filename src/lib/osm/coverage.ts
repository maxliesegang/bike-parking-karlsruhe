// Walking-distance raster: for every 100 m cell of the study area, how far it
// is to the nearest bike parking facility.
//
// The point map answers "where is parking?"; this answers the question a
// cyclist actually has, which is the inverse — "where is there none?". Density
// maps can't show that: an empty area has no points to draw, so absence renders
// as blank map and reads as "no data" rather than "no racks".
//
// Two honest limits, both stated in the page copy: the grid covers the whole
// administrative area including Hardtwald and farmland, where nobody expects a
// rack; and it measures straight-line distance, so the real walk is longer
// wherever a rail line, a motorway or the Rhine sits in between.

import { OsmBikeParking } from "@/models/osm-bike-parking";
import { CoverageGrid, CoverageRun, DISTANCE_UNIT_M } from "@/models/coverage";
import { DistrictFeature } from "../osmDataFetcher";
import {
  Bounds,
  boundsContain,
  boundsOf,
  distanceM,
  inAnyPolygon,
} from "../geoUtils";
import { ASSIGNMENT_LEVELS } from "./regions";

/** Cell edge length. At 250 m a block-sized gap disappeared into its
 *  surroundings, which is exactly the detail this view exists for; 100 m
 *  resolves the individual street. It costs 6× the cells, which the run-length
 *  encoding below and the strip merge on the client absorb. */
const CELL_M = 100;

/** Distances are capped here: past four kilometres — 3 % of the area, deep
 *  forest and field — "further still" is not a distinction worth storing. */
const MAX_DISTANCE_M = 4000;

/** Edge of a facility-index bucket. Deliberately independent of `CELL_M`: the
 *  ring search walks buckets, so tying it to a finer raster would only mean
 *  more, emptier buckets to visit per cell. */
const BUCKET_M = 250;

/** Approximate metres per degree of latitude. */
const M_PER_DEG_LAT = 111_320;

/**
 * A polygon plus its bounding box. The containment test runs a few hundred
 * thousand times, so every cell first does 60 cheap box tests and only then a
 * ray cast against the one or two boundaries that can actually contain it.
 */
interface IndexedDistrict {
  polygons: number[][][][];
  bounds: Bounds;
}

/** Buckets facilities into `BUCKET_M` boxes so the nearest-neighbour search
 *  only ever looks at the rings around a point instead of all ~7.500. */
class PointIndex {
  private readonly buckets = new Map<string, OsmBikeParking[]>();

  constructor(
    parkings: OsmBikeParking[],
    private readonly minLng: number,
    private readonly minLat: number,
    private readonly bucketLng: number,
    private readonly bucketLat: number,
  ) {
    for (const p of parkings) {
      const key = this.keyOf(
        Math.floor((p.lng - minLng) / bucketLng),
        Math.floor((p.lat - minLat) / bucketLat),
      );
      const bucket = this.buckets.get(key);
      if (bucket) bucket.push(p);
      else this.buckets.set(key, [p]);
    }
  }

  private keyOf(x: number, y: number): string {
    return `${x}/${y}`;
  }

  /**
   * Distance in metres to the nearest facility, capped at `MAX_DISTANCE_M`.
   * Rings are searched outward; the search stops one ring after the first hit,
   * because a point in the next ring out can still be closer than one sitting
   * in the far corner of the current one.
   */
  nearestM(lng: number, lat: number): number {
    const cx = Math.floor((lng - this.minLng) / this.bucketLng);
    const cy = Math.floor((lat - this.minLat) / this.bucketLat);
    const maxRing = Math.ceil(MAX_DISTANCE_M / BUCKET_M) + 1;

    let nearest = MAX_DISTANCE_M;
    let foundAtRing = -1;

    for (let ring = 0; ring <= maxRing; ring++) {
      if (foundAtRing >= 0 && ring > foundAtRing + 1) break;

      for (let x = cx - ring; x <= cx + ring; x++) {
        for (let y = cy - ring; y <= cy + ring; y++) {
          // Only the shell of the square — the interior was done in earlier rings.
          if (
            ring > 0 &&
            Math.abs(x - cx) !== ring &&
            Math.abs(y - cy) !== ring
          )
            continue;

          const bucket = this.buckets.get(this.keyOf(x, y));
          if (!bucket) continue;

          for (const p of bucket) {
            const d = distanceM(lng, lat, p.lng, p.lat);
            if (d < nearest) {
              nearest = d;
              if (foundAtRing < 0) foundAtRing = ring;
            }
          }
        }
      }
    }

    return Math.round(nearest);
  }
}

/**
 * Rasterise the study area. Cells whose centre falls outside every boundary are
 * omitted entirely, so the grid ends at the administrative border rather than
 * fading out over a rectangle — the same scoping `parseOsmBikeParking` applies
 * to the points themselves.
 */
export function buildCoverageGrid(
  parkings: OsmBikeParking[],
  districts: DistrictFeature[],
): CoverageGrid {
  const areas: IndexedDistrict[] = districts
    .filter((d) => ASSIGNMENT_LEVELS.includes(d.adminLevel as 8 | 9 | 10))
    .map((d) => ({ polygons: d.polygons, bounds: boundsOf(d.polygons) }));

  const empty: CoverageGrid = {
    minLng: 0,
    minLat: 0,
    cellLng: 0,
    cellLat: 0,
    cellM: CELL_M,
    maxDistanceM: MAX_DISTANCE_M,
    runs: [],
  };
  if (areas.length === 0 || parkings.length === 0) return empty;

  const area = boundsOf(areas.flatMap((a) => a.polygons));
  const midLat = (area.minLat + area.maxLat) / 2;
  const cellLat = CELL_M / M_PER_DEG_LAT;
  const cellLng = CELL_M / (M_PER_DEG_LAT * Math.cos((midLat * Math.PI) / 180));

  const index = new PointIndex(
    parkings,
    area.minLng,
    area.minLat,
    (cellLng * BUCKET_M) / CELL_M,
    (cellLat * BUCKET_M) / CELL_M,
  );

  const columns = Math.ceil((area.maxLng - area.minLng) / cellLng);
  const rows = Math.ceil((area.maxLat - area.minLat) / cellLat);
  const runs: CoverageRun[] = [];

  for (let x = 0; x < columns; x++) {
    const lng = area.minLng + (x + 0.5) * cellLng;
    // Open a run at the first cell inside the area and close it at the first
    // cell outside, so a column crossing a concave border yields several.
    let run: CoverageRun | null = null;

    for (let y = 0; y < rows; y++) {
      const lat = area.minLat + (y + 0.5) * cellLat;
      const inside = areas.some(
        (a) =>
          boundsContain(a.bounds, lng, lat) &&
          inAnyPolygon(a.polygons, lng, lat),
      );

      if (!inside) {
        run = null;
        continue;
      }

      if (!run) {
        run = { x, y, d: [] };
        runs.push(run);
      }
      run.d.push(Math.round(index.nearestM(lng, lat) / DISTANCE_UNIT_M));
    }
  }

  return {
    minLng: area.minLng,
    minLat: area.minLat,
    cellLng,
    cellLat,
    cellM: CELL_M,
    maxDistanceM: MAX_DISTANCE_M,
    runs,
  };
}
