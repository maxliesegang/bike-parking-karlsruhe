import { useState } from "react";
import AbstellanlagenTable from "@/components/AbstellanlagenTable";
import DataTable, { Column } from "@/components/DataTable";
import DevelopmentChart from "@/components/DevelopmentChart";
import { getAbstellanlagen } from "@/lib/staticDataCache";
import {
  generateStadtteileData,
  generateBRStationsData,
} from "@/lib/dataProcessor";
import { Abstellanlage } from "@/models/abstellanlage";
import { Stadtteil } from "@/models/stadtteil";
import { BRStation } from "@/models/br-station";
import { Box, Typography, Tabs, Tab, styled } from "@mui/material";
import { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";

const StyledTabs = styled(Tabs)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  marginBottom: theme.spacing(4),
  "& .MuiTabs-indicator": {
    backgroundColor: theme.palette.primary.main,
    height: 3,
  },
}));

const StyledTab = styled(Tab)(({ theme }) => ({
  textTransform: "none",
  fontWeight: theme.typography.fontWeightRegular,
  fontSize: theme.typography.pxToRem(15),
  marginRight: theme.spacing(1),
  color: theme.palette.text.secondary,
  "&.Mui-selected": {
    color: theme.palette.primary.main,
  },
  "&.Mui-focusVisible": {
    backgroundColor: theme.palette.action.selected,
  },
}));

const stadtteileColumns: Column[] = [
  { key: "name", label: "Stadtteil", type: "text" },
  { key: "stellplaetze", label: "Stellplätze", type: "number" },
  { key: "anlagen", label: "Anlagen", type: "number" },
  {
    key: "anlagenOhneStellplatzangabe",
    label: "Anlagen ohne Stellplatzangabe",
    type: "number",
  },
];

const brStationsColumns: Column[] = [
  { key: "name", label: "Station", type: "text" },
  { key: "stellplaetze", label: "Stellplätze", type: "number" },
  { key: "abstellanlagen", label: "Abstellanlagen", type: "number" },
];

interface GemeindeDetailProps {
  gemeindeName: string;
  abstellanlagen: Abstellanlage[];
  stadtteile: Stadtteil[];
  brStations: BRStation[];
}

export default function GemeindeDetail({
  gemeindeName,
  abstellanlagen,
  stadtteile,
  brStations,
}: GemeindeDetailProps) {
  const [tabValue, setTabValue] = useState(0);

  return (
    <>
      <Head>
        <title>{`${gemeindeName} - Fahrrad-Abstellanlagen`}</title>
        <meta
          name="description"
          content={`Übersicht der Fahrrad-Abstellanlagen in ${gemeindeName}`}
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Typography variant="h1" gutterBottom>
        {gemeindeName}
      </Typography>

      <Box sx={{ width: "100%" }}>
        <StyledTabs
          value={tabValue}
          onChange={(_event, newValue: number) => setTabValue(newValue)}
          aria-label="Gemeinde tabs"
        >
          <StyledTab label="Stadtteile" />
          <StyledTab label="Abstellanlagen" />
          <StyledTab label="B+R Stationen" />
          <StyledTab label="Entwicklung" />
        </StyledTabs>
      </Box>

      {tabValue === 0 && (
        <DataTable
          data={stadtteile as unknown as Record<string, unknown>[]}
          columns={stadtteileColumns}
          id="stadtteileTable"
          ariaLabel={`Stadtteile in ${gemeindeName}`}
        />
      )}

      {tabValue === 1 && (
        <AbstellanlagenTable abstellanlagen={abstellanlagen} />
      )}

      {tabValue === 2 && (
        <DataTable
          data={brStations as unknown as Record<string, unknown>[]}
          columns={brStationsColumns}
          id="brStationsTable"
          ariaLabel={`B+R Stationen in ${gemeindeName}`}
        />
      )}

      {tabValue === 3 && <DevelopmentChart abstellanlagen={abstellanlagen} />}
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const abstellanlagen = await getAbstellanlagen();
  const uniqueGemeinden = [...new Set(abstellanlagen.map((a) => a.gemeinde))];

  const paths = uniqueGemeinden.map((gemeinde) => ({
    params: { name: encodeURIComponent(gemeinde) },
  }));

  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const gemeindeName = decodeURIComponent(params?.name as string);
  const allAbstellanlagen = await getAbstellanlagen();
  const abstellanlagen = allAbstellanlagen.filter(
    (a) => a.gemeinde === gemeindeName,
  );

  const stadtteile = generateStadtteileData(abstellanlagen);
  const allBRStations = generateBRStationsData(allAbstellanlagen);
  const brStations = allBRStations.filter(
    (station) => station.gemeinde === gemeindeName,
  );

  return {
    props: {
      gemeindeName,
      abstellanlagen,
      stadtteile,
      brStations,
    },
  };
};
