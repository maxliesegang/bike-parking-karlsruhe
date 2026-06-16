import { useState } from "react";
import { Tabs, Tab, Typography, styled } from "@mui/material";
import { GetStaticProps } from "next";
import Head from "next/head";
import AbstellanlagenTable from "@/components/AbstellanlagenTable";
import OSMBikeParkingTable from "@/components/OSMBikeParkingTable";
import { getAbstellanlagen } from "@/lib/staticDataCache";
import { getOsmBikeParkings } from "@/lib/osmDataCache";
import { Abstellanlage } from "@/models/abstellanlage";
import { OsmBikeParking } from "@/models/osm-bike-parking";

interface HomeProps {
  osmBikeParkings: OsmBikeParking[];
  abstellanlagen: Abstellanlage[];
}

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

export default function Home({ osmBikeParkings, abstellanlagen }: HomeProps) {
  const [tabValue, setTabValue] = useState(0);

  return (
    <>
      <Head>
        <title>Fahrrad-Abstellanlagen</title>
        <meta
          name="description"
          content="Übersicht der Fahrrad-Abstellanlagen in Karlsruhe und Umgebung"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Typography variant="h1" gutterBottom>
        Fahrrad-Abstellanlagen
      </Typography>

      <StyledTabs
        value={tabValue}
        onChange={(_event, newValue: number) => setTabValue(newValue)}
        aria-label="Datenquellen tabs"
      >
        <StyledTab label="OSM Daten" />
        <StyledTab label="Stadt Karlsruhe" />
      </StyledTabs>

      {tabValue === 0 && <OSMBikeParkingTable osmBikeParkings={osmBikeParkings} abstellanlagen={abstellanlagen} />}

      {tabValue === 1 && <AbstellanlagenTable abstellanlagen={abstellanlagen} />}
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const [osmBikeParkings, abstellanlagen] = await Promise.all([
    getOsmBikeParkings(),
    getAbstellanlagen(),
  ]);

  return {
    props: {
      osmBikeParkings,
      abstellanlagen,
    },
  };
};
