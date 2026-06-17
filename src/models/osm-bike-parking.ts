export interface OsmBikeParking {
  id: number;
  standort: string;
  art: string;
  stellplaetze: number;
  // Assigned administrative region (Stadtbezirk/Stadtteil/Gemeinde), or ""
  // if the point lies outside all known boundaries.
  region: string;
  // admin_level of the assigned region: 10/9 = Karlsruhe city, 8 = surrounding
  // municipality, 0 = unassigned.
  regionLevel: 8 | 9 | 10 | 0;
  covered: boolean;
  fee: boolean;
  zugang: string;
  betreiber: string;
  coordinate0: number;
  coordinate1: number;
  bemerkung: string;
}
