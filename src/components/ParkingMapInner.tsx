import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  MAP_COLORS,
  MAP_LABEL_FONT,
  bindClusterZoom,
  bindPointPopup,
  ensurePointSource,
  escapeHtml,
  popupHtml,
} from "@/lib/map/maplibre";
import { useMapLibre } from "@/lib/map/useMapLibre";
import { MapParking, MAP_DATA_URL } from "@/models/map-parking";

const SOURCE_ID = "parkings";
const CLUSTER_LAYER_ID = "parking-clusters";
const POINT_LAYER_ID = "parking-points";

function parkingPopup(p: MapParking): string {
  const headline = [p.type];
  if (p.capacity > 0) headline.push(`${p.capacity} Stellplätze`);

  const properties: string[] = [];
  if (p.covered) properties.push("überdacht");
  if (p.fee) properties.push("kostenpflichtig");
  if (p.access) properties.push(`Zugang: ${p.access}`);

  return popupHtml([
    `<strong>${escapeHtml(p.name || "Fahrrad-Abstellanlage")}</strong>`,
    escapeHtml(headline.join(" · ")),
    escapeHtml(p.region || "außerhalb der Stadtteile"),
    properties.length > 0 && escapeHtml(properties.join(" · ")),
    p.operator && `Betreiber: ${escapeHtml(p.operator)}`,
    p.note && escapeHtml(p.note),
  ]);
}

export default function ParkingMapInner() {
  const { basePath } = useRouter();
  const { containerRef, map } = useMapLibre();
  const [parkings, setParkings] = useState<MapParking[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`${basePath}${MAP_DATA_URL}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: MapParking[]) => {
        if (active) setParkings(data);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [basePath]);

  useEffect(() => {
    if (!map || !parkings) return;

    // Layers and handlers are wired up together with the source; a later data
    // change only refreshes the source.
    if (!ensurePointSource(map, SOURCE_ID, parkings, { cluster: true })) return;

    map.addLayer({
      id: CLUSTER_LAYER_ID,
      type: "circle",
      source: SOURCE_ID,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": MAP_COLORS.accent,
        "circle-radius": ["step", ["get", "point_count"], 18, 100, 24, 750, 32],
        "circle-stroke-width": 2,
        "circle-stroke-color": MAP_COLORS.onColor,
      },
    });

    map.addLayer({
      id: "parking-cluster-count",
      type: "symbol",
      source: SOURCE_ID,
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-font": MAP_LABEL_FONT,
        "text-size": 12,
      },
      paint: { "text-color": MAP_COLORS.onColor },
    });

    map.addLayer({
      id: POINT_LAYER_ID,
      type: "circle",
      source: SOURCE_ID,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": MAP_COLORS.accent,
        "circle-radius": 5,
        "circle-stroke-width": 1,
        "circle-stroke-color": MAP_COLORS.onColor,
      },
    });

    bindPointPopup<MapParking>(map, POINT_LAYER_ID, parkingPopup);
    bindClusterZoom(map, CLUSTER_LAYER_ID, SOURCE_ID);
  }, [map, parkings]);

  if (failed) {
    return (
      <div className="app-loading app-loading--large">
        <p className="app-muted">Kartendaten konnten nicht geladen werden.</p>
      </div>
    );
  }

  if (!parkings) {
    return (
      <div
        className="app-loading app-loading--large"
        role="status"
        aria-live="polite"
      >
        <div className="app-loading__content">
          <span
            className="kern-loader kern-loader--visible"
            aria-hidden="true"
          />
          <span>Kartendaten werden geladen.</span>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} style={{ height: 460, width: "100%" }} />;
}
