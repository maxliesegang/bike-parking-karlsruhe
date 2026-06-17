import { GetStaticProps } from "next";
import Head from "next/head";
import { Box, Typography, Grid } from "@mui/material";
import { getOsmData } from "@/lib/osmDataCache";
import { getAbstellanlagen } from "@/lib/staticDataCache";
import {
  generateComparison,
  generateCoverageComparison,
  ComparisonEntry,
  CoverageEntry,
} from "@/lib/osm/analytics";
import { round } from "@/lib/math";
import DataTable, { Column } from "@/components/DataTable";
import { StatCard } from "@/components/StatCard";

interface VergleichProps {
  comparison: ComparisonEntry[];
  coverage: CoverageEntry[];
}

const comparisonColumns: Column<ComparisonEntry>[] = [
  { key: "category", label: "Kategorie", type: "text" },
  { key: "osm", label: "OpenStreetMap", type: "number" },
  { key: "city", label: "Stadt Karlsruhe", type: "number" },
];

const coverageColumns: Column<CoverageEntry>[] = [
  { key: "category", label: "Merkmal", type: "text" },
  { key: "osm", label: "OpenStreetMap", type: "text" },
  { key: "city", label: "Stadt Karlsruhe", type: "text" },
];

export default function Vergleich({ comparison, coverage }: VergleichProps) {
  const total = comparison.find(
    (e) => e.category === "Erfasste Anlagen (gesamt)",
  );
  const osmCount = total?.osm ?? 0;
  const cityCount = total?.city ?? 0;
  const factor = cityCount > 0 ? `${round(osmCount / cityCount)}×` : "—";

  return (
    <>
      <Head>
        <title>Datenquellen-Vergleich — Fahrradparken Karlsruhe</title>
        <meta
          name="description"
          content="Vergleich der Fahrradparken-Daten aus OpenStreetMap mit dem offiziellen Open-Data-Datensatz der Stadt Karlsruhe."
        />
      </Head>

      <Typography variant="h1" gutterBottom>
        OpenStreetMap vs. Stadt Karlsruhe
      </Typography>

      <Typography
        color="text.secondary"
        sx={{ maxWidth: 720, mb: 4 }}
      >
        Diese Seite basiert auf OpenStreetMap, weil es die vollständigere und
        kontinuierlich aktualisierte Quelle ist. Der offizielle Open-Data-Datensatz
        der Stadt Karlsruhe (WFS) wird nur als Referenz und Gegenprobe
        herangezogen. Das von der Community gepflegte OpenStreetMap erfasst weit
        mehr Anlagen, ist aber uneinheitlich getaggt. Der städtische Datensatz ist
        kleiner, folgt dafür einem konsistenten Schema (z. B. Bike+Ride,
        Lastenrad-Eignung).
      </Typography>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6, sm: 4, md: 4 }}>
          <StatCard
            label="OpenStreetMap"
            value={osmCount.toLocaleString("de-DE")}
            sub="erfasste Anlagen"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 4 }}>
          <StatCard
            label="Stadt Karlsruhe"
            value={cityCount.toLocaleString("de-DE")}
            sub="erfasste Anlagen"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4, md: 4 }}>
          <StatCard
            label="Faktor"
            value={factor}
            sub="mehr Anlagen in OSM"
          />
        </Grid>
      </Grid>

      <Typography variant="h2" gutterBottom>
        Erfasste Anlagen & Stellplätze
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Gegenüberstellung der Anzahl erfasster Anlagen und der Summe der
        Stellplätze — jeweils gesamt und auf das Stadtgebiet Karlsruhe begrenzt.
      </Typography>
      <Box sx={{ width: "100%", overflowX: "auto", mb: 4 }}>
        <DataTable
          data={comparison}
          columns={comparisonColumns}
          id="vergleich"
          ariaLabel="Datenquellen-Vergleich"
        />
      </Box>

      <Typography variant="h2" gutterBottom>
        Vollständigkeit der Angaben
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Anteil der Einträge jeder Quelle, die das jeweilige Merkmal angeben.
        Einige Merkmale — etwa Bike+Ride und Lastenrad-Eignung — sind nur im
        Schema der Stadt Karlsruhe vorgesehen und für OpenStreetMap mit „—“
        gekennzeichnet.
      </Typography>
      <Box sx={{ width: "100%", overflowX: "auto", mb: 4 }}>
        <DataTable
          data={coverage}
          columns={coverageColumns}
          id="abdeckung"
          ariaLabel="Vollständigkeit der Angaben"
        />
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720 }}>
        Die OpenStreetMap-Daten auf dieser Seite werden automatisch aktualisiert,
        während der städtische Datensatz eine statische Momentaufnahme ist.
      </Typography>
    </>
  );
}

export const getStaticProps: GetStaticProps<VergleichProps> = async () => {
  const { parkings } = getOsmData();
  const abstellanlagen = await getAbstellanlagen();
  return {
    props: {
      comparison: generateComparison(parkings, abstellanlagen),
      coverage: generateCoverageComparison(parkings, abstellanlagen),
    },
  };
};
