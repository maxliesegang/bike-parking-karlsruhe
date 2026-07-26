import { useEffect } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  MAP_COLORS,
  MAP_LABEL_FONT,
  bindPointPopup,
  ensurePointSource,
  escapeHtml,
  popupHtml,
} from "@/lib/map/maplibre";
import { useMapLibre } from "@/lib/map/useMapLibre";
import { TopFacility } from "@/lib/osm/analytics";

const SOURCE_ID = "facilities";
const CIRCLE_LAYER_ID = "facility-circles";

function facilityPopup(f: TopFacility): string {
  const badges: string[] = [];
  if (f.covered) badges.push("überdacht");
  if (f.fee) badges.push("kostenpflichtig");

  return popupHtml([
    `<strong>#${f.rank} ${escapeHtml(f.name)}</strong>`,
    escapeHtml(`${f.type} · ${f.capacity} Stellplätze`),
    escapeHtml(f.region || "außerhalb der Stadtteile"),
    badges.length > 0 && escapeHtml(badges.join(" · ")),
  ]);
}

export default function TopFacilitiesMapInner({
  facilities,
}: {
  facilities: TopFacility[];
}) {
  const { containerRef, map } = useMapLibre();

  useEffect(() => {
    if (!map || facilities.length === 0) return;

    // Layers and handlers are wired up together with the source; a later data
    // change only refreshes the source.
    if (ensurePointSource(map, SOURCE_ID, facilities)) {
      map.addLayer({
        id: CIRCLE_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-color": MAP_COLORS.attention,
          "circle-radius": 13,
          "circle-stroke-width": 2,
          "circle-stroke-color": MAP_COLORS.onColor,
        },
      });

      map.addLayer({
        id: "facility-labels",
        type: "symbol",
        source: SOURCE_ID,
        layout: {
          "text-field": ["to-string", ["get", "rank"]],
          "text-font": MAP_LABEL_FONT,
          "text-size": 13,
        },
        paint: { "text-color": MAP_COLORS.onColor },
      });

      bindPointPopup<TopFacility>(map, CIRCLE_LAYER_ID, facilityPopup);
    }

    const bounds = new maplibregl.LngLatBounds();
    facilities.forEach((f) => bounds.extend([f.lng, f.lat]));
    map.fitBounds(bounds, { padding: 40 });
  }, [map, facilities]);

  return <div ref={containerRef} style={{ height: 420, width: "100%" }} />;
}
