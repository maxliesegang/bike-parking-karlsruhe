import fs from "fs";
import { OsmBikeParking } from "@/models/osm-bike-parking";
import { OSM_HISTORY_PATH } from "./config";

export interface OsmSnapshot {
  date: string; // YYYY-MM-DD
  // Whole dataset (Karlsruhe city + the surrounding Umland municipalities).
  totalFacilities: number;
  totalCapacity: number;
  // Karlsruhe city only (regionLevel 9/10). Optional: absent on snapshots
  // recorded before city tracking was added.
  cityFacilities?: number;
  cityCapacity?: number;
  /**
   * How the row was produced: "build" = measured by this build from the
   * committed GeoJSON, "ohsome" = reconstructed by scripts/backfill-history.mjs
   * from OSM full history. Absent on rows written before provenance tracking.
   */
  source?: "build" | "ohsome";
}

/** Karlsruhe city proper is admin_level 9/10; AL8 is the surrounding Umland. */
const isCity = (p: OsmBikeParking): boolean =>
  p.regionLevel === 9 || p.regionLevel === 10;

/** YYYY-MM of a YYYY-MM-DD date string. */
const monthOf = (date: string): string => date.slice(0, 7);

/**
 * Records a dated snapshot of OSM aggregate totals at build time, at most once
 * per calendar month (a rebuild within the current month overwrites its own
 * row). Builds happen on every push, which would otherwise add a near-daily
 * point; monthly matches the cadence of the backfilled ohsome rows. The file is
 * committed by CI on its scheduled run, so the timeline grows by ~one point per
 * month going forward. Mirrors the side-effecting pattern of firstFetchedMapper.
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

    if (!this.isDue(date)) return this.sortedSnapshots();

    const city = parkings.filter(isCity);
    const snapshot: OsmSnapshot = {
      date,
      totalFacilities: parkings.length,
      totalCapacity: parkings.reduce((sum, p) => sum + p.capacity, 0),
      cityFacilities: city.length,
      cityCapacity: city.reduce((sum, p) => sum + p.capacity, 0),
      source: "build",
    };
    this.history[date] = snapshot;
    const sorted = Object.fromEntries(
      Object.keys(this.history)
        .sort()
        .map((key) => [key, this.history[key]]),
    ) as Record<string, OsmSnapshot>;
    this.history = sorted;
    fs.writeFileSync(OSM_HISTORY_PATH, JSON.stringify(sorted, null, 2) + "\n");

    return this.sortedSnapshots();
  }

  /**
   * True if the current month has no row yet. A rebuild on a day that already
   * has a row still overwrites it, so the newest point stays accurate.
   */
  private isDue(date: string): boolean {
    const dates = Object.keys(this.history).sort();
    const latest = dates[dates.length - 1];
    if (latest === undefined || latest === date) return true;
    return monthOf(latest) !== monthOf(date);
  }

  private sortedSnapshots(): OsmSnapshot[] {
    return Object.values(this.history).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }
}
