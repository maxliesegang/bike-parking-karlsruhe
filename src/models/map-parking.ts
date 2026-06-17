// URL (relative to the Next basePath) the client map fetches the points from.
// Defined here — free of node imports — so client code can use it without
// pulling in the server-only path config.
export const MAP_DATA_URL = "/data/parkings.json";

// Slim parking shape served as a static JSON asset and consumed by the client
// map. Carries only what the markers and popups need.
export interface MapParking {
  lat: number;
  lng: number;
  name: string;
  type: string;
  capacity: number;
  region: string;
  covered: boolean;
  fee: boolean;
  access: string;
  operator: string;
  note: string;
}
