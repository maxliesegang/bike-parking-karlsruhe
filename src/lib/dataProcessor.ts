import { FeatureCollection, Feature, Point } from "geojson";
import { Abstellanlage } from "@/models/abstellanlage";
import { FeatureProperties } from "@/models/feature-properties";

const TRUE_VALUE = "T";

// The Stadt-Karlsruhe dataset is retained only as a comparison count against
// the (more complete) OpenStreetMap data, so we just flatten it to a list.
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
    lastUpdated: new Date(properties.stand).toISOString(),
  };
}
