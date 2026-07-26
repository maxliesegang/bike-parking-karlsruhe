import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import "maplibre-gl/dist/maplibre-gl.css";
import { useMapLibre } from "@/lib/map/useMapLibre";
import { useJson } from "@/lib/map/useJson";
import {
  MAP_VIEWS,
  MapView,
  VIEW_META,
  addCoverageLayers,
  addParkingLayers,
  setActiveView,
} from "@/lib/map/parkingLayers";
import { MapLegend } from "@/components/MapLegend";
import { MapParking, MAP_DATA_URL } from "@/models/map-parking";
import { CoverageGrid, COVERAGE_DATA_URL } from "@/models/coverage";

export default function ParkingMapInner() {
  const { basePath } = useRouter();
  const { containerRef, map } = useMapLibre();
  const [view, setView] = useState<MapView>("anlagen");
  // The raster is the largest asset on the page and most visitors never open
  // its view, so it is fetched the first time that view is selected — and kept.
  const [coverageRequested, setCoverageRequested] = useState(false);

  const { data: parkings, failed } = useJson<MapParking[]>(
    `${basePath}${MAP_DATA_URL}`,
    true,
  );

  const { data: coverage } = useJson<CoverageGrid>(
    `${basePath}${COVERAGE_DATA_URL}`,
    coverageRequested,
  );

  useEffect(() => {
    if (!map || !parkings) return;
    addParkingLayers(map, parkings);
    if (coverage) addCoverageLayers(map, coverage);
    setActiveView(map, view);
  }, [map, parkings, coverage, view]);

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

  const meta = VIEW_META[view];
  const waitingForCoverage = view === "erreichbarkeit" && !coverage;

  return (
    <div className="app-map">
      <div className="app-filter" role="group" aria-label="Kartenansicht">
        <span className="app-filter__label">Ansicht</span>
        {MAP_VIEWS.map((option) => (
          <button
            key={option}
            type="button"
            className="app-chip"
            aria-pressed={view === option}
            onClick={() => {
              setView(option);
              if (option === "erreichbarkeit") setCoverageRequested(true);
            }}
          >
            {VIEW_META[option].label}
          </button>
        ))}
      </div>

      <p className="app-muted app-footnote" aria-live="polite">
        {meta.hint}
        {waitingForCoverage && " Das Raster wird geladen …"}
      </p>

      <div className="app-map-frame">
        <div ref={containerRef} className="app-map-canvas" />
      </div>

      {meta.legend && (
        <MapLegend stops={meta.legend} caption={meta.legendCaption} />
      )}
    </div>
  );
}
