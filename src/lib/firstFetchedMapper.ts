// File: src/lib/firstFetchedManager.ts

import fs from "fs";
import path from "path";

const FIRST_FETCHED_FILE = path.join(process.cwd(), "first-fetched-dates.json");

export class FirstFetchedManager {
  private dates: Record<number, string>;

  constructor() {
    this.dates = this.loadDates();
  }

  private loadDates(): Record<number, string> {
    if (fs.existsSync(FIRST_FETCHED_FILE)) {
      const data = JSON.parse(fs.readFileSync(FIRST_FETCHED_FILE, "utf8"));
      // Convert string keys back to numbers
      return Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          Number(key),
          value as string,
        ]),
      );
    }
    return {};
  }

  private saveDates() {
    fs.writeFileSync(FIRST_FETCHED_FILE, JSON.stringify(this.dates, null, 2));
  }

  getFirstFetchedDate(id: number): string {
    if (!this.dates[id]) {
      this.dates[id] = new Date().toISOString();
      this.saveDates();
    }
    return this.dates[id];
  }
}

export const firstFetchedManager = new FirstFetchedManager();
