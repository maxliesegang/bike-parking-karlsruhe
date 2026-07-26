import { OsmBikeParking } from "@/models/osm-bike-parking";
import { Abstellanlage } from "@/models/abstellanlage";
import { percent, mean } from "../math";
import { RESTRICTED_ACCESS } from "./labels";

const totalCapacity = (parkings: OsmBikeParking[]): number =>
  parkings.reduce((sum, p) => sum + p.capacity, 0);

// --- Overview KPIs ---------------------------------------------------------

export interface OverviewStats {
  totalFacilities: number;
  totalCapacity: number;
  avgCapacity: number;
  covered: number;
  coveredPercent: number;
  fee: number;
  feePercent: number;
  publicAccess: number;
  restrictedAccess: number;
  regionsCovered: number;
  karlsruheFacilities: number;
  karlsruheCapacity: number;
  smallCapacity: number;
  mediumCapacity: number;
  largeCapacity: number;
}

export function generateOverviewStats(
  parkings: OsmBikeParking[],
): OverviewStats {
  const total = parkings.length;
  const capacity = totalCapacity(parkings);
  const covered = parkings.filter((p) => p.covered).length;
  const fee = parkings.filter((p) => p.fee).length;
  const restrictedAccess = parkings.filter((p) =>
    RESTRICTED_ACCESS.has(p.access.toLowerCase()),
  ).length;

  // Karlsruhe city is the AL9/AL10 partition (surrounding municipalities are AL8).
  const inKarlsruhe = parkings.filter(
    (p) => p.regionLevel === 9 || p.regionLevel === 10,
  );

  return {
    totalFacilities: total,
    totalCapacity: capacity,
    avgCapacity: mean(capacity, total),
    covered,
    coveredPercent: percent(covered, total),
    fee,
    feePercent: percent(fee, total),
    publicAccess: total - restrictedAccess,
    restrictedAccess,
    regionsCovered: new Set(
      parkings.filter((p) => p.region).map((p) => p.region),
    ).size,
    karlsruheFacilities: inKarlsruhe.length,
    karlsruheCapacity: totalCapacity(inKarlsruhe),
    smallCapacity: parkings.filter((p) => p.capacity > 0 && p.capacity <= 5)
      .length,
    mediumCapacity: parkings.filter((p) => p.capacity > 5 && p.capacity <= 20)
      .length,
    largeCapacity: parkings.filter((p) => p.capacity > 20).length,
  };
}

// --- Per-type aggregation --------------------------------------------------

export interface TypeStats {
  name: string;
  facilities: number;
  capacity: number;
  avgCapacity: number;
}

export function generateTypeStats(parkings: OsmBikeParking[]): TypeStats[] {
  const map = new Map<string, { facilities: number; capacity: number }>();
  for (const p of parkings) {
    let entry = map.get(p.type);
    if (!entry) {
      entry = { facilities: 0, capacity: 0 };
      map.set(p.type, entry);
    }
    entry.facilities += 1;
    entry.capacity += p.capacity;
  }

  return [...map.entries()]
    .map(([name, e]) => ({
      name,
      facilities: e.facilities,
      capacity: e.capacity,
      avgCapacity: mean(e.capacity, e.facilities),
    }))
    .sort((a, b) => b.facilities - a.facilities);
}

// --- Largest facilities ----------------------------------------------------

export interface TopFacility {
  // 1-based rank by capacity; mirrors the numbered markers on the focus map.
  rank: number;
  // Always a meaningful label — site name, else operator, else "Anlage in
  // <Region>", else the type — so the table never shows a bare placeholder.
  name: string;
  region: string;
  type: string;
  covered: boolean;
  fee: boolean;
  capacity: number;
  lat: number;
  lng: number;
}

/** A descriptive label for a facility that may lack a `name`/`operator` tag. */
function facilityLabel(p: OsmBikeParking): string {
  if (p.name) return p.name;
  if (p.operator) return p.operator;
  if (p.region) return `Anlage in ${p.region}`;
  return p.type;
}

/** Largest single facilities by capacity — typically transit hubs. */
export function generateTopFacilities(
  parkings: OsmBikeParking[],
  n = 10,
): TopFacility[] {
  return [...parkings]
    .sort((a, b) => b.capacity - a.capacity)
    .slice(0, n)
    .map((p, i) => ({
      rank: i + 1,
      name: facilityLabel(p),
      region: p.region || "Außerhalb",
      type: p.type,
      covered: p.covered,
      fee: p.fee,
      capacity: p.capacity,
      lat: p.lat,
      lng: p.lng,
    }));
}

// --- Comparison with the Stadt Karlsruhe dataset ---------------------------

export interface ComparisonEntry {
  category: string;
  osm: number;
  city: number;
}

const sumStellplaetze = (anlagen: Abstellanlage[]): number =>
  anlagen.reduce((sum, a) => sum + (a.stellplaetze || 0), 0);

export function generateComparison(
  parkings: OsmBikeParking[],
  abstellanlagen: Abstellanlage[],
): ComparisonEntry[] {
  const osmInKa = parkings.filter(
    (p) => p.regionLevel === 9 || p.regionLevel === 10,
  );
  const cityInKa = abstellanlagen.filter((a) => a.gemeinde === "Karlsruhe");

  return [
    {
      category: "Erfasste Anlagen (gesamt)",
      osm: parkings.length,
      city: abstellanlagen.length,
    },
    {
      category: "Anlagen in Karlsruhe",
      osm: osmInKa.length,
      city: cityInKa.length,
    },
    {
      category: "Stellplätze (gesamt)",
      osm: totalCapacity(parkings),
      city: sumStellplaetze(abstellanlagen),
    },
    {
      category: "Stellplätze in Karlsruhe",
      osm: totalCapacity(osmInKa),
      city: sumStellplaetze(cityInKa),
    },
  ];
}

// --- Coverage / quality of each source's tagging --------------------------

export interface CoverageEntry {
  category: string;
  osm: string;
  city: string;
}

/**
 * How completely each source describes its facilities. The Stadt-Karlsruhe
 * dataset records a fixed schema for every entry; OpenStreetMap is crowd-tagged
 * and uneven, so this surfaces where each is strong.
 */
export function generateCoverageComparison(
  parkings: OsmBikeParking[],
  abstellanlagen: Abstellanlage[],
): CoverageEntry[] {
  const osmTotal = parkings.length || 1;
  const cityTotal = abstellanlagen.length || 1;

  const osmPct = (n: number) => `${percent(n, osmTotal)} %`;
  const cityPct = (n: number) => `${percent(n, cityTotal)} %`;

  return [
    {
      category: "mit Stellplatz-Angabe",
      osm: osmPct(parkings.filter((p) => p.capacity > 0).length),
      city: cityPct(abstellanlagen.filter((a) => a.stellplaetze > 0).length),
    },
    {
      category: "mit Standort-/Namensangabe",
      osm: osmPct(parkings.filter((p) => p.name).length),
      city: cityPct(abstellanlagen.filter((a) => a.standort).length),
    },
    {
      category: "Bike-and-Ride erfasst",
      osm: "—",
      city: cityPct(
        abstellanlagen.filter((a) => a.b_r && a.b_r !== "nein").length,
      ),
    },
    {
      category: "Lastenrad-tauglich erfasst",
      osm: "—",
      city: cityPct(abstellanlagen.filter((a) => a.lastenrad).length),
    },
  ];
}
