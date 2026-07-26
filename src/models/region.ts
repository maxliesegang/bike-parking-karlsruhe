export interface RegionInfo {
  name: string;
  // 10 = Stadtbezirk, 9 = Stadtteil (both inside Karlsruhe city),
  // 8 = surrounding Umland municipality.
  adminLevel: 8 | 9 | 10;
  // Residents. Karlsruhe's districts use the city's own figures; the
  // surrounding municipalities use the official figure in the boundary's
  // `population` tag, which scripts/fetch-osm-data.mjs fills from Wikidata.
  population: number | null;
  areaKm2: number;
}
