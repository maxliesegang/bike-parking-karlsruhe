export interface RegionInfo {
  name: string;
  // 10 = Stadtbezirk, 9 = Stadtteil (both inside Karlsruhe city),
  // 8 = surrounding Landkreis municipality.
  adminLevel: 8 | 9 | 10;
  // Residents. Known for all 28 Karlsruhe districts; for surrounding
  // municipalities only where OSM carries a population tag, else null.
  population: number | null;
  areaKm2: number;
}
