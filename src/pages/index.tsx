import { GetStaticProps } from "next";
import Head from "next/head";
import { Typography, Grid, Box, Paper } from "@mui/material";
import { getOsmData } from "@/lib/osmDataCache";
import { writeMapData } from "@/lib/mapDataWriter";
import {
  generateOverviewStats,
  generateTopFacilities,
  OverviewStats,
  TopFacility,
} from "@/lib/osm/analytics";
import { StatCard } from "@/components/StatCard";
import ParkingMap from "@/components/ParkingMap";
import TopFacilitiesMap from "@/components/TopFacilitiesMap";
import DataTable, { Column } from "@/components/DataTable";

interface HomeProps {
  stats: OverviewStats;
  topFacilities: TopFacility[];
}

const topColumns: Column<TopFacility>[] = [
  { key: "rank", label: "#", type: "number" },
  { key: "name", label: "Standort", type: "text" },
  { key: "type", label: "Art", type: "text" },
  { key: "covered", label: "Überdacht", type: "boolean" },
  { key: "capacity", label: "Stellplätze", type: "number" },
];

export default function Home({ stats, topFacilities }: HomeProps) {
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
            value={stats.totalFacilities.toLocaleString("de-DE")}
            sub="Karlsruhe & Umgebung"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <StatCard
            label="Stellplätze gesamt"
            value={stats.totalCapacity.toLocaleString("de-DE")}
            sub="Karlsruhe & Umgebung"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <StatCard
            label="Anlagen in Karlsruhe"
            value={stats.karlsruheFacilities.toLocaleString("de-DE")}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <StatCard
            label="Stellplätze in Karlsruhe"
            value={stats.karlsruheCapacity.toLocaleString("de-DE")}
          />
        </Grid>
      </Grid>

      <Typography variant="h2" gutterBottom>
        Karte
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Jeder Punkt ist eine erfasste Fahrrad-Abstellanlage (beim Herauszoomen
        gruppiert). Anklicken zeigt Details zur Anlage.
      </Typography>
      <Box sx={{ mb: 4 }}>
        <ParkingMap />
      </Box>

      <Typography variant="h2" gutterBottom>
        Größte Anlagen
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
        Verkehrsknoten wie der Hauptbahnhof bündeln sehr viele Stellplätze und
        können die Pro-Kopf-Versorgung eines Bezirks stark anheben. Die Nummern
        in der Tabelle entsprechen den Markierungen auf der Karte.
      </Typography>
      <Grid container spacing={3} sx={{ alignItems: "stretch" }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <DataTable
            data={topFacilities}
            columns={topColumns}
            id="topFacilities"
            ariaLabel="Größte Anlagen"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper
            variant="outlined"
            sx={{
              p: 1,
              borderRadius: 2,
              borderColor: "#d97706",
              bgcolor: "#fff8ef",
              height: "100%",
            }}
          >
            <Typography
              variant="caption"
              sx={{ display: "block", px: 1, pt: 0.5, pb: 1, color: "#b45309", fontWeight: 700 }}
            >
              Lage der größten Anlagen
            </Typography>
            <TopFacilitiesMap facilities={topFacilities} />
          </Paper>
        </Grid>
      </Grid>
    </>
  );
}

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  const { parkings } = getOsmData();

  // Emit the slim point set as a static asset the client map fetches async,
  // keeping the ~7.5k-point array out of this page's static props.
  writeMapData(parkings);

  return {
    props: {
      stats: generateOverviewStats(parkings),
      topFacilities: generateTopFacilities(parkings, 20),
    },
  };
};
