import { FeatureCollection, Feature, Point } from "geojson";
import { OsmBikeParking } from "@/models/osm-bike-parking";
import { DistrictFeature } from "./osmDataFetcher";
import { districtLookup } from "@/data/karlsruhe-districts";
import { Abstellanlage } from "@/models/abstellanlage";

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

function getLabel(key: string | undefined): string {
  if (!key) return "Unbekannt";
  return BICYCLE_PARKING_LABELS[key] || key;
}

function pointInPolygon(
  px: number,
  py: number,
  polygon: number[][][],
): boolean {
  const ring = polygon[0];
  if (!ring || ring.length < 3) return false;

  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function findContainingDistrict(
  lon: number,
  lat: number,
  districts: DistrictFeature[],
): { stadtbezirk: string; stadtteil: string } {
  for (const d of districts) {
    if (d.adminLevel !== 10) continue;
    for (const polygon of d.polygons) {
      if (pointInPolygon(lon, lat, polygon)) {
        return { stadtbezirk: d.name, stadtteil: "" };
      }
    }
  }

  for (const d of districts) {
    if (d.adminLevel !== 9) continue;
    for (const polygon of d.polygons) {
      if (pointInPolygon(lon, lat, polygon)) {
        return { stadtbezirk: "", stadtteil: d.name };
      }
    }
  }

  return { stadtbezirk: "", stadtteil: "" };
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

      const lon = coords[0];
      const lat = coords[1];
      const { stadtbezirk, stadtteil } = findContainingDistrict(
        lon,
        lat,
        stadtteilData,
      );

      const capacityStr = tags.capacity || "0";
      const capacity = parseInt(capacityStr, 10);

      return {
        id: (feature.id as number) || 0,
        standort: tags.name || tags.street || "",
        art: getLabel(tags.bicycle_parking),
        stellplaetze: isNaN(capacity) ? 0 : capacity,
        stadtbezirk,
        stadtteil,
        covered: tags.covered === "yes" || tags.covered === "true",
        fee: tags.fee === "yes" || tags.fee === "true",
        zugang: tags.access || "",
        betreiber: tags.operator || "",
        coordinate0: coords[0],
        coordinate1: coords[1],
        bemerkung: tags.note || tags.description || "",
      };
    })
    .filter((item): item is OsmBikeParking => item !== null);
}

export interface StadtbezirkAnalyse {
  name: string;
  anlagen: number;
  stellplaetze: number;
  avgStellplaetze: number;
  ueberdacht: number;
  gebuehr: number;
  topTypen: string[];
}

export function generateStadtbezirkAnalyse(
  osmBikeParkings: OsmBikeParking[],
): StadtbezirkAnalyse[] {
  const map = new Map<
    string,
    {
      name: string;
      anlagen: number;
      stellplaetze: number;
      ueberdacht: number;
      gebuehr: number;
      typCount: Map<string, number>;
    }
  >();

  for (const p of osmBikeParkings) {
    const key = p.stadtbezirk || p.stadtteil || "Außerhalb";
    if (!map.has(key)) {
      map.set(key, {
        name: key,
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
  zugangPrivat: number;
  zugangUnbekannt: number;
  kapazitaetKlein: number;
  kapazitaetMittel: number;
  kapazitaetGross: number;
}

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

  const zugangOeffentlich = osmBikeParkings.filter(
    (p) => p.zugang === "" || p.zugang === "yes" || p.zugang === "public",
  ).length;
  const zugangPrivat = osmBikeParkings.filter(
    (p) => p.zugang === "private" || p.zugang === "customers" || p.zugang === "restricted",
  ).length;
  const zugangUnbekannt = totalAnlagen - zugangOeffentlich - zugangPrivat;

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
    zugangPrivat,
    zugangUnbekannt,
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

export interface VersorgungEintrag {
  name: string;
  population: number;
  areaKm2: number;
  anlagen: number;
  stellplaetze: number;
  pro1000: number;
  proKm2: number;
  bewertung: "gut" | "mittel" | "schlecht";
}

export function generateVersorgungAnalyse(
  osmBikeParkings: OsmBikeParking[],
): VersorgungEintrag[] {
  const districtSpots = new Map<string, { anlagen: number; stellplaetze: number }>();

  for (const p of osmBikeParkings) {
    const key = p.stadtbezirk || p.stadtteil;
    if (!key) continue;
    if (!districtLookup.has(key)) continue;
    if (!districtSpots.has(key)) {
      districtSpots.set(key, { anlagen: 0, stellplaetze: 0 });
    }
    const entry = districtSpots.get(key)!;
    entry.anlagen += 1;
    entry.stellplaetze += p.stellplaetze;
  }

  const results: VersorgungEintrag[] = [];

  for (const [name, spots] of districtSpots) {
    const info = districtLookup.get(name);
    if (!info) continue;

    const pro1000 = Math.round((spots.stellplaetze / info.population) * 1000 * 10) / 10;
    const proKm2 = Math.round((spots.stellplaetze / info.areaKm2) * 10) / 10;

    let bewertung: "gut" | "mittel" | "schlecht";
    if (pro1000 >= 10) bewertung = "gut";
    else if (pro1000 >= 3) bewertung = "mittel";
    else bewertung = "schlecht";

    results.push({
      name,
      population: info.population,
      areaKm2: info.areaKm2,
      anlagen: spots.anlagen,
      stellplaetze: spots.stellplaetze,
      pro1000,
      proKm2,
      bewertung,
    });
  }

  return results.sort((a, b) => a.pro1000 - b.pro1000);
}

export interface QualitaetEintrag {
  name: string;
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
      anlagen: number;
      stellplaetze: number;
      ueberdacht: number;
      gebuehr: number;
      artScores: number[];
      artCount: Map<string, number>;
    }
  >();

  for (const p of osmBikeParkings) {
    const key = p.stadtbezirk || p.stadtteil;
    if (!key || !districtLookup.has(key)) continue;

    if (!map.has(key)) {
      map.set(key, {
        anlagen: 0,
        stellplaetze: 0,
        ueberdacht: 0,
        gebuehr: 0,
        artScores: [],
        artCount: new Map(),
      });
    }
    const entry = map.get(key)!;
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
    (p) => districtLookup.has(p.stadtbezirk || p.stadtteil),
  ).length;

  const stadtInKa = abstellanlagen.filter(
    (a) => a.gemeinde === "Karlsruhe",
  ).length;

  return [
    { kategorie: "Erfasste Anlagen (gesamt)", osm: osmBikeParkings.length, stadt: abstellanlagen.length },
    { kategorie: "Davon in Karlsruhe", osm: osmInKa, stadt: stadtInKa },
  ];
}
