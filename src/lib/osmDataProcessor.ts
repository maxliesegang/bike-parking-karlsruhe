import { FeatureCollection, Feature, Point } from "geojson";
import { OsmBikeParking } from "@/models/osm-bike-parking";
import { RegionInfo } from "@/models/region";
import { DistrictFeature } from "./osmDataFetcher";
import { districtLookup } from "@/data/karlsruhe-districts";
import { Abstellanlage } from "@/models/abstellanlage";
import { pointInPolygon, polygonAreaKm2 } from "./geoUtils";

const BICYCLE_PARKING_LABELS: Record<string, string> = {
  stands: "Fahrradständer",
  rack: "Fahrradständer",
  wall_loops: "Wandbügel",
  bollard: "Bügel",
  shed: "Fahrradschuppen",
  locker: "Fahrradbox",
  lockers: "Fahrradbox",
  building: "Gebäude",
  ground_slots: "Bodenhalterung",
  two_tier: "Doppelstock",
  parking_meter: "Parkscheinautomat",
  anchors: "Anker",
  handlebar_holder: "Lenkerhalter",
  safe_loop: "Sicherheitsbügel",
  street_side: "Seitenstreifen",
  informal: "Informell",
  lean_to: "Anlehnbügel",
};

// Access values that mark parking as not publicly usable — dropped entirely.
const PRIVATE_ACCESS = new Set(["private", "no", "restricted"]);

function getLabel(key: string | undefined): string {
  if (!key) return "Unbekannt";
  return BICYCLE_PARKING_LABELS[key] || key;
}

/**
 * Build the merged region reference table: the 28 Karlsruhe districts use the
 * authoritative census data in `districtLookup`; surrounding municipalities use
 * the OSM population tag (where present) and an area computed from geometry.
 */
export function buildRegionInfos(districts: DistrictFeature[]): RegionInfo[] {
  return districts
    .filter((d) => d.adminLevel === 8 || d.adminLevel === 9 || d.adminLevel === 10)
    .map((d) => {
      const override = districtLookup.get(d.name);
      return {
        name: d.name,
        adminLevel: d.adminLevel as 8 | 9 | 10,
        population: override?.population ?? d.population ?? null,
        areaKm2: override?.areaKm2 ?? polygonAreaKm2(d.polygons),
      };
    });
}

function findContainingRegion(
  lon: number,
  lat: number,
  districts: DistrictFeature[],
): { region: string; regionLevel: 8 | 9 | 10 | 0 } {
  // Priority: AL10 (Stadtbezirk) > AL9 (Stadtteil) > AL8 (surrounding Gemeinde).
  // AL9+AL10 tile Karlsruhe city; AL8 municipalities are disjoint from it.
  for (const level of [10, 9, 8] as const) {
    for (const d of districts) {
      if (d.adminLevel !== level) continue;
      for (const polygon of d.polygons) {
        if (pointInPolygon(lon, lat, polygon)) {
          return { region: d.name, regionLevel: level };
        }
      }
    }
  }
  return { region: "", regionLevel: 0 };
}

export function processOsmBikeParkingData(
  bikeParkingData: FeatureCollection,
  stadtteilData: DistrictFeature[],
): OsmBikeParking[] {
  return bikeParkingData.features
    .map((item) => {
      const feature = item as Feature<Point>;
      if (!feature.geometry) return null;

      const coords = feature.geometry.coordinates;
      if (!coords || coords.length < 2) return null;

      const props = feature.properties || {};
      const tags = (props.tags || props) as Record<string, string>;

      // Drop non-public parking (private / no / restricted access).
      const access = (tags.access || "").toLowerCase();
      if (PRIVATE_ACCESS.has(access)) return null;

      const lon = coords[0];
      const lat = coords[1];
      const { region, regionLevel } = findContainingRegion(lon, lat, stadtteilData);

      const capacityStr = tags.capacity || "0";
      const capacity = parseInt(capacityStr, 10);

      return {
        id: (feature.id as number) || 0,
        standort: tags.name || tags.street || "",
        art: getLabel(tags.bicycle_parking),
        stellplaetze: isNaN(capacity) ? 0 : capacity,
        region,
        regionLevel,
        covered: tags.covered === "yes" || tags.covered === "true",
        fee: tags.fee === "yes" || tags.fee === "true",
        zugang: tags.access || "",
        betreiber: tags.operator || "",
        // Round to ~1m precision to keep the getStaticProps payload small.
        coordinate0: Math.round(coords[0] * 1e5) / 1e5,
        coordinate1: Math.round(coords[1] * 1e5) / 1e5,
        bemerkung: tags.note || tags.description || "",
      };
    })
    .filter((item): item is OsmBikeParking => item !== null);
}

export interface RegionAnalyse {
  name: string;
  level: 8 | 9 | 10 | 0;
  anlagen: number;
  stellplaetze: number;
  avgStellplaetze: number;
  ueberdacht: number;
  gebuehr: number;
  topTypen: string[];
}

export function generateRegionAnalyse(
  osmBikeParkings: OsmBikeParking[],
): RegionAnalyse[] {
  const map = new Map<
    string,
    {
      name: string;
      level: 8 | 9 | 10 | 0;
      anlagen: number;
      stellplaetze: number;
      ueberdacht: number;
      gebuehr: number;
      typCount: Map<string, number>;
    }
  >();

  for (const p of osmBikeParkings) {
    const key = p.region || "Außerhalb";
    if (!map.has(key)) {
      map.set(key, {
        name: key,
        level: p.regionLevel,
        anlagen: 0,
        stellplaetze: 0,
        ueberdacht: 0,
        gebuehr: 0,
        typCount: new Map(),
      });
    }
    const entry = map.get(key)!;
    entry.anlagen += 1;
    entry.stellplaetze += p.stellplaetze;
    if (p.covered) entry.ueberdacht += 1;
    if (p.fee) entry.gebuehr += 1;
    entry.typCount.set(p.art, (entry.typCount.get(p.art) || 0) + 1);
  }

  return Array.from(map.values())
    .map((entry) => ({
      name: entry.name,
      level: entry.level,
      anlagen: entry.anlagen,
      stellplaetze: entry.stellplaetze,
      avgStellplaetze:
        entry.anlagen > 0
          ? Math.round((entry.stellplaetze / entry.anlagen) * 10) / 10
          : 0,
      ueberdacht: entry.ueberdacht,
      gebuehr: entry.gebuehr,
      topTypen: [...entry.typCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name),
    }))
    .sort((a, b) => b.stellplaetze - a.stellplaetze);
}

export interface TypAnalyse {
  name: string;
  anlagen: number;
  stellplaetze: number;
  avgStellplaetze: number;
}

export function generateTypAnalyse(
  osmBikeParkings: OsmBikeParking[],
): TypAnalyse[] {
  const map = new Map<
    string,
    { name: string; anlagen: number; stellplaetze: number }
  >();

  for (const p of osmBikeParkings) {
    if (!map.has(p.art)) {
      map.set(p.art, { name: p.art, anlagen: 0, stellplaetze: 0 });
    }
    const entry = map.get(p.art)!;
    entry.anlagen += 1;
    entry.stellplaetze += p.stellplaetze;
  }

  return Array.from(map.values())
    .map((entry) => ({
      ...entry,
      avgStellplaetze:
        entry.anlagen > 0
          ? Math.round((entry.stellplaetze / entry.anlagen) * 10) / 10
          : 0,
    }))
    .sort((a, b) => b.anlagen - a.anlagen);
}

export interface AllgemeineStats {
  totalAnlagen: number;
  totalStellplaetze: number;
  avgStellplaetze: number;
  ueberdacht: number;
  ueberdachtProzent: number;
  gebuehr: number;
  gebuehrProzent: number;
  zugangOeffentlich: number;
  zugangEingeschraenkt: number;
  regionenAbgedeckt: number;
  kapazitaetKlein: number;
  kapazitaetMittel: number;
  kapazitaetGross: number;
}

// After the private filter, remaining access values split into public-ish and
// restricted-but-usable (customer/permit/student) buckets.
const RESTRICTED_ACCESS = new Set(["customers", "permit", "students", "permissive"]);

export function generateAllgemeineStats(
  osmBikeParkings: OsmBikeParking[],
): AllgemeineStats {
  const totalAnlagen = osmBikeParkings.length;
  const totalStellplaetze = osmBikeParkings.reduce(
    (sum, p) => sum + p.stellplaetze,
    0,
  );
  const ueberdacht = osmBikeParkings.filter((p) => p.covered).length;
  const gebuehr = osmBikeParkings.filter((p) => p.fee).length;

  const zugangEingeschraenkt = osmBikeParkings.filter((p) =>
    RESTRICTED_ACCESS.has(p.zugang.toLowerCase()),
  ).length;
  const zugangOeffentlich = totalAnlagen - zugangEingeschraenkt;

  const regionenAbgedeckt = new Set(
    osmBikeParkings.filter((p) => p.region).map((p) => p.region),
  ).size;

  const kapazitaetKlein = osmBikeParkings.filter(
    (p) => p.stellplaetze > 0 && p.stellplaetze <= 5,
  ).length;
  const kapazitaetMittel = osmBikeParkings.filter(
    (p) => p.stellplaetze > 5 && p.stellplaetze <= 20,
  ).length;
  const kapazitaetGross = osmBikeParkings.filter(
    (p) => p.stellplaetze > 20,
  ).length;

  return {
    totalAnlagen,
    totalStellplaetze,
    avgStellplaetze:
      totalAnlagen > 0
        ? Math.round((totalStellplaetze / totalAnlagen) * 10) / 10
        : 0,
    ueberdacht,
    ueberdachtProzent:
      totalAnlagen > 0
        ? Math.round((ueberdacht / totalAnlagen) * 1000) / 10
        : 0,
    gebuehr,
    gebuehrProzent:
      totalAnlagen > 0
        ? Math.round((gebuehr / totalAnlagen) * 1000) / 10
        : 0,
    zugangOeffentlich,
    zugangEingeschraenkt,
    regionenAbgedeckt,
    kapazitaetKlein,
    kapazitaetMittel,
    kapazitaetGross,
  };
}

const QUALITY_ART_SCORE: Record<string, number> = {
  Fahrradbox: 10,
  Fahrradschuppen: 8,
  Gebäude: 7,
  Doppelstock: 6,
  Sicherheitsbügel: 5,
  Anlehnbügel: 5,
  Bügel: 4,
  Fahrradständer: 3,
  Bodenhalterung: 3,
  Wandbügel: 3,
  Seitenstreifen: 2,
  Anker: 2,
  Parkscheinautomat: 2,
  Lenkerhalter: 1,
  Informell: 1,
  Unbekannt: 1,
};

export type Bewertung = "gut" | "mittel" | "schlecht" | "unbewertet";

export interface VersorgungEintrag {
  name: string;
  level: 8 | 9 | 10;
  population: number | null;
  areaKm2: number;
  anlagen: number;
  stellplaetze: number;
  pro1000: number | null;
  proKm2: number;
  bewertung: Bewertung;
}

export function generateVersorgungAnalyse(
  osmBikeParkings: OsmBikeParking[],
  regions: RegionInfo[],
): VersorgungEintrag[] {
  const spots = new Map<string, { anlagen: number; stellplaetze: number }>();

  for (const p of osmBikeParkings) {
    if (!p.region) continue;
    if (!spots.has(p.region)) spots.set(p.region, { anlagen: 0, stellplaetze: 0 });
    const entry = spots.get(p.region)!;
    entry.anlagen += 1;
    entry.stellplaetze += p.stellplaetze;
  }

  const results: VersorgungEintrag[] = [];

  for (const info of regions) {
    const s = spots.get(info.name) || { anlagen: 0, stellplaetze: 0 };
    const proKm2 = info.areaKm2 > 0 ? Math.round((s.stellplaetze / info.areaKm2) * 10) / 10 : 0;

    let pro1000: number | null = null;
    let bewertung: Bewertung = "unbewertet";
    if (info.population && info.population > 0) {
      pro1000 = Math.round((s.stellplaetze / info.population) * 1000 * 10) / 10;
      if (pro1000 >= 10) bewertung = "gut";
      else if (pro1000 >= 3) bewertung = "mittel";
      else bewertung = "schlecht";
    }

    results.push({
      name: info.name,
      level: info.adminLevel,
      population: info.population,
      areaKm2: info.areaKm2,
      anlagen: s.anlagen,
      stellplaetze: s.stellplaetze,
      pro1000,
      proKm2,
      bewertung,
    });
  }

  // Rated regions first (worst supply first to surface gaps), unrated last.
  return results.sort((a, b) => {
    if (a.pro1000 === null && b.pro1000 === null) return b.stellplaetze - a.stellplaetze;
    if (a.pro1000 === null) return 1;
    if (b.pro1000 === null) return -1;
    return a.pro1000 - b.pro1000;
  });
}

export interface QualitaetEintrag {
  name: string;
  level: 8 | 9 | 10 | 0;
  score: number;
  anlagen: number;
  stellplaetze: number;
  ueberdachtProzent: number;
  gebuehrProzent: number;
  hochwertig: number;
  haupttyp: string;
}

export function generateQualitaetAnalyse(
  osmBikeParkings: OsmBikeParking[],
): QualitaetEintrag[] {
  const map = new Map<
    string,
    {
      level: 8 | 9 | 10 | 0;
      anlagen: number;
      stellplaetze: number;
      ueberdacht: number;
      gebuehr: number;
      artScores: number[];
      artCount: Map<string, number>;
    }
  >();

  for (const p of osmBikeParkings) {
    if (!p.region) continue;

    if (!map.has(p.region)) {
      map.set(p.region, {
        level: p.regionLevel,
        anlagen: 0,
        stellplaetze: 0,
        ueberdacht: 0,
        gebuehr: 0,
        artScores: [],
        artCount: new Map(),
      });
    }
    const entry = map.get(p.region)!;
    entry.anlagen += 1;
    entry.stellplaetze += p.stellplaetze;
    if (p.covered) entry.ueberdacht += 1;
    if (p.fee) entry.gebuehr += 1;
    entry.artScores.push(QUALITY_ART_SCORE[p.art] || 1);
    entry.artCount.set(p.art, (entry.artCount.get(p.art) || 0) + 1);
  }

  const results: QualitaetEintrag[] = [];

  for (const [name, entry] of map) {
    const avgArtScore =
      entry.artScores.reduce((s, v) => s + v, 0) / entry.artScores.length;
    const ueberdachtBonus = entry.ueberdacht / entry.anlagen;
    const gebuehrMalus = entry.gebuehr / entry.anlagen;
    const score = Math.round((avgArtScore * 0.5 + ueberdachtBonus * 5 - gebuehrMalus * 2) * 10) / 10;

    const topArt = [...entry.artCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 1)
      .map(([a]) => a)[0];

    results.push({
      name,
      level: entry.level,
      score: Math.max(1, Math.min(10, score)),
      anlagen: entry.anlagen,
      stellplaetze: entry.stellplaetze,
      ueberdachtProzent:
        entry.anlagen > 0
          ? Math.round((entry.ueberdacht / entry.anlagen) * 100)
          : 0,
      gebuehrProzent:
        entry.anlagen > 0
          ? Math.round((entry.gebuehr / entry.anlagen) * 100)
          : 0,
      hochwertig: entry.artScores.filter((s) => s >= 7).length,
      haupttyp: topArt || "Unbekannt",
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

export interface TopFacility {
  standort: string;
  region: string;
  art: string;
  stellplaetze: number;
}

/** Largest single facilities by capacity — typically transit hubs. */
export function generateTopFacilities(
  osmBikeParkings: OsmBikeParking[],
  n = 10,
): TopFacility[] {
  return [...osmBikeParkings]
    .sort((a, b) => b.stellplaetze - a.stellplaetze)
    .slice(0, n)
    .map((p) => ({
      standort: p.standort || "(ohne Namen)",
      region: p.region || "Außerhalb",
      art: p.art,
      stellplaetze: p.stellplaetze,
    }));
}

export interface VergleichEintrag {
  kategorie: string;
  osm: number;
  stadt: number;
}

export function generateVergleichDaten(
  osmBikeParkings: OsmBikeParking[],
  abstellanlagen: Abstellanlage[],
): VergleichEintrag[] {
  const osmInKa = osmBikeParkings.filter(
    (p) => p.regionLevel === 9 || p.regionLevel === 10,
  ).length;

  const stadtInKa = abstellanlagen.filter(
    (a) => a.gemeinde === "Karlsruhe",
  ).length;

  return [
    { kategorie: "Erfasste Anlagen (gesamt)", osm: osmBikeParkings.length, stadt: abstellanlagen.length },
    { kategorie: "Davon in Karlsruhe", osm: osmInKa, stadt: stadtInKa },
  ];
}
