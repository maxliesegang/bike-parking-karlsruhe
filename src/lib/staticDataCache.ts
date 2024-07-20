import { Abstellanlage } from "../models/abstellanlage";
import { fetchAbstellanlagenData } from "./dataFetcher";
import { processGeoJsonToAbstellanlagen } from "./dataProcessor";

let cachedAbstellanlagen: Abstellanlage[] | null = null;

export async function getAbstellanlagen(): Promise<Abstellanlage[]> {
  if (cachedAbstellanlagen === null) {
    const rawData = await fetchAbstellanlagenData();
    cachedAbstellanlagen = processGeoJsonToAbstellanlagen(rawData);
  }
  return cachedAbstellanlagen;
}
