import { useCallback, useState } from "react";
import maplibregl, { type Map } from "maplibre-gl";
import {
  KARLSRUHE_CENTER,
  KARLSRUHE_ZOOM,
  MAP_ATTRIBUTION,
  MAP_STYLE_URL,
} from "./maplibre";

/**
 * Creates the Karlsruhe base map as soon as its container element mounts and
 * exposes it once the style is loaded — i.e. once sources and layers may be
 * added. Because it is a callback ref rather than an effect, the map is built
 * whenever the container appears, no matter how long the component renders a
 * loading state first.
 */
export function useMapLibre() {
  const [map, setMap] = useState<Map | null>(null);

  const containerRef = useCallback((container: HTMLDivElement) => {
    const instance = new maplibregl.Map({
      container,
      style: MAP_STYLE_URL,
      center: KARLSRUHE_CENTER,
      zoom: KARLSRUHE_ZOOM,
      attributionControl: false,
    });

    instance.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: MAP_ATTRIBUTION,
      }),
    );

    instance.once("style.load", () => setMap(instance));

    return () => {
      setMap(null);
      instance.remove();
    };
  }, []);

  return { containerRef, map };
}
