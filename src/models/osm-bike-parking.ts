export interface OsmBikeParking {
  id: number;
  // Site name (OSM name/street tag), or "" when untagged.
  name: string;
  // German label for the bicycle_parking type (see parkingTypeLabel).
  type: string;
  // Capacity in bike spaces (`capacity` tag), 0 when unknown.
  capacity: number;
  // Assigned administrative region (Stadtbezirk/Stadtteil/Gemeinde), or ""
  // if the point lies outside all known boundaries.
  region: string;
  // admin_level of the assigned region: 10/9 = Karlsruhe city, 8 = surrounding
  // municipality, 0 = unassigned.
  regionLevel: 8 | 9 | 10 | 0;
  covered: boolean;
  fee: boolean;
  access: string;
  operator: string;
  lng: number;
  lat: number;
  note: string;
}
