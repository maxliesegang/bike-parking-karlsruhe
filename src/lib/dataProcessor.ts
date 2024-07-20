import { FeatureCollection, Feature, Point } from "geojson";
import { Abstellanlage } from "../models/abstellanlage";
import { Stadtteil } from "../models/stadtteil";
import { BRStation } from "../models/br-station";
import { FeatureProperties } from "../models/feature-properties";
import { Gemeinde } from "@/models/gemeinde";
import { firstFetchedManager } from "./firstFetchedMapper";

const TRUE_VALUE = "T";

export function processGeoJsonToAbstellanlagen(
  data: FeatureCollection,
): Abstellanlage[] {
  return data.features.map((item) =>
    mapFeatureToAbstellanlage(item as Feature<Point, FeatureProperties>),
  );
}

function mapFeatureToAbstellanlage(
  feature: Feature<Point, FeatureProperties>,
): Abstellanlage {
  const { properties, geometry } = feature;

  return {
    id: properties.id,
    fid: feature.id as string,
    coordinate0: geometry.coordinates[0],
    coordinate1: geometry.coordinates[1],
    art: properties.art,
    standort: properties.standort,
    gemeinde: properties.gemeinde,
    stadtteil: properties.stadtteil,
    stellplaetze: properties.stellplaetze,
    b_r: properties.bike_and_ride || "",
    e_ladestation: properties.e_ladestation === TRUE_VALUE,
    lastenrad: properties.lastenrad === TRUE_VALUE,
    mit_anhaenger: properties.mit_anhaenger === TRUE_VALUE,
    link: properties.link || "",
    bemerkung: properties.bemerkung,
    firstFetched: firstFetchedManager.getFirstFetchedDate(properties.id),
    lastUpdated: new Date(properties.stand).toISOString(), // Convert to ISO string
  };
}

export function generateStadtteileData(
  abstellanlagen: Abstellanlage[],
): Stadtteil[] {
  const stadtteileMap = abstellanlagen.reduce(
    (acc, item) => {
      if (!acc[item.stadtteil]) {
        acc[item.stadtteil] = {
          name: item.stadtteil,
          stellplaetze: 0,
          anlagen: 0,
          anlagenOhneStellplatzangabe: 0,
        };
      }

      acc[item.stadtteil].anlagen += 1;

      if (item.stellplaetze && !isNaN(item.stellplaetze)) {
        acc[item.stadtteil].stellplaetze += item.stellplaetze;
      } else {
        acc[item.stadtteil].anlagenOhneStellplatzangabe += 1;
      }

      return acc;
    },
    {} as Record<string, Stadtteil>,
  );

  return Object.values(stadtteileMap).sort(
    (a, b) => b.stellplaetze - a.stellplaetze,
  );
}

export function generateBRStationsData(
  abstellanlagen: Abstellanlage[],
): BRStation[] {
  const stationsMap = abstellanlagen.reduce(
    (acc, item) => {
      if (item.b_r) {
        item.b_r.split(",").forEach((stationName) => {
          const trimmedName = stationName.trim();
          if (!acc[trimmedName]) {
            acc[trimmedName] = {
              name: trimmedName,
              stellplaetze: 0,
              abstellanlagen: 0,
              gemeinde: item.gemeinde, // Add this line
            };
          }
          acc[trimmedName].stellplaetze += item.stellplaetze || 0;
          acc[trimmedName].abstellanlagen += 1;
        });
      }
      return acc;
    },
    {} as Record<string, BRStation>,
  );

  return Object.values(stationsMap).sort(
    (a, b) => b.stellplaetze - a.stellplaetze,
  );
}

export function generateGemeindenData(
  abstellanlagen: Abstellanlage[],
): Gemeinde[] {
  const gemeindenMap = abstellanlagen.reduce(
    (acc, item) => {
      if (!acc[item.gemeinde]) {
        acc[item.gemeinde] = {
          name: item.gemeinde,
          stellplaetze: 0,
          anlagen: 0,
          anlagenOhneStellplatzangabe: 0,
          stadtteile: [],
        };
      }

      acc[item.gemeinde].anlagen += 1;

      if (item.stellplaetze && !isNaN(item.stellplaetze)) {
        acc[item.gemeinde].stellplaetze += item.stellplaetze;
      } else {
        acc[item.gemeinde].anlagenOhneStellplatzangabe += 1;
      }

      if (!acc[item.gemeinde].stadtteile.includes(item.stadtteil)) {
        acc[item.gemeinde].stadtteile.push(item.stadtteil);
      }

      return acc;
    },
    {} as Record<string, Gemeinde>,
  );

  return Object.values(gemeindenMap).sort(
    (a, b) => b.stellplaetze - a.stellplaetze,
  );
}
