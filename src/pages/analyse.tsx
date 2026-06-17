import { useState, useMemo } from "react";
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
  generateVersorgungAnalyse,
  generateQualitaetAnalyse,
  generateTypAnalyse,
  VersorgungEintrag,
  QualitaetEintrag,
  TypAnalyse,
} from "@/lib/osmDataProcessor";
import DataTable, { Column } from "@/components/DataTable";
import { BewertungBadge } from "@/components/StatCard";

interface AnalyseProps {
  versorgung: VersorgungEintrag[];
  qualitaet: QualitaetEintrag[];
  typen: TypAnalyse[];
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

function VersorgungView({
  versorgung,
  isMobile,
}: {
  versorgung: VersorgungEintrag[];
  isMobile: boolean;
}) {
  const columns: Column[] = [
    { key: "name", label: "Region", type: "text" },
    { key: "gebiet", label: "Gebiet", type: "text" },
    { key: "population", label: "Einwohner", type: "number" },
    { key: "stellplaetze", label: "Stellplätze", type: "number" },
    { key: "pro1000", label: "pro 1.000 EW", type: "number" },
    { key: "proKm2", label: "pro km²", type: "number" },
    { key: "bewertung", label: "Versorgung", type: "text" },
  ];

  const data = versorgung.map((e) => ({
    ...e,
    gebiet: LEVEL_LABEL[e.level],
    population: e.population ?? "—",
    pro1000: e.pro1000 ?? "—",
    bewertung: <BewertungBadge bewertung={e.bewertung} />,
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
          data={data as unknown as Record<string, unknown>[]}
          columns={isMobile ? columns.slice(0, 5) : columns}
          id="versorgungTable"
          ariaLabel="Versorgungsgrad"
        />
      </Box>
    </Box>
  );
}

function QualitaetView({
  qualitaet,
  isMobile,
}: {
  qualitaet: QualitaetEintrag[];
  isMobile: boolean;
}) {
  const avgScore =
    qualitaet.length > 0
      ? Math.round(
          (qualitaet.reduce((s, e) => s + e.score, 0) / qualitaet.length) * 10,
        ) / 10
      : 0;

  const columns: Column[] = [
    { key: "name", label: "Region", type: "text" },
    { key: "score", label: "Qualität (1–10)", type: "number" },
    { key: "stellplaetze", label: "Stellplätze", type: "number" },
    { key: "ueberdachtProzent", label: "% Überdacht", type: "number" },
    { key: "hochwertig", label: "Hochwertige Anlagen", type: "number" },
    { key: "haupttyp", label: "Haupttyp", type: "text" },
  ];

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Qualität nach Anlagentyp (Boxen/Häuser hoch, einfache Ständer niedrig),
        Überdachung und Gebührenfreiheit. Ø {avgScore}/10 über alle Regionen.
      </Typography>
      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <DataTable
          data={qualitaet as unknown as Record<string, unknown>[]}
          columns={isMobile ? columns.slice(0, 4) : columns}
          id="qualitaetTable"
          ariaLabel="Qualitätsanalyse"
        />
      </Box>
    </Box>
  );
}

function TypenView({
  typen,
  isMobile,
}: {
  typen: TypAnalyse[];
  isMobile: boolean;
}) {
  const columns: Column[] = [
    { key: "name", label: "Art", type: "text" },
    { key: "anlagen", label: "Anlagen", type: "number" },
    { key: "stellplaetze", label: "Stellplätze", type: "number" },
    { key: "avgStellplaetze", label: "Ø/Anlage", type: "number" },
  ];
  return (
    <Box sx={{ width: "100%", overflowX: "auto" }}>
      <DataTable
        data={typen as unknown as Record<string, unknown>[]}
        columns={isMobile ? columns.slice(0, 3) : columns}
        id="typTable"
        ariaLabel="Anlagentypen"
      />
    </Box>
  );
}

export default function Analyse({ versorgung, qualitaet, typen }: AnalyseProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [view, setView] = useState(0);

  const views = useMemo(
    () => [
      <VersorgungView key="v" versorgung={versorgung} isMobile={isMobile} />,
      <QualitaetView key="q" qualitaet={qualitaet} isMobile={isMobile} />,
      <TypenView key="t" typen={typen} isMobile={isMobile} />,
    ],
    [versorgung, qualitaet, typen, isMobile],
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
      versorgung: generateVersorgungAnalyse(parkings, regions),
      qualitaet: generateQualitaetAnalyse(parkings),
      typen: generateTypAnalyse(parkings),
    },
  };
};
