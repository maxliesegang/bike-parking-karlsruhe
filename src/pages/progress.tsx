import { GetStaticProps } from "next";
import Head from "next/head";
import { Typography, Box } from "@mui/material";
import { getOsmData } from "@/lib/osmDataCache";
import { OsmSnapshot } from "@/lib/osmHistoryMapper";
import HistoryChart from "@/components/HistoryChart";

interface ProgressProps {
  history: OsmSnapshot[];
}

export default function Progress({ history }: ProgressProps) {
  const latest = history[history.length - 1];
  const first = history[0];
  const delta =
    latest && first ? latest.totalStellplaetze - first.totalStellplaetze : 0;

  return (
    <>
      <Head>
        <title>Entwicklung — Fahrradparken Karlsruhe</title>
        <meta
          name="description"
          content="Entwicklung der erfassten Fahrrad-Stellplätze in Karlsruhe und Umgebung über die Zeit."
        />
      </Head>

      <Typography variant="h1" gutterBottom>
        Entwicklung über Zeit
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 720 }}>
        Bei jedem Datenabgleich wird ein Messpunkt gespeichert. So lässt sich
        verfolgen, wie das erfasste Fahrrad-Parkangebot in der Region wächst.
        {delta > 0 && (
          <>
            {" "}
            Seit Beginn der Aufzeichnung kamen{" "}
            <strong>{delta.toLocaleString("de-DE")}</strong> Stellplätze hinzu.
          </>
        )}
      </Typography>

      <Box sx={{ mb: 4 }}>
        <HistoryChart history={history} />
      </Box>
    </>
  );
}

export const getStaticProps: GetStaticProps<ProgressProps> = async () => {
  const { history } = getOsmData();
  return { props: { history } };
};
