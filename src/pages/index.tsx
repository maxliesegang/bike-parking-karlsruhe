import { GetStaticProps } from "next";
import Head from "next/head";
import { Typography, Grid, Box, Paper } from "@mui/material";
import { getOsmData } from "@/lib/osmDataCache";
import { getAbstellanlagen } from "@/lib/staticDataCache";
import { OsmBikeParking } from "@/models/osm-bike-parking";
import {
  generateAllgemeineStats,
  generateVersorgungAnalyse,
  generateTopFacilities,
  generateVergleichDaten,
  AllgemeineStats,
  VersorgungEintrag,
  TopFacility,
  VergleichEintrag,
} from "@/lib/osmDataProcessor";
import { StatCard } from "@/components/StatCard";
import ParkingMap from "@/components/ParkingMap";
import DataTable, { Column } from "@/components/DataTable";

interface HomeProps {
  parkings: OsmBikeParking[];
  boundaries: GeoJSON.FeatureCollection;
  versorgung: VersorgungEintrag[];
  stats: AllgemeineStats;
  topFacilities: TopFacility[];
  vergleich: VergleichEintrag[];
}

const topColumns: Column[] = [
  { key: "standort", label: "Standort", type: "text" },
  { key: "region", label: "Region", type: "text" },
  { key: "art", label: "Art", type: "text" },
  { key: "stellplaetze", label: "Stellplätze", type: "number" },
];

const vergleichColumns: Column[] = [
  { key: "kategorie", label: "Kategorie", type: "text" },
  { key: "osm", label: "OpenStreetMap", type: "number" },
  { key: "stadt", label: "Stadt Karlsruhe", type: "number" },
];

export default function Home({
  parkings,
  boundaries,
  versorgung,
  stats,
  topFacilities,
  vergleich,
}: HomeProps) {
  const osmTotal = vergleich.find(
    (v) => v.kategorie === "Erfasste Anlagen (gesamt)",
  );
  const faktor =
    osmTotal && osmTotal.stadt > 0
      ? Math.round((osmTotal.osm / osmTotal.stadt) * 10) / 10
      : 0;

  return (
    <>
      <Head>
        <title>Fahrradparken Karlsruhe</title>
        <meta
          name="description"
          content="Fahrrad-Abstellanlagen in Karlsruhe und Umgebung — Verteilung, Versorgung und Entwicklung auf Basis von OpenStreetMap."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Typography variant="h1" gutterBottom>
        Fahrradparken in Karlsruhe
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 720 }}>
        Wie ist das Fahrrad-Parkangebot in Karlsruhe und den umliegenden
        Gemeinden verteilt? Diese Auswertung basiert auf OpenStreetMap-Daten und
        zeigt, wo die Versorgung gut ist und wo sie ausgebaut werden sollte.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <StatCard
            label="Erfasste Anlagen"
            value={stats.totalAnlagen.toLocaleString("de-DE")}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <StatCard
            label="Stellplätze gesamt"
            value={stats.totalStellplaetze.toLocaleString("de-DE")}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <StatCard
            label="Überdacht"
            value={`${stats.ueberdachtProzent}%`}
            sub={`${stats.ueberdacht.toLocaleString("de-DE")} Anlagen`}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <StatCard
            label="Regionen abgedeckt"
            value={stats.regionenAbgedeckt.toLocaleString("de-DE")}
            sub="Stadtteile & Gemeinden"
          />
        </Grid>
      </Grid>

      <Typography variant="h2" gutterBottom>
        Karte
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Flächen eingefärbt nach Stellplätzen pro 1.000 Einwohner; Punkte zeigen
        einzelne Anlagen (gruppiert beim Herauszoomen).
      </Typography>
      <Box sx={{ mb: 4 }}>
        <ParkingMap
          parkings={parkings}
          boundaries={boundaries}
          versorgung={versorgung}
        />
      </Box>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Typography variant="h2" gutterBottom>
            Größte Anlagen
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Verkehrsknoten wie der Hauptbahnhof bündeln sehr viele Stellplätze
            und können die Pro-Kopf-Versorgung eines Bezirks stark anheben.
          </Typography>
          <DataTable
            data={topFacilities as unknown as Record<string, unknown>[]}
            columns={topColumns}
            id="topFacilities"
            ariaLabel="Größte Anlagen"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Typography variant="h2" gutterBottom>
            Stadt vs. OpenStreetMap
          </Typography>
          <Paper elevation={0} sx={{ bgcolor: "action.hover", p: 2, borderRadius: 2, mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              OpenStreetMap erfasst rund <strong>{faktor}×</strong> mehr Anlagen
              als der amtliche Datensatz der Stadt Karlsruhe und ist die
              vollständigere Grundlage für die Planung.
            </Typography>
          </Paper>
          <DataTable
            data={vergleich as unknown as Record<string, unknown>[]}
            columns={vergleichColumns}
            id="vergleich"
            ariaLabel="Datenquellen-Vergleich"
          />
        </Grid>
      </Grid>
    </>
  );
}

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  const { parkings, regions, boundaries } = getOsmData();
  const abstellanlagen = await getAbstellanlagen();

  const versorgung = generateVersorgungAnalyse(parkings, regions);

  return {
    props: {
      parkings,
      boundaries,
      versorgung,
      stats: generateAllgemeineStats(parkings),
      topFacilities: generateTopFacilities(parkings, 10),
      vergleich: generateVergleichDaten(parkings, abstellanlagen),
    },
  };
};
