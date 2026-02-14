import { FeatureCollection } from "geojson";
import { JSON_URL, FETCH_TIMEOUT } from "./config";

export async function fetchAbstellanlagenData(): Promise<FeatureCollection> {
  const response = await fetch(JSON_URL, {
    headers: { "User-Agent": "Node.js" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
  });

  if (!response.ok) {
    throw new Error(`HTTP request failed with status ${response.status}`);
  }

  return response.json();
}
