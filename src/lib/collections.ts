// Small collection helpers for the group-and-aggregate patterns in the
// analytics pipeline.

/** Add `n` (default 1) to `map[key]`, initialising missing keys to 0. */
export function increment<K>(map: Map<K, number>, key: K, n = 1): void {
  map.set(key, (map.get(key) ?? 0) + n);
}

/** The `n` keys with the highest counts, most frequent first. */
export function topKeys<K>(counts: Map<K, number>, n: number): K[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key]) => key);
}
