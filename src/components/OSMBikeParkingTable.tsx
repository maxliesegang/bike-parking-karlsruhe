import { useState, useMemo } from "react";
import { Box, Typography, Tabs, Tab, useMediaQuery, useTheme, styled, Grid, Card, CardContent } from "@mui/material";
import { OsmBikeParking } from "@/models/osm-bike-parking";
import { Abstellanlage } from "@/models/abstellanlage";
import DataTable, { Column } from "./DataTable";
import {
  generateStadtbezirkAnalyse,
  generateTypAnalyse,
  generateAllgemeineStats,
  generateVersorgungAnalyse,
  generateQualitaetAnalyse,
  generateVergleichDaten,
  VersorgungEintrag,
  QualitaetEintrag,
} from "@/lib/osmDataProcessor";

interface OSMBikeParkingTableProps {
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
  "&.Mui-selected": { color: theme.palette.primary.main },
}));

const allColumns: Column[] = [
  { key: "standort", label: "Standort", type: "text" },
  { key: "art", label: "Art", type: "text" },
  { key: "stellplaetze", label: "Stellplätze", type: "number" },
  { key: "stadtbezirk", label: "Stadtbezirk", type: "text" },
  { key: "stadtteil", label: "Stadtteil", type: "text" },
  { key: "covered", label: "Überdacht", type: "boolean" },
  { key: "fee", label: "Gebühr", type: "boolean" },
  { key: "zugang", label: "Zugang", type: "text" },
  { key: "betreiber", label: "Betreiber", type: "text" },
];

const mobileColumns: Column[] = [
  { key: "standort", label: "Standort", type: "text" },
  { key: "art", label: "Art", type: "text" },
  { key: "stellplaetze", label: "Stellplätze", type: "number" },
  { key: "stadtbezirk", label: "Stadtbezirk", type: "text" },
  { key: "stadtteil", label: "Stadtteil", type: "text" },
];

const stadtbezirkColumns: Column[] = [
  { key: "name", label: "Stadtbezirk", type: "text" },
  { key: "anlagen", label: "Anlagen", type: "number" },
  { key: "stellplaetze", label: "Stellplätze", type: "number" },
  { key: "avgStellplaetze", label: "Ø/Anlage", type: "number" },
  { key: "ueberdacht", label: "Überdacht", type: "number" },
  { key: "gebuehr", label: "Gebühr", type: "number" },
  { key: "topTypen", label: "Häufigste Typen", type: "text" },
];

const typColumns: Column[] = [
  { key: "name", label: "Art", type: "text" },
  { key: "anlagen", label: "Anlagen", type: "number" },
  { key: "stellplaetze", label: "Stellplätze", type: "number" },
  { key: "avgStellplaetze", label: "Ø/Anlage", type: "number" },
];

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <Card elevation={2} sx={{ borderRadius: 2, height: "100%" }}>
      <CardContent sx={{ textAlign: "center", py: 2, px: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: "bold", color: color || "primary.main" }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.secondary">
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function BewertungBadge({ bewertung }: { bewertung: "gut" | "mittel" | "schlecht" }) {
  const color = bewertung === "gut" ? "#2e7d32" : bewertung === "mittel" ? "#f57c00" : "#d32f2f";
  const label = bewertung === "gut" ? "Gut" : bewertung === "mittel" ? "Mittel" : "Schlecht";
  return (
    <Typography variant="body2" sx={{ color, fontWeight: "bold" }}>
      {label}
    </Typography>
  );
}

function ListenAnsicht({ osmBikeParkings, isMobile }: { osmBikeParkings: OsmBikeParking[]; isMobile: boolean }) {
  const data = useMemo(
    () =>
      [...osmBikeParkings]
        .sort((a, b) => b.stellplaetze - a.stellplaetze)
        .map((p) => ({ ...p, topTypen: "" })),
    [osmBikeParkings],
  );
  return (
    <Box sx={{ width: "100%", overflowX: "auto" }}>
      <DataTable data={data as unknown as Record<string, unknown>[]} columns={isMobile ? mobileColumns : allColumns} id="osmBikeParkingTable" ariaLabel="Fahrrad-Abstellanlagen" />
    </Box>
  );
}

function StadtbezirkAnsicht({ osmBikeParkings, isMobile }: { osmBikeParkings: OsmBikeParking[]; isMobile: boolean }) {
  const analyse = useMemo(() => generateStadtbezirkAnalyse(osmBikeParkings), [osmBikeParkings]);
  const totalStellplaetze = analyse.reduce((s, a) => s + a.stellplaetze, 0);
  const totalAnlagen = analyse.reduce((s, a) => s + a.anlagen, 0);
  const data = analyse
    .filter((s) => s.name !== "Außerhalb")
    .map((s) => ({ ...s, topTypen: s.topTypen.join(", "), anteilStellplaetze: totalStellplaetze > 0 ? `${Math.round((s.stellplaetze / totalStellplaetze) * 100)}%` : "—" }));
  const cols: Column[] = [...stadtbezirkColumns, { key: "anteilStellplaetze", label: "Anteil", type: "text" }];
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" gutterBottom>{totalAnlagen} Anlagen, {totalStellplaetze.toLocaleString('de-DE')} Stellplätze in {analyse.filter((s) => s.name !== "Außerhalb").length} Stadtbezirken</Typography>
      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <DataTable data={data as unknown as Record<string, unknown>[]} columns={isMobile ? cols.slice(0, 5) : cols} id="stadtbezirkTable" ariaLabel="Stadtbezirke Vergleich" />
      </Box>
    </Box>
  );
}

function TypenAnsicht({ osmBikeParkings, isMobile }: { osmBikeParkings: OsmBikeParking[]; isMobile: boolean }) {
  const analyse = useMemo(() => generateTypAnalyse(osmBikeParkings), [osmBikeParkings]);
  return (
    <Box sx={{ width: "100%", overflowX: "auto" }}>
      <DataTable data={analyse as unknown as Record<string, unknown>[]} columns={isMobile ? typColumns.slice(0, 3) : typColumns} id="typTable" ariaLabel="Anlagentypen" />
    </Box>
  );
}

function StatistikenAnsicht({ osmBikeParkings }: { osmBikeParkings: OsmBikeParking[] }) {
  const stats = useMemo(() => generateAllgemeineStats(osmBikeParkings), [osmBikeParkings]);
  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard label="Anlagen gesamt" value={stats.totalAnlagen.toLocaleString('de-DE')} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard label="Stellplätze gesamt" value={stats.totalStellplaetze.toLocaleString('de-DE')} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard label="Ø Stellplätze" value={String(stats.avgStellplaetze)} sub="pro Anlage" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard label="Überdacht" value={`${stats.ueberdachtProzent}%`} sub={`${stats.ueberdacht} Anlagen`} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard label="Gebührenpflichtig" value={`${stats.gebuehrProzent}%`} sub={`${stats.gebuehr} Anlagen`} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard label="Öffentlich" value={`${stats.zugangOeffentlich}`} sub={`${stats.zugangPrivat} privat / ${stats.zugangUnbekannt} unbekannt`} />
        </Grid>
      </Grid>
      <Typography variant="h6" gutterBottom>Kapazitätsverteilung</Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 4 }}>
          <StatCard label="Klein (1–5)" value={stats.kapazitaetKlein.toLocaleString('de-DE')} sub={stats.totalAnlagen > 0 ? `${Math.round((stats.kapazitaetKlein / stats.totalAnlagen) * 100)}%` : "—"} />
        </Grid>
        <Grid size={{ xs: 4 }}>
          <StatCard label="Mittel (6–20)" value={stats.kapazitaetMittel.toLocaleString('de-DE')} sub={stats.totalAnlagen > 0 ? `${Math.round((stats.kapazitaetMittel / stats.totalAnlagen) * 100)}%` : "—"} />
        </Grid>
        <Grid size={{ xs: 4 }}>
          <StatCard label="Groß (21+)" value={stats.kapazitaetGross.toLocaleString('de-DE')} sub={stats.totalAnlagen > 0 ? `${Math.round((stats.kapazitaetGross / stats.totalAnlagen) * 100)}%` : "—"} />
        </Grid>
      </Grid>
    </Box>
  );
}

function VersorgungAnsicht({ osmBikeParkings, isMobile }: { osmBikeParkings: OsmBikeParking[]; isMobile: boolean }) {
  const analyse = useMemo(() => generateVersorgungAnalyse(osmBikeParkings), [osmBikeParkings]);

  const worst = analyse.length > 0 ? analyse[analyse.length - 1] : null;
  const best = analyse.length > 0 ? analyse[0] : null;

  const columns: Column[] = [
    { key: "name", label: "Stadtbezirk", type: "text" },
    { key: "population", label: "Einwohner", type: "number" },
    { key: "stellplaetze", label: "Stellplätze", type: "number" },
    { key: "pro1000", label: "pro 1.000 EW", type: "number" },
    { key: "proKm2", label: "pro km²", type: "number" },
    { key: "bewertung", label: "Versorgung", type: "text" },
  ];

  const mobileCols = columns.slice(0, 5);

  const data = analyse.map((e) => ({
    ...e,
    bewertung: <BewertungBadge bewertung={e.bewertung} />,
  }));

  const worstDistrict = worst ? `${worst.name} (${worst.pro1000}/1.000 EW)` : "";
  const bestDistrict = best ? `${best.name} (${best.pro1000}/1.000 EW)` : "";

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Sortiert nach Stellplätzen pro Einwohner — schlecht versorgte Bezirke zuerst.
        Bremen hat 28, München 27, Freiburg 22 Stellplätze pro 1.000 Einwohner (ADFC).
      </Typography>

      {worst && best && !isMobile && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6 }}>
            <StatCard label="Schlechteste Versorgung" value={worstDistrict} color="#d32f2f" sub={`${worst.anlagen} Anlagen für ${worst.population.toLocaleString('de-DE')} Einwohner`} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <StatCard label="Beste Versorgung" value={bestDistrict} color="#2e7d32" sub={`${best.anlagen} Anlagen für ${best.population.toLocaleString('de-DE')} Einwohner`} />
          </Grid>
        </Grid>
      )}

      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <DataTable data={data as unknown as Record<string, unknown>[]} columns={isMobile ? mobileCols : columns} id="versorgungTable" ariaLabel="Versorgungsgrad" />
      </Box>
    </Box>
  );
}

function QualitaetAnsicht({ osmBikeParkings, isMobile }: { osmBikeParkings: OsmBikeParking[]; isMobile: boolean }) {
  const analyse = useMemo(() => generateQualitaetAnalyse(osmBikeParkings), [osmBikeParkings]);
  const avgScore = analyse.length > 0 ? Math.round((analyse.reduce((s, e) => s + e.score, 0) / analyse.length) * 10) / 10 : 0;

  const columns: Column[] = [
    { key: "name", label: "Stadtbezirk", type: "text" },
    { key: "score", label: "Qualität (1-10)", type: "number" },
    { key: "stellplaetze", label: "Stellplätze", type: "number" },
    { key: "ueberdachtProzent", label: "% Überdacht", type: "number" },
    { key: "gebuehrProzent", label: "% Gebührenfrei", type: "number" },
    { key: "hochwertig", label: "Hochwertige Typen", type: "number" },
    { key: "haupttyp", label: "Haupttyp", type: "text" },
  ];

  const data = analyse.map((e) => ({
    ...e,
    gebuehrProzent: 100 - e.gebuehrProzent,
  }));

  const best = analyse.length > 0 ? analyse[0] : null;

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Qualitätsbewertung basierend auf Anlagentyp (Boxen/Häuser hoch, Ständer niedrig), Überdachung und Gebührenfreiheit.
      </Typography>

      {best && (
        <Typography variant="body1" sx={{ mb: 3 }}>
          ⌀ {avgScore}/10 — Bester Bezirk: <strong>{best.name}</strong> ({best.score}/10, {best.ueberdachtProzent}% überdacht, Haupttyp: {best.haupttyp})
        </Typography>
      )}

      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <DataTable data={data as unknown as Record<string, unknown>[]} columns={isMobile ? columns.slice(0, 4) : columns} id="qualitaetTable" ariaLabel="Qualitätsanalyse" />
      </Box>
    </Box>
  );
}

function VergleichAnsicht({ osmBikeParkings, abstellanlagen, isMobile }: { osmBikeParkings: OsmBikeParking[]; abstellanlagen: Abstellanlage[]; isMobile: boolean }) {
  const vergleich = useMemo(() => generateVergleichDaten(osmBikeParkings, abstellanlagen), [osmBikeParkings, abstellanlagen]);

  const columns: Column[] = [
    { key: "kategorie", label: "Kategorie", type: "text" },
    { key: "osm", label: "OpenStreetMap", type: "number" },
    { key: "stadt", label: "Stadt Karlsruhe", type: "number" },
  ];

  const osmTotal = vergleich.find((v) => v.kategorie === "Erfasste Anlagen (gesamt)");
  const faktor = osmTotal && osmTotal.stadt > 0 ? Math.round((osmTotal.osm / osmTotal.stadt) * 10) / 10 : 0;

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        OpenStreetMap enthält {faktor}x mehr Fahrrad-Abstellanlagen als der amtliche Datensatz der Stadt Karlsruhe.
        Eine vollständige Datenerfassung ist die Grundlage für eine bedarfsgerechte Planung.
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6 }}>
          <StatCard label="OSM (Gesamt)" value={osmBikeParkings.length.toLocaleString('de-DE')} color="#1976d2" />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <StatCard label="Stadt Karlsruhe" value={abstellanlagen.length.toLocaleString('de-DE')} color="#f57c00" />
        </Grid>
      </Grid>
      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <DataTable data={vergleich as unknown as Record<string, unknown>[]} columns={columns} id="vergleichTable" ariaLabel="Datenquellen Vergleich" />
      </Box>
    </Box>
  );
}

export default function OSMBikeParkingTable({ osmBikeParkings, abstellanlagen }: OSMBikeParkingTableProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [view, setView] = useState(0);

  const totalStellplaetze = useMemo(() => osmBikeParkings.reduce((s, p) => s + p.stellplaetze, 0), [osmBikeParkings]);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {osmBikeParkings.length} Anlagen, {totalStellplaetze.toLocaleString('de-DE')} Stellplätze
      </Typography>

      <StyledTabs value={view} onChange={(_, v) => setView(v)} aria-label="OSM Ansichten">
        <StyledTab label="Liste" />
        <StyledTab label="Stadtbezirke" />
        <StyledTab label="Typen" />
        <StyledTab label="Statistiken" />
        <StyledTab label="Versorgung" />
        <StyledTab label="Qualität" />
        <StyledTab label="Stadt vs OSM" />
      </StyledTabs>

      {view === 0 && <ListenAnsicht osmBikeParkings={osmBikeParkings} isMobile={isMobile} />}
      {view === 1 && <StadtbezirkAnsicht osmBikeParkings={osmBikeParkings} isMobile={isMobile} />}
      {view === 2 && <TypenAnsicht osmBikeParkings={osmBikeParkings} isMobile={isMobile} />}
      {view === 3 && <StatistikenAnsicht osmBikeParkings={osmBikeParkings} />}
      {view === 4 && <VersorgungAnsicht osmBikeParkings={osmBikeParkings} isMobile={isMobile} />}
      {view === 5 && <QualitaetAnsicht osmBikeParkings={osmBikeParkings} isMobile={isMobile} />}
      {view === 6 && <VergleichAnsicht osmBikeParkings={osmBikeParkings} abstellanlagen={abstellanlagen} isMobile={isMobile} />}
    </Box>
  );
}
