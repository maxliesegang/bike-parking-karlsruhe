import { OsmSnapshot } from "../osmHistoryMapper";

/**
 * One monthly measuring point, split into the two stacked series the charts
 * draw. The Umland figures are derived as "total minus city"; both
 * are null on snapshots recorded before city tracking existed, so charts skip
 * those segments instead of drawing a drop to zero.
 */
export interface HistoryPoint {
  date: string; // YYYY-MM-DD
  capacityCity: number | null;
  capacityUmland: number | null;
  facilitiesCity: number | null;
  facilitiesUmland: number | null;
}

/** Year-end state plus the growth that happened during that year. */
export interface HistoryYear {
  year: string;
  capacity: number;
  facilities: number;
  capacityDeltaCity: number;
  capacityDeltaUmland: number;
  capacityDelta: number;
  facilityDelta: number;
  growthPercent: number;
  /** True for the current, not-yet-complete year. */
  partial: boolean;
}

export interface HistorySummary {
  firstDate: string;
  latestDate: string;
  months: number;
  capacityTotal: number;
  facilitiesTotal: number;
  /** Share of all capacity that sits inside the city, in percent. */
  cityShare: number | null;
  /** Change over the last 12 months (or the whole series, if shorter). */
  capacity12m: number;
  capacity12mPercent: number;
  facilities12m: number;
  capacityPerMonth12m: number;
  avgCapacity: number;
  avgCapacityFirst: number;
  /** Current capacity divided by the capacity of the first measuring point. */
  growthFactor: number;
}

export function buildHistoryPoints(history: OsmSnapshot[]): HistoryPoint[] {
  return history.map((s) => ({
    date: s.date,
    capacityCity: s.cityCapacity ?? null,
    capacityUmland:
      s.cityCapacity == null ? null : s.totalCapacity - s.cityCapacity,
    facilitiesCity: s.cityFacilities ?? null,
    facilitiesUmland:
      s.cityFacilities == null ? null : s.totalFacilities - s.cityFacilities,
  }));
}

/**
 * Aggregate to year-end values. The growth attributed to a year is the change
 * from the previous year's last measuring point; for the first year it is the
 * change within that year, which understates it slightly (the series starts
 * mid-history) but never invents growth.
 */
export function buildHistoryYears(history: OsmSnapshot[]): HistoryYear[] {
  const lastPerYear = new Map<string, OsmSnapshot>();
  const firstPerYear = new Map<string, OsmSnapshot>();
  for (const s of history) {
    const year = s.date.slice(0, 4);
    if (!firstPerYear.has(year)) firstPerYear.set(year, s);
    lastPerYear.set(year, s);
  }

  const years = [...lastPerYear.keys()].sort();
  const currentYear = history[history.length - 1]?.date.slice(0, 4);

  return years.map((year, i) => {
    const end = lastPerYear.get(year)!;
    const base =
      i > 0 ? lastPerYear.get(years[i - 1])! : firstPerYear.get(year)!;
    const capacityDelta = end.totalCapacity - base.totalCapacity;
    const deltaCity =
      end.cityCapacity == null || base.cityCapacity == null
        ? 0
        : end.cityCapacity - base.cityCapacity;

    return {
      year,
      capacity: end.totalCapacity,
      facilities: end.totalFacilities,
      capacityDeltaCity: deltaCity,
      capacityDeltaUmland: capacityDelta - deltaCity,
      capacityDelta,
      facilityDelta: end.totalFacilities - base.totalFacilities,
      growthPercent:
        base.totalCapacity > 0 ? (capacityDelta / base.totalCapacity) * 100 : 0,
      partial: year === currentYear,
    };
  });
}

/** Snapshot closest to (and at most) 12 months before `latest`. */
function twelveMonthsBack(history: OsmSnapshot[]): OsmSnapshot {
  const latest = history[history.length - 1];
  const cutoff = new Date(latest.date);
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  const earlier = history.filter((s) => s.date <= cutoffKey);
  return earlier.length > 0 ? earlier[earlier.length - 1] : history[0];
}

export function summarizeHistory(history: OsmSnapshot[]): HistorySummary {
  const first = history[0];
  const latest = history[history.length - 1];
  const yearAgo = twelveMonthsBack(history);
  const capacity12m = latest.totalCapacity - yearAgo.totalCapacity;
  const city = latest.cityCapacity ?? null;

  return {
    firstDate: first.date,
    latestDate: latest.date,
    months: history.length,
    capacityTotal: latest.totalCapacity,
    facilitiesTotal: latest.totalFacilities,
    cityShare:
      city == null || latest.totalCapacity === 0
        ? null
        : (city / latest.totalCapacity) * 100,
    capacity12m,
    capacity12mPercent:
      yearAgo.totalCapacity > 0
        ? (capacity12m / yearAgo.totalCapacity) * 100
        : 0,
    facilities12m: latest.totalFacilities - yearAgo.totalFacilities,
    capacityPerMonth12m: capacity12m / 12,
    avgCapacity:
      latest.totalFacilities > 0
        ? latest.totalCapacity / latest.totalFacilities
        : 0,
    avgCapacityFirst:
      first.totalFacilities > 0
        ? first.totalCapacity / first.totalFacilities
        : 0,
    growthFactor:
      first.totalCapacity > 0 ? latest.totalCapacity / first.totalCapacity : 0,
  };
}
