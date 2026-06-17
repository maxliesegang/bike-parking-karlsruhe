// OSM `bicycle_parking` tag values mapped to the German labels shown in the UI,
// plus the access-tag value sets used to classify how usable a spot is.

const PARKING_TYPE_LABELS: Record<string, string> = {
  stands: "Fahrradständer",
  rack: "Fahrradständer",
  wall_loops: "Wandbügel",
  bollard: "Bügel",
  shed: "Fahrradschuppen",
  locker: "Fahrradbox",
  lockers: "Fahrradbox",
  building: "Gebäude",
  ground_slots: "Bodenhalterung",
  two_tier: "Doppelstock",
  parking_meter: "Parkscheinautomat",
  anchors: "Anker",
  handlebar_holder: "Lenkerhalter",
  safe_loop: "Sicherheitsbügel",
  street_side: "Seitenstreifen",
  informal: "Informell",
  lean_to: "Anlehnbügel",
};

/** German label for a `bicycle_parking` value (or the raw value / "Unbekannt"). */
export function parkingTypeLabel(value: string | undefined): string {
  if (!value) return "Unbekannt";
  return PARKING_TYPE_LABELS[value] || value;
}

// Quality weight per parking type, keyed by the German label above. Higher =
// more secure/weatherproof. Used to score a region's typical equipment.
export const PARKING_TYPE_SCORE: Record<string, number> = {
  Fahrradbox: 10,
  Fahrradschuppen: 8,
  Gebäude: 7,
  Doppelstock: 6,
  Sicherheitsbügel: 5,
  Anlehnbügel: 5,
  Bügel: 4,
  Fahrradständer: 3,
  Bodenhalterung: 3,
  Wandbügel: 3,
  Seitenstreifen: 2,
  Anker: 2,
  Parkscheinautomat: 2,
  Lenkerhalter: 1,
  Informell: 1,
  Unbekannt: 1,
};

// Access values that mark parking as not publicly usable — dropped entirely.
export const PRIVATE_ACCESS = new Set(["private", "no", "restricted"]);

// Remaining access values that are restricted-but-usable (customer/permit/etc.).
export const RESTRICTED_ACCESS = new Set([
  "customers",
  "permit",
  "students",
  "permissive",
]);
