import { useEffect } from "react";
import { useRouter } from "next/router";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useMapLibre } from "@/lib/map/useMapLibre";
import { useJson } from "@/lib/map/useJson";
import {
  MAP_COLORS,
  bindPointPopup,
  escapeHtml,
  popupHtml,
} from "@/lib/map/maplibre";
import {
  SUPPLY_BREAKS,
  SUPPLY_LEGEND,
  SUPPLY_NO_DATA,
  SUPPLY_NO_DATA_STOP,
  SUPPLY_RAMP,
  stepExpression,
} from "@/lib/map/scales";
import { MapLegend } from "@/components/MapLegend";
import { PeerGroup } from "@/lib/osm/peerGroups";
import {
  REGION_SHAPES_URL,
  RegionShapeProperties,
} from "@/models/region-shape";

const SOURCE_ID = "regions";
const FILL_LAYER = "region-fill";
const LINE_LAYER = "region-outline";

type Shapes = GeoJSON.FeatureCollection<
  GeoJSON.MultiPolygon,
  RegionShapeProperties
>;

function regionPopup(r: RegionShapeProperties): string {
  const perThousand =
    r.everydayPerThousand === null
      ? "keine Einwohnerzahl bekannt"
      : `${r.everydayPerThousand.toLocaleString("de-DE")} Alltagsplätze pro 1.000 Einwohner`;

  return popupHtml([
    `<strong>${escapeHtml(r.name)}</strong>`,
    escapeHtml(perThousand),
    escapeHtml(
      `${r.capacity.toLocaleString("de-DE")} Stellplätze in ${r.facilities.toLocaleString("de-DE")} Anlagen`,
    ),
    r.hubPercent > 0 && escapeHtml(`davon ${r.hubPercent} % an Bahnhöfen`),
    r.nearestMedianM !== null &&
      escapeHtml(
        `typischer Abstand zur nächsten Anlage: ${r.nearestMedianM} m`,
      ),
    r.sparselyMapped &&
      "<em>dünn kartiert — die Zahl sagt hier mehr über die Kartierung als über die Versorgung</em>",
  ]);
}

/**
 * The Versorgung table as a map. Same numbers, different question: the table
 * ranks, the map shows *where* — that the thin districts form a ring around a
 * well-supplied centre is not something a sorted list can say.
 *
 * Colour is absolute (spaces per 1.000 residents), not a rank within the
 * selected group, so a region keeps its shade when the filter changes. The
 * peer-relative judgement stays where it belongs, in the rating column.
 */
export default function SupplyMapInner({ group }: { group: PeerGroup | null }) {
  const { basePath } = useRouter();
  const { containerRef, map } = useMapLibre();
  const { data: shapes, failed } = useJson<Shapes>(
    `${basePath}${REGION_SHAPES_URL}`,
    true,
  );

  useEffect(() => {
    if (!map || !shapes) return;

    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, { type: "geojson", data: shapes });

      map.addLayer({
        id: FILL_LAYER,
        type: "fill",
        source: SOURCE_ID,
        paint: {
          // Regions without population data get the neutral grey rather than
          // the ramp's lightest step — "unknown" must not read as "almost none".
          // Keyed off the rating rather than a null test on the number, because
          // a missing figure is exactly what "unrated" means.
          "fill-color": [
            "case",
            ["==", ["get", "rating"], "unrated"],
            SUPPLY_NO_DATA,
            stepExpression("everydayPerThousand", SUPPLY_BREAKS, SUPPLY_RAMP),
          ] as maplibregl.ExpressionSpecification,
          "fill-opacity": 0.72,
        },
      });

      map.addLayer({
        id: LINE_LAYER,
        type: "line",
        source: SOURCE_ID,
        paint: {
          "line-color": MAP_COLORS.onColor,
          "line-width": 1.2,
        },
      });

      bindPointPopup<RegionShapeProperties>(map, FILL_LAYER, regionPopup);
    }

    const filter: maplibregl.FilterSpecification | null =
      group === null ? null : ["==", ["get", "group"], group];
    map.setFilter(FILL_LAYER, filter);
    map.setFilter(LINE_LAYER, filter);

    // Frame whatever is selected — the Umland reaches well past the city view
    // the base map opens on.
    const bounds = new maplibregl.LngLatBounds();
    let framed = false;
    for (const feature of shapes.features) {
      if (group !== null && feature.properties.group !== group) continue;
      for (const polygon of feature.geometry.coordinates) {
        for (const [lng, lat] of polygon[0]) {
          bounds.extend([lng, lat]);
          framed = true;
        }
      }
    }
    if (framed) map.fitBounds(bounds, { padding: 24, duration: 400 });
  }, [map, shapes, group]);

  if (failed) {
    return (
      <div className="app-loading">
        <p className="app-muted">Kartendaten konnten nicht geladen werden.</p>
      </div>
    );
  }

  return (
    <div className="app-map">
      <div className="app-map-frame">
        <div ref={containerRef} className="app-map-canvas" />
      </div>
      <MapLegend
        stops={
          shapes?.features.some(
            (f) => f.properties.everydayPerThousand === null,
          )
            ? [...SUPPLY_LEGEND, SUPPLY_NO_DATA_STOP]
            : SUPPLY_LEGEND
        }
        caption="Alltagsplätze pro 1.000 Einwohner"
      />
    </div>
  );
}
