import fs from "fs";
import { OsmBikeParking } from "@/models/osm-bike-parking";
import { OSM_HISTORY_PATH } from "./config";

export interface OsmSnapshot {
  date: string; // YYYY-MM-DD
  // Whole dataset (Karlsruhe city + surrounding Landkreis municipalities).
  totalFacilities: number;
  totalCapacity: number;
  // Karlsruhe city only (regionLevel 9/10). Optional: absent on snapshots
  // recorded before city tracking was added.
  cityFacilities?: number;
  cityCapacity?: number;
}

/** Karlsruhe city proper is admin_level 9/10; AL8 is the surrounding Landkreis. */
const isCity = (p: OsmBikeParking): boolean =>
  p.regionLevel === 9 || p.regionLevel === 10;

/**
 * Records a dated snapshot of OSM aggregate totals on each build, deduped by
 * day (a same-day rebuild overwrites). The file is committed by CI on its
 * scheduled run, so the timeline grows ~one point per day going forward.
 * Mirrors the side-effecting pattern of firstFetchedMapper.
 */
export class OsmHistoryManager {
  private history: Record<string, OsmSnapshot>;

  constructor() {
    this.history = this.load();
  }

  private load(): Record<string, OsmSnapshot> {
    if (fs.existsSync(OSM_HISTORY_PATH)) {
      try {
        return JSON.parse(fs.readFileSync(OSM_HISTORY_PATH, "utf8"));
      } catch {
        return {};
      }
    }
    return {};
  }

  recordSnapshot(parkings: OsmBikeParking[]): OsmSnapshot[] {
    const date = new Date().toISOString().split("T")[0];
    const city = parkings.filter(isCity);
    const snapshot: OsmSnapshot = {
      date,
      totalFacilities: parkings.length,
      totalCapacity: parkings.reduce((sum, p) => sum + p.capacity, 0),
      cityFacilities: city.length,
      cityCapacity: city.reduce((sum, p) => sum + p.capacity, 0),
    };
    this.history[date] = snapshot;
    fs.writeFileSync(OSM_HISTORY_PATH, JSON.stringify(this.history, null, 2));

    return Object.values(this.history).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }
}
