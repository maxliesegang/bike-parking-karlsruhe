// Small numeric helpers shared across the analytics pipeline, so the same
// rounding/percentage/average logic isn't re-spelled at every call site.

/** Round to `digits` decimal places (default 1). */
export function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** `part` as a percentage of `total`, rounded (0 when `total` is 0). */
export function percent(part: number, total: number, digits = 1): number {
  return total > 0 ? round((part / total) * 100, digits) : 0;
}

/** `sum / count`, rounded (0 when `count` is 0). */
export function mean(sum: number, count: number, digits = 1): number {
  return count > 0 ? round(sum / count, digits) : 0;
}

/** Median of an array, rounded (0 when empty). Does not mutate the input. */
export function median(values: number[], digits = 1): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return round(
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid],
    digits,
  );
}

/** Arithmetic mean of an array, rounded (0 when empty). */
export function average(values: number[], digits = 1): number {
  return mean(
    values.reduce((sum, v) => sum + v, 0),
    values.length,
    digits,
  );
}
