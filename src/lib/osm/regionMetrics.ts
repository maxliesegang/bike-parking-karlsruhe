// Per-region analyses for the /analyse page.
//
// The guiding constraint: regions are not directly comparable. A Karlsruhe
// Innenstadt-Bezirk with 6.000 residents and a mainline station is a different
// animal from Stupferich, a village of 2.949 that happens to lie inside the
// same city limits. Two devices keep the comparisons honest:
//
//   1. Peer groups — regions are ranked and rated only against others of the
//      same settlement type, never across types. The typing lives in
//      [peerGroups.ts](./peerGroups.ts); the rating against the group median in
//      `rateWithinGroup`.
//   2. The hub split — capacity at bike-and-ride facilities and very large
//      installations serves arriving commuters, not residents. It is reported
//      separately from the everyday, neighbourhood-level supply that per-capita
//      figures are actually about (see `isHub`).
//
// Everything here is derived from tags that are actually present in the data;
// where coverage is thin (`lit`, survey dates) the share is taken over the
// tagged subset and the coverage itself is reported in the completeness view.

import { OsmBikeParking } from "@/models/osm-bike-parking";
import { RegionInfo } from "@/models/region";
import { round, percent, median, average } from "../math";
import { increment, topKeys } from "../collections";
import { distanceM } from "../geoUtils";
import { SECURE_TYPES } from "./labels";
import { RegionLevel } from "./regions";
import { PeerGroup, PEER_GROUPS, peerGroupOf } from "./peerGroups";

/**
 * The settlement type of a region, by name. The analyses below see only
 * parkings, which carry their region's name but none of its reference data.
 * Regions absent from the map cannot occur — `parseOsmBikeParking` drops points
 * outside every boundary — so the fallback only keeps the types total.
 */
type GroupLookup = Map<string, PeerGroup>;

const groupOf = (groups: GroupLookup, region: string): PeerGroup =>
  groups.get(region) ?? "umland";

/**
 * Capacity at or above this counts as hub infrastructure even without a
 * `bike_ride` tag. Set well above what any street-side installation reaches, so
 * it catches unlabelled station and campus facilities without swallowing
 * ordinary neighbourhood supply.
 */
export const HUB_MIN_CAPACITY = 100;

/**
 * Serves arriving traffic (station, campus, park-and-ride) rather than the
 * surrounding neighbourhood. Its capacity is excluded from the per-resident
 * figures, which would otherwise credit a district for a station its own
 * residents mostly walk away from.
 */
export function isHub(p: OsmBikeParking): boolean {
  return p.bikeRide || p.capacity >= HUB_MIN_CAPACITY;
}

/**
 * A region whose numbers should be read with care: too few facilities to be
 * statistically meaningful, or so much missing `capacity` tagging that the
 * capacity sum understates reality. Surfaces the difference between "poorly
 * supplied" and "poorly mapped".
 */
const MIN_FACILITIES_FOR_CONFIDENCE = 5;
const MIN_CAPACITY_TAGGING_PERCENT = 80;

export type Rating = "good" | "medium" | "poor" | "unrated";

// --- Shared grouping -------------------------------------------------------

type RegionGroups = Map<string, OsmBikeParking[]>;

function groupByRegion(parkings: OsmBikeParking[]): RegionGroups {
  const map: RegionGroups = new Map();
  for (const p of parkings) {
    const list = map.get(p.region);
    if (list) list.push(p);
    else map.set(p.region, [p]);
  }
  return map;
}

const sumCapacity = (parkings: OsmBikeParking[]): number =>
  parkings.reduce((sum, p) => sum + p.capacity, 0);

const shareOf = (parkings: OsmBikeParking[], n: number): number =>
  percent(n, parkings.length, 0);

/**
 * Median distance from a facility to its nearest neighbour, in metres. An
 * area-independent density measure: unlike "pro km²" it is unaffected by the
 * forest and farmland that make up most of the outer districts, and it answers
 * the question a cyclist actually has — how far to the next rack.
 *
 * O(n²) per region; the largest region holds a few hundred points.
 */
function medianNearestNeighbourM(parkings: OsmBikeParking[]): number | null {
  if (parkings.length < 2) return null;
  const distances = parkings.map((a) => {
    let nearest = Infinity;
    for (const b of parkings) {
      if (b === a) continue;
      const d = distanceM(a.lng, a.lat, b.lng, b.lat);
      if (d < nearest) nearest = d;
    }
    return nearest;
  });
  return Math.round(median(distances, 0));
}

/** Share of a region's capacity sitting in its three largest facilities. */
function topThreeSharePercent(parkings: OsmBikeParking[]): number {
  const capacity = sumCapacity(parkings);
  if (capacity === 0) return 0;
  const top = [...parkings]
    .sort((a, b) => b.capacity - a.capacity)
    .slice(0, 3)
    .reduce((sum, p) => sum + p.capacity, 0);
  return percent(top, capacity, 0);
}

/**
 * Floor under the comparison baseline. The villages' median everyday supply is
 * 0,7 spaces per 1.000 residents — against that, five spaces in Palmbach come
 * out as nearly four times the group and would be badged "good". A ratio to a
 * near-zero median measures nothing, so the baseline never drops below a level
 * at which being above it means something.
 */
const MIN_RATING_BASELINE = 5;

export const ratingBaselineOf = (groupMedian: number): number =>
  Math.max(groupMedian, MIN_RATING_BASELINE);

/**
 * Rate a value against the median of its own peer group rather than against
 * fixed thresholds. Absolute per-capita targets (the ADFC's ~25 spaces per
 * 1.000 residents) are city-wide figures and break down at district level, so
 * the useful question is "well or poorly supplied *for a district like this*".
 */
function rateWithinGroup(value: number, baseline: number): Rating {
  if (baseline <= 0) return "unrated";
  const ratio = value / baseline;
  if (ratio >= 1.25) return "good";
  if (ratio <= 0.6) return "poor";
  return "medium";
}

// --- Supply ----------------------------------------------------------------

export interface SupplyEntry {
  name: string;
  level: RegionLevel;
  group: PeerGroup;
  population: number | null;
  facilities: number;
  capacity: number;
  /** Capacity outside hubs — the neighbourhood-level supply. */
  everydayCapacity: number;
  hubCapacity: number;
  hubFacilities: number;
  hubPercent: number;
  /** Everyday capacity per 1.000 residents; null without population data. */
  everydayPerThousand: number | null;
  /** All capacity per 1.000 residents, hubs included. */
  perThousand: number | null;
  nearestMedianM: number | null;
  topThreePercent: number;
  rating: Rating;
  /** Group median of `everydayPerThousand`. */
  groupMedian: number | null;
  /** What `rating` actually compares to: the group median, floored. */
  ratingBaseline: number;
  sparselyMapped: boolean;
}

export function generateSupplyAnalysis(
  parkings: OsmBikeParking[],
  regions: RegionInfo[],
): SupplyEntry[] {
  const byRegion = groupByRegion(parkings);

  const base = regions.map((info) => {
    const ps = byRegion.get(info.name) ?? [];
    const capacity = sumCapacity(ps);
    const hubs = ps.filter(isHub);
    const hubCapacity = sumCapacity(hubs);
    const everydayCapacity = capacity - hubCapacity;
    const population =
      info.population && info.population > 0 ? info.population : null;
    const perThousand = (value: number) =>
      population === null ? null : round((value / population) * 1000);

    return {
      name: info.name,
      level: info.adminLevel,
      group: peerGroupOf(info),
      population,
      facilities: ps.length,
      capacity,
      everydayCapacity,
      hubCapacity,
      hubFacilities: hubs.length,
      hubPercent: percent(hubCapacity, capacity, 0),
      everydayPerThousand: perThousand(everydayCapacity),
      perThousand: perThousand(capacity),
      nearestMedianM: medianNearestNeighbourM(ps),
      topThreePercent: topThreeSharePercent(ps),
      sparselyMapped:
        ps.length < MIN_FACILITIES_FOR_CONFIDENCE ||
        shareOf(ps, ps.filter((p) => p.capacityTagged).length) <
          MIN_CAPACITY_TAGGING_PERCENT,
    };
  });

  // Peer-group medians define the rating scale, computed over rated regions
  // only so that Gemeinden without population data don't drag it down.
  const groupMedians = new Map<PeerGroup, number>();
  for (const group of PEER_GROUPS) {
    const values = base
      .filter((e) => e.group === group && e.everydayPerThousand !== null)
      .map((e) => e.everydayPerThousand as number);
    groupMedians.set(group, median(values));
  }

  return base
    .map((e): SupplyEntry => {
      const groupMedian = groupMedians.get(e.group) ?? 0;
      const ratingBaseline = ratingBaselineOf(groupMedian);
      return {
        ...e,
        groupMedian: groupMedian > 0 ? groupMedian : null,
        ratingBaseline,
        rating:
          e.everydayPerThousand === null
            ? "unrated"
            : rateWithinGroup(e.everydayPerThousand, ratingBaseline),
      };
    })
    .sort((a, b) => {
      // Worst supply first to surface gaps; unrated regions last.
      if (a.everydayPerThousand === null && b.everydayPerThousand === null)
        return b.capacity - a.capacity;
      if (a.everydayPerThousand === null) return 1;
      if (b.everydayPerThousand === null) return -1;
      return a.everydayPerThousand - b.everydayPerThousand;
    });
}

// --- Quality ---------------------------------------------------------------

export interface QualityEntry {
  name: string;
  level: RegionLevel;
  group: PeerGroup;
  facilities: number;
  capacity: number;
  coveredPercent: number;
  /** Lockable/enclosed types (Box, Schuppen, Gebäude, Doppelstock). */
  securePercent: number;
  secureFacilities: number;
  feePercent: number;
  /** Share of the *tagged* facilities that are lit. */
  litPercent: number | null;
  litTaggedPercent: number;
  mainType: string;
}

/**
 * Concrete, checkable shares instead of a composite score. The previous 1–10
 * index mixed type weights, coverage and fees into one number that could not be
 * traced back to anything on the ground; each column here is a fact about the
 * region that a mapper could go and verify.
 */
export function generateQualityAnalysis(
  parkings: OsmBikeParking[],
  groups: GroupLookup,
): QualityEntry[] {
  const results: QualityEntry[] = [];

  for (const [name, ps] of groupByRegion(parkings)) {
    const typeCounts = new Map<string, number>();
    for (const p of ps) increment(typeCounts, p.type);

    const secure = ps.filter((p) => SECURE_TYPES.has(p.type));
    const litTagged = ps.filter((p) => p.litTagged);

    results.push({
      name,
      level: ps[0].regionLevel,
      group: groupOf(groups, name),
      facilities: ps.length,
      capacity: sumCapacity(ps),
      coveredPercent: shareOf(ps, ps.filter((p) => p.covered).length),
      securePercent: shareOf(ps, secure.length),
      secureFacilities: secure.length,
      feePercent: shareOf(ps, ps.filter((p) => p.fee).length),
      litPercent:
        litTagged.length > 0
          ? percent(litTagged.filter((p) => p.lit).length, litTagged.length, 0)
          : null,
      litTaggedPercent: shareOf(ps, litTagged.length),
      mainType: topKeys(typeCounts, 1)[0] ?? "Unbekannt",
    });
  }

  return results.sort((a, b) => b.coveredPercent - a.coveredPercent);
}

// --- Bike and ride ---------------------------------------------------------

export interface BikeRideEntry {
  name: string;
  level: RegionLevel;
  group: PeerGroup;
  facilities: number;
  capacity: number;
  /** Capacity of the single largest B+R facility in the region. */
  largest: number;
  coveredPercent: number;
  securePercent: number;
  /** Share of the region's whole capacity that is B+R. */
  shareOfRegionPercent: number;
}

export interface BikeRideSummary {
  facilities: number;
  capacity: number;
  capacityPercent: number;
  regions: number;
  coveredPercent: number;
  securePercent: number;
}

/**
 * Bike-and-ride capacity per region. Aggregated rather than listed per facility
 * because barely any OSM bicycle-parking feature here carries a `name` tag — a
 * facility list would be a column of "Anlage in …" placeholders, while the
 * regional sum reads directly as the station it belongs to.
 */
export function generateBikeRideAnalysis(
  parkings: OsmBikeParking[],
  groups: GroupLookup,
): BikeRideEntry[] {
  const totalByRegion = new Map<string, number>();
  for (const p of parkings) increment(totalByRegion, p.region, p.capacity);

  const results: BikeRideEntry[] = [];
  for (const [name, ps] of groupByRegion(parkings.filter((p) => p.bikeRide))) {
    const capacity = sumCapacity(ps);
    results.push({
      name,
      level: ps[0].regionLevel,
      group: groupOf(groups, name),
      facilities: ps.length,
      capacity,
      largest: Math.max(...ps.map((p) => p.capacity)),
      coveredPercent: shareOf(ps, ps.filter((p) => p.covered).length),
      securePercent: shareOf(
        ps,
        ps.filter((p) => SECURE_TYPES.has(p.type)).length,
      ),
      shareOfRegionPercent: percent(capacity, totalByRegion.get(name) ?? 0, 0),
    });
  }

  return results.sort((a, b) => b.capacity - a.capacity);
}

export function summarizeBikeRide(parkings: OsmBikeParking[]): BikeRideSummary {
  const br = parkings.filter((p) => p.bikeRide);
  const capacity = sumCapacity(br);
  return {
    facilities: br.length,
    capacity,
    capacityPercent: percent(capacity, sumCapacity(parkings), 0),
    regions: new Set(br.map((p) => p.region)).size,
    coveredPercent: shareOf(br, br.filter((p) => p.covered).length),
    securePercent: shareOf(
      br,
      br.filter((p) => SECURE_TYPES.has(p.type)).length,
    ),
  };
}

// --- Completeness ----------------------------------------------------------

export interface CompletenessEntry {
  name: string;
  level: RegionLevel;
  group: PeerGroup;
  facilities: number;
  capacityTaggedPercent: number;
  coveredTaggedPercent: number;
  accessTaggedPercent: number;
  litTaggedPercent: number;
  /** Mean of the four tag-coverage columns. */
  taggingPercent: number;
  /** Share with any survey date at all. */
  checkedPercent: number;
  /** Newest survey date in the region, "" when none was ever recorded. */
  lastCheck: string;
}

export interface CompletenessSummary {
  capacityTaggedPercent: number;
  coveredTaggedPercent: number;
  accessTaggedPercent: number;
  litTaggedPercent: number;
  checkedPercent: number;
  /** Regions below the confidence threshold used by the supply view. */
  sparseRegions: number;
}

/**
 * How completely each region is tagged. This is the caveat behind every other
 * table on the page: a region can look badly supplied simply because nobody has
 * mapped it. It doubles as a to-do list — the low rows are where a contributor
 * adds the most value.
 */
export function generateCompletenessAnalysis(
  parkings: OsmBikeParking[],
  groups: GroupLookup,
): CompletenessEntry[] {
  const results: CompletenessEntry[] = [];

  for (const [name, ps] of groupByRegion(parkings)) {
    const capacityTaggedPercent = shareOf(
      ps,
      ps.filter((p) => p.capacityTagged).length,
    );
    const coveredTaggedPercent = shareOf(
      ps,
      ps.filter((p) => p.coveredTagged).length,
    );
    const accessTaggedPercent = shareOf(ps, ps.filter((p) => p.access).length);
    const litTaggedPercent = shareOf(ps, ps.filter((p) => p.litTagged).length);
    const checked = ps.filter((p) => p.checkDate);

    results.push({
      name,
      level: ps[0].regionLevel,
      group: groupOf(groups, name),
      facilities: ps.length,
      capacityTaggedPercent,
      coveredTaggedPercent,
      accessTaggedPercent,
      litTaggedPercent,
      taggingPercent: average(
        [
          capacityTaggedPercent,
          coveredTaggedPercent,
          accessTaggedPercent,
          litTaggedPercent,
        ],
        0,
      ),
      checkedPercent: shareOf(ps, checked.length),
      lastCheck:
        checked
          .map((p) => p.checkDate)
          .sort()
          .pop() ?? "",
    });
  }

  return results.sort((a, b) => a.taggingPercent - b.taggingPercent);
}

export function summarizeCompleteness(
  parkings: OsmBikeParking[],
  supply: SupplyEntry[],
): CompletenessSummary {
  return {
    capacityTaggedPercent: shareOf(
      parkings,
      parkings.filter((p) => p.capacityTagged).length,
    ),
    coveredTaggedPercent: shareOf(
      parkings,
      parkings.filter((p) => p.coveredTagged).length,
    ),
    accessTaggedPercent: shareOf(
      parkings,
      parkings.filter((p) => p.access).length,
    ),
    litTaggedPercent: shareOf(
      parkings,
      parkings.filter((p) => p.litTagged).length,
    ),
    checkedPercent: shareOf(
      parkings,
      parkings.filter((p) => p.checkDate).length,
    ),
    sparseRegions: supply.filter((e) => e.sparselyMapped).length,
  };
}
