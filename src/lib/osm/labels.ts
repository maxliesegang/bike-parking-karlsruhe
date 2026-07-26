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

// Parking types that enclose the bike rather than just supporting it — the ones
// you can leave a bike at overnight. Keyed by the German label above. Used as a
// plain, checkable share ("% diebstahlsicher") instead of a composite score.
export const SECURE_TYPES = new Set([
  "Fahrradbox",
  "Fahrradschuppen",
  "Gebäude",
  "Doppelstock",
]);

// Access values that mark parking as not publicly usable — dropped entirely.
export const PRIVATE_ACCESS = new Set(["private", "no", "restricted"]);

// Remaining access values that are restricted-but-usable (customer/permit/etc.).
export const RESTRICTED_ACCESS = new Set([
  "customers",
  "permit",
  "students",
  "permissive",
]);
