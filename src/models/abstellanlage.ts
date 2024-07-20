export interface Abstellanlage {
  id: number;
  fid: string;
  coordinate0: number;
  coordinate1: number;
  art: string;
  standort: string;
  gemeinde: string;
  stadtteil: string;
  stellplaetze: number;
  b_r: string;
  e_ladestation: boolean;
  lastenrad: boolean;
  mit_anhaenger: boolean;
  link: string;
  bemerkung: string;
  firstFetched: string; // Date string
  lastUpdated: string; // Date string
}
