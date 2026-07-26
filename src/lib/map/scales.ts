// Colour scales for the map views.
//
import { type ExpressionSpecification } from "maplibre-gl";

// MapLibre paints on a canvas and cannot read CSS custom properties, so every
// value a layer uses has to exist as a literal here — same reason MAP_COLORS
// duplicates the accent tokens. Each scale below encodes exactly one job:
//
//   SUPPLY_RAMP     magnitude — one hue, light→dark, more green = more supply
//   DISTANCE_RAMP   magnitude — one hue, light→dark, darker = further away,
//                   in the attention hue so "far" reads as the problem it is
//   EQUIPMENT_STEPS ordinal — three levels of one hue, light→dark
//
// No rainbow, no second hue inside a ramp: the eye reads a single hue's
// lightness as an ordered quantity, which is what all three of these are.

/** One legend entry: the swatch and what it means. */
export interface LegendStop {
  color: string;
  label: string;
}

/**
 * Everyday spaces per 1.000 residents. Breaks are absolute rather than
 * quantiles of the current selection, so a region keeps its colour when the
 * peer-group filter changes — the peer-relative judgement is the rating badge's
 * job, not the map's. The second break sits at 5, the floor the ratings measure
 * against (`MIN_RATING_BASELINE`), so the colour where "badly supplied" starts
 * is the same on the map as in the table.
 */
export const SUPPLY_BREAKS = [2, 5, 15, 40] as const;
export const SUPPLY_RAMP = [
  "#e8f3ec",
  "#c2e0cd",
  "#8fc7a6",
  "#57a67d",
  "#1f6342",
] as const;
export const SUPPLY_NO_DATA = "#d8d8dc";

export const SUPPLY_LEGEND: LegendStop[] = [
  { color: SUPPLY_RAMP[0], label: "unter 2" },
  { color: SUPPLY_RAMP[1], label: "2–5" },
  { color: SUPPLY_RAMP[2], label: "5–15" },
  { color: SUPPLY_RAMP[3], label: "15–40" },
  { color: SUPPLY_RAMP[4], label: "über 40" },
];

/** Only added to the legend when a region on the map actually lacks a
 *  population figure — today none does, and a key for a colour that isn't on
 *  the map is noise. */
export const SUPPLY_NO_DATA_STOP: LegendStop = {
  color: SUPPLY_NO_DATA,
  label: "keine Einwohnerzahl",
};

/**
 * Metres to the nearest facility. Round, walkable thresholds that also happen
 * to split the raster into five bins of workable size — 10 / 12 / 25 / 37 /
 * 16 % of cells — so no single shade swallows the map.
 */
export const DISTANCE_BREAKS = [250, 500, 1000, 2000] as const;
export const DISTANCE_RAMP = [
  "#fbe6c3",
  "#f4c785",
  "#e59f4c",
  "#c26a1a",
  "#7a3a0b",
] as const;

export const DISTANCE_LABELS = [
  "unter 250 m",
  "250–500 m",
  "500 m–1 km",
  "1–2 km",
  "über 2 km",
] as const;

export const DISTANCE_LEGEND: LegendStop[] = DISTANCE_RAMP.map(
  (color, index) => ({ color, label: DISTANCE_LABELS[index] }),
);

/**
 * Which distance bin a value in metres falls into. The raster is binned on the
 * client rather than server-side so the wire format stays the measurement
 * itself — change a break here and no rebuild of the data is needed.
 */
export function distanceBin(metres: number): number {
  let bin = 0;
  while (bin < DISTANCE_BREAKS.length && metres >= DISTANCE_BREAKS[bin]) bin++;
  return bin;
}

/**
 * Equipment level of a single facility, worst to best. Ordinal, so the steps
 * are one hue and every step clears the map background: the lightest sits at
 * 2,06:1 against white, which is the floor for a mark that has to be seen
 * rather than merely receded into a fill.
 */
export const EQUIPMENT_STEPS = {
  simple: "#7cc199",
  covered: "#2f8459",
  secure: "#14452f",
} as const;

export const EQUIPMENT_LEGEND: LegendStop[] = [
  { color: EQUIPMENT_STEPS.simple, label: "einfacher Ständer" },
  { color: EQUIPMENT_STEPS.covered, label: "überdacht" },
  { color: EQUIPMENT_STEPS.secure, label: "abschließbar" },
];

/**
 * Colour by a pre-computed bin index (0, 1, 2, …) — for data the client has
 * already binned, so the layer only has to look the colour up. A `["literal"]`
 * array of colour strings would be the obvious form, but the style spec types
 * it as `array<string>` and rejects it where a colour is expected.
 */
export const binExpression = (
  property: string,
  colors: readonly string[],
): ExpressionSpecification =>
  stepExpression(property, colors.map((_, index) => index).slice(1), colors);

/**
 * Builds a MapLibre `step` expression over a numeric property: value < breaks[0]
 * takes colors[0], and so on. `colors` must have exactly one entry more than
 * `breaks`.
 */
export function stepExpression(
  property: string,
  breaks: readonly number[],
  colors: readonly string[],
): ExpressionSpecification {
  const expression: unknown[] = ["step", ["get", property], colors[0]];
  breaks.forEach((limit, index) => {
    expression.push(limit, colors[index + 1]);
  });
  return expression as unknown as ExpressionSpecification;
}
