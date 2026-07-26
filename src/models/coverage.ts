// URL (relative to the Next basePath) of the walking-distance grid the client
// map fetches. Node-free, like map-parking.ts, so client code can import it.
export const COVERAGE_DATA_URL = "/data/coverage.json";

/** Distances are stored in units of 10 m — the raster's own cell is 100 m, so
 *  a finer figure would be false precision, and the shorter numbers are a fifth
 *  of the file. Multiply by `DISTANCE_UNIT_M` to get metres. */
export const DISTANCE_UNIT_M = 10;

/**
 * One column-aligned run of cells starting at grid position (`x`, `y`) and
 * going north. `d` holds one distance per cell, so `d.length` cells are covered.
 *
 * Cells inside an administrative area are contiguous in long vertical stretches,
 * so runs cost one pair of indices per few hundred cells instead of a pair per
 * cell — the difference between 1,5 MB and a third of that.
 */
export interface CoverageRun {
  x: number;
  y: number;
  /** Distance per cell, in `DISTANCE_UNIT_M` units, south to north. */
  d: number[];
}

/**
 * "How far to the nearest rack?" as a raster over the study area.
 *
 * Stored as an origin plus integer grid indices rather than as GeoJSON squares:
 * the polygons are regular, so shipping their corners would be an order of
 * magnitude more bytes for information the client can reconstruct in a loop.
 */
export interface CoverageGrid {
  /** South-west corner of cell (0, 0). */
  minLng: number;
  minLat: number;
  /** Cell size in degrees — the edge length in metres is `cellM`. */
  cellLng: number;
  cellLat: number;
  cellM: number;
  /** Distances at or above this are stored as exactly this, i.e. "further". */
  maxDistanceM: number;
  runs: CoverageRun[];
}
