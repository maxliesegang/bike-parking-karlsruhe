import fs from "fs";
import { OsmBikeParking } from "@/models/osm-bike-parking";
import { OSM_HISTORY_PATH } from "./config";

export interface OsmSnapshot {
  date: string; // YYYY-MM-DD
  totalAnlagen: number;
  totalStellplaetze: number;
}

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
    const snapshot: OsmSnapshot = {
      date,
      totalAnlagen: parkings.length,
      totalStellplaetze: parkings.reduce((sum, p) => sum + p.stellplaetze, 0),
    };
    this.history[date] = snapshot;
    fs.writeFileSync(OSM_HISTORY_PATH, JSON.stringify(this.history, null, 2));

    return Object.values(this.history).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }
}
