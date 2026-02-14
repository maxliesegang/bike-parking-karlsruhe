import { GetStaticProps } from "next";
import Head from "next/head";
import DataTable, { Column } from "@/components/DataTable";
import { BRStation } from "@/models/br-station";
import { generateBRStationsData } from "@/lib/dataProcessor";
import { getAbstellanlagen } from "@/lib/staticDataCache";
import { Typography, Box } from "@mui/material";

interface BRStationsProps {
  brStations: BRStation[];
}

const columns: Column[] = [
  { key: "name", label: "Station", type: "text" },
  { key: "gemeinde", label: "Gemeinde", type: "text" },
  { key: "stellplaetze", label: "Stellplätze", type: "number" },
  { key: "abstellanlagen", label: "Abstellanlagen", type: "number" },
];

export default function BRStations({ brStations }: BRStationsProps) {
  const totalStellplaetze = brStations.reduce(
    (sum, station) => sum + station.stellplaetze,
    0,
  );
  const totalAbstellanlagen = brStations.reduce(
    (sum, station) => sum + station.abstellanlagen,
    0,
  );

  return (
    <>
      <Head>
        <title>
          Bike and Ride Stationen - Fahrrad-Abstellanlagen in Karlsruhe
        </title>
        <meta
          name="description"
          content="Übersicht der Bike and Ride Stationen in Karlsruhe"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Typography variant="h1" gutterBottom>
        Bike and Ride Stationen
      </Typography>
      <Box sx={{ width: "100%", overflowX: "auto", mb: 4 }}>
        <DataTable
          data={brStations as unknown as Record<string, unknown>[]}
          columns={columns}
          id="brStationTable"
          ariaLabel="Bike and Ride Stationen Übersicht"
        />
      </Box>
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6">Zusammenfassung:</Typography>
        <Typography>Gesamtstellplätze: {totalStellplaetze}</Typography>
        <Typography>Gesamtabstellanlagen: {totalAbstellanlagen}</Typography>
      </Box>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const abstellanlagen = await getAbstellanlagen();
  const brStations = generateBRStationsData(abstellanlagen);

  return {
    props: {
      brStations,
    },
  };
};
