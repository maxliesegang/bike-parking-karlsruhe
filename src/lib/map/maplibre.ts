// Shared MapLibre GL setup for the two maps on the site. Client-only — every
// helper here touches `window` via maplibre-gl, so it must be reached through a
// `dynamic(..., { ssr: false })` component.
import maplibregl, { type GeoJSONSource, type Map } from "maplibre-gl";

export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export const KARLSRUHE_CENTER: [number, number] = [8.4037, 49.0069];
export const KARLSRUHE_ZOOM = 11;

export const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende';

// Mirrors --app-accent / --app-attention in globals.css. MapLibre paints on a
// canvas and cannot read CSS custom properties, so the values are repeated here.
export const MAP_COLORS = {
  accent: "#305f43",
  attention: "#9d4d12",
  onColor: "#fff",
} as const;

// Fonts the OpenFreeMap glyph endpoint serves; the second is the fallback.
export const MAP_LABEL_FONT = ["Open Sans Bold", "Arial Unicode MS Bold"];

/** Anything that can become a point feature on one of our maps. */
export interface MapPoint {
  lat: number;
  lng: number;
}

/**
 * Adds a point source, or — if it already exists — replaces its data.
 * Returns `true` when the source was created, which is the caller's cue to add
 * the layers that render it.
 */
export function ensurePointSource<T extends MapPoint>(
  map: Map,
  sourceId: string,
  items: T[],
  options: { cluster?: boolean } = {},
): boolean {
  const data: GeoJSON.FeatureCollection<GeoJSON.Point, T> = {
    type: "FeatureCollection",
    features: items.map((item) => ({
      type: "Feature",
      properties: item,
      geometry: { type: "Point", coordinates: [item.lng, item.lat] },
    })),
  };

  const existing = map.getSource<GeoJSONSource>(sourceId);
  if (existing) {
    existing.setData(data);
    return false;
  }

  map.addSource(sourceId, {
    type: "geojson",
    data,
    ...(options.cluster
      ? { cluster: true, clusterMaxZoom: 13, clusterRadius: 40 }
      : {}),
  });
  return true;
}

/**
 * Opens a popup on click and shows the pointer cursor on hover. A single popup
 * instance is reused so clicking around never stacks bubbles on the map.
 *
 * Point features anchor the popup to the feature itself; anything with an
 * extent (a raster cell, a region polygon) anchors it where the click landed,
 * which is the part of the shape the reader was pointing at.
 */
export function bindPointPopup<T>(
  map: Map,
  layerId: string,
  render: (properties: T) => string,
): void {
  const popup = new maplibregl.Popup({ closeOnClick: true });

  map.on("click", layerId, (event) => {
    const feature = event.features?.[0];
    if (!feature) return;
    const anchor =
      feature.geometry.type === "Point"
        ? (feature.geometry.coordinates as [number, number])
        : event.lngLat;
    popup
      .setLngLat(anchor)
      .setHTML(render(feature.properties as T))
      .addTo(map);
  });

  bindPointerCursor(map, layerId);
}

/** Zooms into a cluster on click, up to the zoom where it breaks apart. */
export function bindClusterZoom(
  map: Map,
  layerId: string,
  sourceId: string,
): void {
  map.on("click", layerId, async (event) => {
    const feature = event.features?.[0];
    const source = map.getSource<GeoJSONSource>(sourceId);
    if (!feature || !source) return;

    const zoom = await source.getClusterExpansionZoom(
      feature.properties.cluster_id as number,
    );
    map.easeTo({
      center: (feature.geometry as GeoJSON.Point).coordinates as [
        number,
        number,
      ],
      zoom,
    });
  });

  bindPointerCursor(map, layerId);
}

function bindPointerCursor(map: Map, layerId: string): void {
  map.on("mouseenter", layerId, () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", layerId, () => {
    map.getCanvas().style.cursor = "";
  });
}

/** Escapes user-supplied OSM tag values before they go into popup markup. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Joins popup lines, dropping the ones a feature has no data for. */
export function popupHtml(lines: Array<string | false | null | undefined>) {
  return lines.filter(Boolean).join("<br/>");
}
