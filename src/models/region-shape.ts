import { PeerGroup } from "@/lib/osm/peerGroups";
import { Rating } from "@/lib/osm/regionMetrics";

// URL (relative to the Next basePath) of the choropleth polygons.
export const REGION_SHAPES_URL = "/data/regions.geojson";

/**
 * What a region polygon carries into the choropleth. The numbers are the same
 * ones the Versorgung table shows — the map is a second reading of that table,
 * not a second calculation, so the two can never disagree.
 */
export interface RegionShapeProperties {
  name: string;
  group: PeerGroup;
  population: number | null;
  facilities: number;
  capacity: number;
  /** Everyday spaces per 1.000 residents; null without population data. The
   *  choropleth colours by this, so the value doubles as the sort key. */
  everydayPerThousand: number | null;
  hubPercent: number;
  nearestMedianM: number | null;
  rating: Rating;
  sparselyMapped: boolean;
}
