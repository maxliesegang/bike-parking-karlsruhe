import { getAbstellanlagen } from "@/lib/staticDataCache";
import { Box, Typography } from "@mui/material";
import { GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import DataTable, { Column } from "@/components/DataTable";
import { generateGemeindenData } from "@/lib/dataProcessor";
import { Gemeinde } from "@/models/gemeinde";

interface GemeindenProps {
  gemeinden: Gemeinde[];
}

const columns: Column[] = [
  { key: "name", label: "Gemeinde", type: "text" },
  { key: "stellplaetze", label: "Stellplätze", type: "number" },
  { key: "anlagen", label: "Anlagen", type: "number" },
  {
    key: "anlagenOhneStellplatzangabe",
    label: "Anlagen ohne Stellplatzangabe",
    type: "number",
  },
  { key: "stadtteile", label: "Anzahl Stadtteile", type: "number" },
];

export default function Gemeinden({ gemeinden }: GemeindenProps) {
  const gemeindenData = gemeinden.map((gemeinde) => ({
    ...gemeinde,
    stadtteile: gemeinde.stadtteile.length,
    name: (
      <Link href={`/gemeinden/${encodeURIComponent(gemeinde.name)}`}>
        {gemeinde.name}
      </Link>
    ),
  }));

  const totalStellplaetze = gemeinden.reduce(
    (sum, g) => sum + g.stellplaetze,
    0,
  );
  const totalAnlagen = gemeinden.reduce((sum, g) => sum + g.anlagen, 0);
  const totalOhneStellplatzangabe = gemeinden.reduce(
    (sum, g) => sum + g.anlagenOhneStellplatzangabe,
    0,
  );

  return (
    <>
      <Head>
        <title>Übersicht der Gemeinden - Fahrrad-Abstellanlagen</title>
        <meta
          name="description"
          content="Übersicht der Gemeinden mit Fahrrad-Abstellanlagen"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Typography variant="h1" gutterBottom>
        Übersicht der Gemeinden
      </Typography>
      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <DataTable
          data={gemeindenData as unknown as Record<string, unknown>[]}
          columns={columns}
          id="gemeindenTable"
          ariaLabel="Gemeinden Übersicht"
        />
      </Box>
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6">Zusammenfassung:</Typography>
        <Typography>Gesamtstellplätze: {totalStellplaetze}</Typography>
        <Typography>Gesamtanlagen: {totalAnlagen}</Typography>
        <Typography>
          Gesamtanlagen ohne Stellplatzangabe: {totalOhneStellplatzangabe}
        </Typography>
      </Box>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const abstellanlagen = await getAbstellanlagen();
  const gemeinden = generateGemeindenData(abstellanlagen);

  return {
    props: {
      gemeinden,
    },
  };
};
