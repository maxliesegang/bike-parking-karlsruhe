export interface FeatureProperties {
  id: number;
  gemeinde: string;
  stadtteil: string;
  standort: string;
  art: string;
  bike_and_ride: string | null;
  stellplaetze: number;
  e_ladestation: "T" | "F";
  lastenrad: "T" | "F";
  mit_anhaenger: "T" | "F";
  link: string | null;
  bemerkung: string;
  stand: string;
}
