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

/**
 * Distance in metres between two lon/lat points, equirectangular approximation.
 * Well under 1% error at city scale, where all our distances are.
 */
export function distanceM(
  aLon: number,
  aLat: number,
  bLon: number,
  bLat: number,
): number {
  const toRad = Math.PI / 180;
  const dLat = (bLat - aLat) * toRad;
  const dLon = (bLon - aLon) * toRad * Math.cos(((aLat + bLat) / 2) * toRad);
  return Math.hypot(dLat, dLon) * EARTH_RADIUS_M;
}

/** Lng/lat bounding box. */
export interface Bounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

/** Bounding box over the outer rings of a MultiPolygon. */
export function boundsOf(polygons: number[][][][]): Bounds {
  const bounds: Bounds = {
    minLng: Infinity,
    minLat: Infinity,
    maxLng: -Infinity,
    maxLat: -Infinity,
  };
  for (const polygon of polygons) {
    for (const [lng, lat] of polygon[0] || []) {
      if (lng < bounds.minLng) bounds.minLng = lng;
      if (lng > bounds.maxLng) bounds.maxLng = lng;
      if (lat < bounds.minLat) bounds.minLat = lat;
      if (lat > bounds.maxLat) bounds.maxLat = lat;
    }
  }
  return bounds;
}

export const boundsOverlap = (a: Bounds, b: Bounds): boolean =>
  a.minLng <= b.maxLng &&
  a.maxLng >= b.minLng &&
  a.minLat <= b.maxLat &&
  a.maxLat >= b.minLat;

export const boundsContain = (b: Bounds, lng: number, lat: number): boolean =>
  lng >= b.minLng && lng <= b.maxLng && lat >= b.minLat && lat <= b.maxLat;

/** True if the point falls inside any polygon of a MultiPolygon. */
export const inAnyPolygon = (
  polygons: number[][][][],
  lon: number,
  lat: number,
): boolean => polygons.some((polygon) => pointInPolygon(lon, lat, polygon));

/**
 * Ramer–Douglas–Peucker on a ring, with the tolerance given in degrees of
 * latitude. Boundary rings come out of Overpass at full OSM node density; a
 * choropleth drawn at city zoom cannot show that, and the untouched rings are
 * an order of magnitude more bytes than the browser needs.
 */
export function simplifyRing(
  ring: number[][],
  toleranceDeg: number,
): number[][] {
  if (ring.length < 4) return ring;

  const keep = new Uint8Array(ring.length);
  keep[0] = 1;
  keep[ring.length - 1] = 1;

  // Iterative RDP — the recursive form blows the stack on rings this long.
  const stack: Array<[number, number]> = [[0, ring.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop() as [number, number];
    let farthest = -1;
    let maxDistance = toleranceDeg;

    for (let i = first + 1; i < last; i++) {
      const distance = perpendicularDistance(ring[i], ring[first], ring[last]);
      if (distance > maxDistance) {
        maxDistance = distance;
        farthest = i;
      }
    }

    if (farthest === -1) continue;
    keep[farthest] = 1;
    stack.push([first, farthest], [farthest, last]);
  }

  return ring.filter((_, index) => keep[index] === 1);
}

/** Perpendicular distance from `point` to the segment `a`–`b`, in degrees. */
function perpendicularDistance(
  point: number[],
  a: number[],
  b: number[],
): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return Math.hypot(point[0] - a[0], point[1] - a[1]);

  const t =
    ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  return Math.hypot(
    point[0] - (a[0] + clamped * dx),
    point[1] - (a[1] + clamped * dy),
  );
}

/** Planar shoelace area (m²) of a single ring projected equirectangularly. */
function ringAreaM2(ring: number[][], lat0Rad: number): number {
  if (ring.length < 3) return 0;
  const cosLat = Math.cos(lat0Rad);
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ((ring[i][0] * Math.PI) / 180) * cosLat * EARTH_RADIUS_M;
    const yi = ((ring[i][1] * Math.PI) / 180) * EARTH_RADIUS_M;
    const xj = ((ring[j][0] * Math.PI) / 180) * cosLat * EARTH_RADIUS_M;
    const yj = ((ring[j][1] * Math.PI) / 180) * EARTH_RADIUS_M;
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
