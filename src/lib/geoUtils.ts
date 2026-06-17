// Pure geometry helpers shared by the OSM processing pipeline. No I/O.

const EARTH_RADIUS_M = 6_371_000;

/**
 * Ray-casting point-in-polygon test against a polygon's outer ring.
 * `polygon` is an array of rings ([outer, ...holes]); holes are ignored, which
 * is acceptable at district scale.
 */
export function pointInPolygon(
  px: number,
  py: number,
  polygon: number[][][],
): boolean {
  const ring = polygon[0];
  if (!ring || ring.length < 3) return false;

  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Planar shoelace area (m²) of a single ring projected equirectangularly. */
function ringAreaM2(ring: number[][], lat0Rad: number): number {
  if (ring.length < 3) return 0;
  const cosLat = Math.cos(lat0Rad);
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = (ring[i][0] * Math.PI) / 180 * cosLat * EARTH_RADIUS_M;
    const yi = (ring[i][1] * Math.PI) / 180 * EARTH_RADIUS_M;
    const xj = (ring[j][0] * Math.PI) / 180 * cosLat * EARTH_RADIUS_M;
    const yj = (ring[j][1] * Math.PI) / 180 * EARTH_RADIUS_M;
    sum += xj * yi - xi * yj;
  }
  return Math.abs(sum) / 2;
}

/**
 * Area in km² of a MultiPolygon (array of polygons, each [outer, ...holes]),
 * using an equirectangular projection centred on the geometry's mean latitude.
 * Accurate to well under 1% at district scale; area is a secondary metric.
 */
export function polygonAreaKm2(polygons: number[][][][]): number {
  // Mean latitude across all outer-ring vertices for the projection centre.
  let latSum = 0;
  let latCount = 0;
  for (const polygon of polygons) {
    for (const [, lat] of polygon[0] || []) {
      latSum += lat;
      latCount += 1;
    }
  }
  if (latCount === 0) return 0;
  const lat0Rad = ((latSum / latCount) * Math.PI) / 180;

  let areaM2 = 0;
  for (const polygon of polygons) {
    polygon.forEach((ring, idx) => {
      const ringArea = ringAreaM2(ring, lat0Rad);
      areaM2 += idx === 0 ? ringArea : -ringArea; // subtract holes
    });
  }
  return Math.round((areaM2 / 1_000_000) * 100) / 100;
}
