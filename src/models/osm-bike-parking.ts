export interface OsmBikeParking {
  id: number;
  // Site name (OSM name/street tag), or "" when untagged.
  name: string;
  // German label for the bicycle_parking type (see parkingTypeLabel).
  type: string;
  // Capacity in bike spaces (`capacity` tag), 0 when unknown.
  capacity: number;
  // Assigned administrative region (Stadtbezirk/Stadtteil/Gemeinde). Points
  // outside every boundary are dropped in parseOsmBikeParking, so this is
  // always set.
  region: string;
  // admin_level of the assigned region: 10/9 = Karlsruhe city, 8 = surrounding
  // municipality.
  regionLevel: 8 | 9 | 10;
  covered: boolean;
  fee: boolean;
  access: string;
  operator: string;
  lng: number;
  lat: number;
  note: string;
  // Bike-and-ride facility (`bike_ride` tag set to anything but "no") — parking
  // that serves a station rather than the surrounding neighbourhood.
  bikeRide: boolean;
  // `lit` tag: whether it is lit, and whether the tag is present at all. Only
  // ~a quarter of features carry it, so shares must be taken over `litTagged`.
  lit: boolean;
  litTagged: boolean;
  // Tag-presence flags behind the values above, for the completeness analysis.
  // `capacity`/`covered`/`fee` all have silent defaults (0/false/false), which
  // is indistinguishable from a real value without these.
  capacityTagged: boolean;
  coveredTagged: boolean;
  feeTagged: boolean;
  // Most recent survey date (`check_date:capacity`/`check_date`/`survey:date`),
  // "" when never verified.
  checkDate: string;
}
