export interface OsmBikeParking {
  id: number;
  standort: string;
  art: string;
  stellplaetze: number;
  stadtbezirk: string;
  stadtteil: string;
  covered: boolean;
  fee: boolean;
  zugang: string;
  betreiber: string;
  coordinate0: number;
  coordinate1: number;
  bemerkung: string;
}
