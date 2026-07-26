// The three readings of the same parking data on the home map.
//
// One map, three questions — because the point map answers only the first of
// them well:
//
//   Anlagen        where are the facilities?      clustered points
//   Erreichbarkeit where is there none?           walking-distance raster
//   Ausstattung    what kind of parking is it?    points by equipment level
//
// "Erreichbarkeit" comes second because it is the reading the point map cannot
// give at all: absence has no dot to draw, so on a point map an unserved
// neighbourhood and an unmapped one look identical — empty.
//
// Every layer of every view is added once, up front, and views switch by
// toggling `visibility`. Re-adding layers on each switch would re-parse the
// point set and drop the click handlers bound to them.

import { type Map } from "maplibre-gl";
import { MapParking } from "@/models/map-parking";
import { CoverageGrid, DISTANCE_UNIT_M } from "@/models/coverage";
import {
  DISTANCE_LABELS,
  DISTANCE_LEGEND,
  DISTANCE_RAMP,
  EQUIPMENT_LEGEND,
  EQUIPMENT_STEPS,
  LegendStop,
  binExpression,
  distanceBin,
} from "./scales";
import {
  MAP_COLORS,
  MAP_LABEL_FONT,
  bindClusterZoom,
  bindPointPopup,
  ensurePointSource,
  escapeHtml,
  popupHtml,
} from "./maplibre";

export const MAP_VIEWS = ["anlagen", "erreichbarkeit", "ausstattung"] as const;

export type MapView = (typeof MAP_VIEWS)[number];

interface ViewMeta {
  label: string;
  /** The question this view answers, shown under the switcher. */
  hint: string;
  legend: LegendStop[] | null;
  legendCaption: string;
}

export const VIEW_META: Record<MapView, ViewMeta> = {
  anlagen: {
    label: "Anlagen",
    hint: "Jeder Punkt ist eine Anlage; beim Herauszoomen werden sie gruppiert. Klick für Details.",
    legend: null,
    legendCaption: "",
  },
  erreichbarkeit: {
    label: "Erreichbarkeit",
    hint: "Umgekehrte Frage: Wie weit ist es von hier zum nächsten Abstellplatz? Luftlinie, im 100-Meter-Raster — Wald und Feld sind mitgerastert, dort fehlt nichts.",
    legend: DISTANCE_LEGEND,
    legendCaption: "Entfernung zur nächsten Anlage",
  },
  ausstattung: {
    label: "Ausstattung",
    hint: "Wo steht das Rad trocken, wo lässt es sich einschließen? Abschließbar zählt Boxen, Schuppen, Gebäude und Doppelstockparker. Die Punktgröße zeigt die Stellplätze — fehlt die Angabe, bleibt der Punkt klein.",
    legend: EQUIPMENT_LEGEND,
    legendCaption: "Ausstattung",
  },
};

// --- Sources and layers ----------------------------------------------------

const CLUSTER_SOURCE = "parkings";
const FLAT_SOURCE = "parkings-flat";
const COVERAGE_SOURCE = "coverage";

const CLUSTER_LAYER = "parking-clusters";
const CLUSTER_COUNT_LAYER = "parking-cluster-count";
const POINT_LAYER = "parking-points";
const EQUIPMENT_LAYER = "parking-equipment";
const COVERAGE_LAYER = "coverage-fill";
const COVERAGE_POINT_LAYER = "coverage-points";

const LAYERS_BY_VIEW: Record<MapView, string[]> = {
  anlagen: [CLUSTER_LAYER, CLUSTER_COUNT_LAYER, POINT_LAYER],
  erreichbarkeit: [COVERAGE_LAYER, COVERAGE_POINT_LAYER],
  ausstattung: [EQUIPMENT_LAYER],
};

const ALL_LAYERS = Object.values(LAYERS_BY_VIEW).flat();

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

/**
 * Adds every point-based layer. The clustered source drives the „Anlagen“ view;
 * the unclustered one holds the same features for the layers that must show
 * every point at every zoom, since a clustered source only ever exposes the
 * points that happen not to be in a cluster.
 */
export function addParkingLayers(map: Map, parkings: MapParking[]): void {
  if (!ensurePointSource(map, CLUSTER_SOURCE, parkings, { cluster: true }))
    return;
  ensurePointSource(map, FLAT_SOURCE, parkings);

  map.addLayer({
    id: CLUSTER_LAYER,
    type: "circle",
    source: CLUSTER_SOURCE,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": MAP_COLORS.accent,
      "circle-radius": ["step", ["get", "point_count"], 18, 100, 24, 750, 32],
      "circle-stroke-width": 2,
      "circle-stroke-color": MAP_COLORS.onColor,
    },
  });

  map.addLayer({
    id: CLUSTER_COUNT_LAYER,
    type: "symbol",
    source: CLUSTER_SOURCE,
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": MAP_LABEL_FONT,
      "text-size": 12,
    },
    paint: { "text-color": MAP_COLORS.onColor },
  });

  map.addLayer({
    id: POINT_LAYER,
    type: "circle",
    source: CLUSTER_SOURCE,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": MAP_COLORS.accent,
      "circle-radius": 5,
      "circle-stroke-width": 1,
      "circle-stroke-color": MAP_COLORS.onColor,
    },
  });

  map.addLayer({
    id: EQUIPMENT_LAYER,
    type: "circle",
    source: FLAT_SOURCE,
    layout: { visibility: "none" },
    paint: {
      "circle-color": [
        "match",
        ["get", "equipment"],
        "secure",
        EQUIPMENT_STEPS.secure,
        "covered",
        EQUIPMENT_STEPS.covered,
        EQUIPMENT_STEPS.simple,
      ],
      // Radius carries capacity, colour carries equipment — the two questions
      // a reader has about a facility, without a second map.
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        10,
        ["interpolate", ["linear"], ["get", "capacity"], 0, 2.5, 200, 8],
        16,
        ["interpolate", ["linear"], ["get", "capacity"], 0, 5, 200, 26],
      ],
      "circle-stroke-width": 1,
      "circle-stroke-color": MAP_COLORS.onColor,
      "circle-opacity": 0.85,
    },
  });

  bindPointPopup<MapParking>(map, POINT_LAYER, parkingPopup);
  bindPointPopup<MapParking>(map, EQUIPMENT_LAYER, parkingPopup);
  bindClusterZoom(map, CLUSTER_LAYER, CLUSTER_SOURCE);
}

/** What a drawn strip carries: its colour bin, and the distance range the
 *  cells inside it actually measured. */
interface CoverageStrip {
  bin: number;
  minM: number;
  maxM: number;
}

/**
 * Expands the compact grid into the rectangles MapLibre draws, merging
 * consecutive cells of the same colour bin into one strip.
 *
 * At 100 m the raster is ~126.000 cells, and handing that many one-cell squares
 * to the tiler is most of a second of work for a picture that has five colours
 * in it. Neighbours within a column almost always share a bin, so the merge
 * gives back a fraction of the features and a pixel-identical fill.
 */
function coverageFeatures(
  grid: CoverageGrid,
): GeoJSON.FeatureCollection<GeoJSON.Polygon, CoverageStrip> {
  const features: GeoJSON.Feature<GeoJSON.Polygon, CoverageStrip>[] = [];

  for (const run of grid.runs) {
    const west = grid.minLng + run.x * grid.cellLng;
    const east = west + grid.cellLng;

    let startY = 0;
    let strip: CoverageStrip | null = null;

    const flush = (endY: number) => {
      if (!strip) return;
      const south = grid.minLat + (run.y + startY) * grid.cellLat;
      const north = grid.minLat + (run.y + endY) * grid.cellLat;
      features.push({
        type: "Feature",
        properties: strip,
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [west, south],
              [east, south],
              [east, north],
              [west, north],
              [west, south],
            ],
          ],
        },
      });
    };

    run.d.forEach((units, offset) => {
      const metres = units * DISTANCE_UNIT_M;
      const bin = distanceBin(metres);

      if (strip && strip.bin === bin) {
        strip.minM = Math.min(strip.minM, metres);
        strip.maxM = Math.max(strip.maxM, metres);
        return;
      }

      flush(offset);
      startY = offset;
      strip = { bin, minM: metres, maxM: metres };
    });

    flush(run.d.length);
  }

  return { type: "FeatureCollection", features };
}

/**
 * Adds the walking-distance raster plus a faint dot layer for the facilities
 * that produce it — without them the raster is an abstraction the reader has no
 * way to check.
 */
export function addCoverageLayers(map: Map, grid: CoverageGrid): void {
  if (map.getSource(COVERAGE_SOURCE)) return;

  map.addSource(COVERAGE_SOURCE, {
    type: "geojson",
    data: coverageFeatures(grid),
  });

  map.addLayer({
    id: COVERAGE_LAYER,
    type: "fill",
    source: COVERAGE_SOURCE,
    layout: { visibility: "none" },
    paint: {
      "fill-color": binExpression("bin", DISTANCE_RAMP),
      // Translucent so streets and place names stay legible underneath: the
      // raster is only readable against the geography it covers.
      "fill-opacity": 0.62,
    },
  });

  map.addLayer({
    id: COVERAGE_POINT_LAYER,
    type: "circle",
    source: FLAT_SOURCE,
    layout: { visibility: "none" },
    paint: {
      "circle-color": "#1f2421",
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 1.2, 16, 4],
      "circle-opacity": 0.75,
    },
  });

  // A strip can span several cells, so the popup reports the range it covers
  // rather than inventing a single figure for all of them.
  bindPointPopup<CoverageStrip>(map, COVERAGE_LAYER, (strip) =>
    popupHtml([
      "<strong>Nächste Abstellanlage</strong>",
      strip.minM >= grid.maxDistanceM
        ? `über ${(grid.maxDistanceM / 1000).toLocaleString("de-DE")} km Luftlinie`
        : strip.minM === strip.maxM
          ? `rund ${strip.minM.toLocaleString("de-DE")} m Luftlinie`
          : `${strip.minM.toLocaleString("de-DE")}–${strip.maxM.toLocaleString("de-DE")} m Luftlinie`,
      DISTANCE_LABELS[strip.bin],
    ]),
  );
}

/** Shows the layers of one view and hides all others. */
export function setActiveView(map: Map, view: MapView): void {
  const active = new Set(LAYERS_BY_VIEW[view]);
  for (const layer of ALL_LAYERS) {
    if (!map.getLayer(layer)) continue;
    map.setLayoutProperty(
      layer,
      "visibility",
      active.has(layer) ? "visible" : "none",
    );
  }
}
