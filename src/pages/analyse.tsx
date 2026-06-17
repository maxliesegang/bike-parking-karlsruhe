import { useState, useMemo, ReactNode } from "react";
import { GetStaticProps } from "next";
import Head from "next/head";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  styled,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { getOsmData } from "@/lib/osmDataCache";
import {
  generateSupplyAnalysis,
  generateQualityAnalysis,
  generateTypeStats,
  SupplyEntry,
  QualityEntry,
  TypeStats,
} from "@/lib/osm/analytics";
import { average } from "@/lib/math";
import DataTable, { Column } from "@/components/DataTable";
import { RatingBadge } from "@/components/StatCard";

interface AnalyseProps {
  supply: SupplyEntry[];
  quality: QualityEntry[];
  types: TypeStats[];
}

const StyledTabs = styled(Tabs)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  marginBottom: theme.spacing(3),
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
  "&.Mui-selected": { color: theme.palette.primary.main },
}));

const LEVEL_LABEL: Record<number, string> = {
  10: "Karlsruhe (Stadtbezirk)",
  9: "Karlsruhe (Stadtteil)",
  8: "Umland-Gemeinde",
  0: "—",
};

// A column subset on mobile, the full set otherwise.
function responsiveColumns<T>(columns: Column<T>[], mobileCount: number, isMobile: boolean) {
  return isMobile ? columns.slice(0, mobileCount) : columns;
}

type SupplyRow = {
  name: string;
  gebiet: string;
  population: number | string;
  capacity: number;
  perThousand: number | string;
  perKm2: number;
  rating: ReactNode;
};

function SupplyView({
  supply,
  isMobile,
}: {
  supply: SupplyEntry[];
  isMobile: boolean;
}) {
  const columns: Column<SupplyRow>[] = [
    { key: "name", label: "Region", type: "text" },
    { key: "gebiet", label: "Gebiet", type: "text" },
    { key: "population", label: "Einwohner", type: "number" },
    { key: "capacity", label: "Stellplätze", type: "number" },
    { key: "perThousand", label: "pro 1.000 EW", type: "number" },
    { key: "perKm2", label: "pro km²", type: "number" },
    { key: "rating", label: "Versorgung", type: "text" },
  ];

  const data: SupplyRow[] = supply.map((e) => ({
    name: e.name,
    gebiet: LEVEL_LABEL[e.level],
    population: e.population ?? "—",
    capacity: e.capacity,
    perThousand: e.perThousand ?? "—",
    perKm2: e.perKm2,
    rating: <RatingBadge rating={e.rating} />,
  }));

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Stellplätze pro Einwohner — schlecht versorgte Regionen zuerst. Zum
        Vergleich: Bremen ~28, München ~27, Freiburg ~22 Stellplätze pro 1.000
        Einwohner (ADFC). Umland-Gemeinden ohne Einwohnerdaten in OpenStreetMap
        erscheinen ohne Bewertung.
      </Typography>
      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <DataTable
          data={data}
          columns={responsiveColumns(columns, 5, isMobile)}
          id="versorgungTable"
          ariaLabel="Versorgungsgrad"
        />
      </Box>
    </Box>
  );
}

function QualityView({
  quality,
  isMobile,
}: {
  quality: QualityEntry[];
  isMobile: boolean;
}) {
  const avgScore = average(quality.map((e) => e.score));

  const columns: Column<QualityEntry>[] = [
    { key: "name", label: "Region", type: "text" },
    { key: "score", label: "Qualität (1–10)", type: "number" },
    { key: "capacity", label: "Stellplätze", type: "number" },
    { key: "coveredPercent", label: "% Überdacht", type: "number" },
    { key: "highQuality", label: "Hochwertige Anlagen", type: "number" },
    { key: "mainType", label: "Haupttyp", type: "text" },
  ];

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Qualität nach Anlagentyp (Boxen/Häuser hoch, einfache Ständer niedrig),
        Überdachung und Gebührenfreiheit. Ø {avgScore}/10 über alle Regionen.
      </Typography>
      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <DataTable
          data={quality}
          columns={responsiveColumns(columns, 4, isMobile)}
          id="qualitaetTable"
          ariaLabel="Qualitätsanalyse"
        />
      </Box>
    </Box>
  );
}

function TypesView({
  types,
  isMobile,
}: {
  types: TypeStats[];
  isMobile: boolean;
}) {
  const columns: Column<TypeStats>[] = [
    { key: "name", label: "Art", type: "text" },
    { key: "facilities", label: "Anlagen", type: "number" },
    { key: "capacity", label: "Stellplätze", type: "number" },
    { key: "avgCapacity", label: "Ø/Anlage", type: "number" },
  ];
  return (
    <Box sx={{ width: "100%", overflowX: "auto" }}>
      <DataTable
        data={types}
        columns={responsiveColumns(columns, 3, isMobile)}
        id="typTable"
        ariaLabel="Anlagentypen"
      />
    </Box>
  );
}

export default function Analyse({ supply, quality, types }: AnalyseProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [view, setView] = useState(0);

  const views = useMemo(
    () => [
      <SupplyView key="v" supply={supply} isMobile={isMobile} />,
      <QualityView key="q" quality={quality} isMobile={isMobile} />,
      <TypesView key="t" types={types} isMobile={isMobile} />,
    ],
    [supply, quality, types, isMobile],
  );

  return (
    <>
      <Head>
        <title>Analyse — Fahrradparken Karlsruhe</title>
        <meta
          name="description"
          content="Versorgungsgrad und Qualität der Fahrrad-Abstellanlagen nach Region."
        />
      </Head>

      <Typography variant="h1" gutterBottom>
        Analyse nach Region
      </Typography>

      <StyledTabs
        value={view}
        onChange={(_, v) => setView(v)}
        aria-label="Analyse-Ansichten"
      >
        <StyledTab label="Versorgung" />
        <StyledTab label="Qualität" />
        <StyledTab label="Anlagentypen" />
      </StyledTabs>

      {views[view]}
    </>
  );
}

export const getStaticProps: GetStaticProps<AnalyseProps> = async () => {
  const { parkings, regions } = getOsmData();
  return {
    props: {
      supply: generateSupplyAnalysis(parkings, regions),
      quality: generateQualityAnalysis(parkings),
      types: generateTypeStats(parkings),
    },
  };
};
