import { GetStaticProps } from "next";
import Head from "next/head";
import { getOsmData } from "@/lib/osmDataCache";
import { OsmSnapshot } from "@/lib/osmHistoryMapper";
import {
  buildHistoryYears,
  summarizeHistory,
  HistorySummary,
  HistoryYear,
} from "@/lib/osm/history";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { StatCard } from "@/components/StatCard";
import HistoryChart from "@/components/HistoryChart";
import DataTable, { Column } from "@/components/DataTable";

interface YearRow {
  Jahr: string;
  Anlagen: string;
  Stellplätze: number;
  Zuwachs: string;
  Wachstum: string;
}

interface ProgressProps {
  history: OsmSnapshot[];
  summary: HistorySummary | null;
  yearRows: YearRow[];
}

const yearColumns: Column<YearRow>[] = [
  { key: "Jahr", label: "Jahr", type: "text" },
  { key: "Anlagen", label: "Anlagen", type: "text" },
  { key: "Stellplätze", label: "Stellplätze", type: "bar" },
  { key: "Zuwachs", label: "Zuwachs Stellplätze", type: "text" },
  { key: "Wachstum", label: "Wachstum", type: "text" },
];

const de = (value: number) => value.toLocaleString("de-DE");
const signed = (value: number) => `${value > 0 ? "+" : ""}${de(value)}`;
const percent = (value: number, digits = 1) =>
  `${value > 0 ? "+" : ""}${value.toLocaleString("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} %`;
const decimal = (value: number, digits = 1) =>
  value.toLocaleString("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
const monthYear = (date: string) =>
  new Date(date).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });

function toYearRows(years: HistoryYear[]): YearRow[] {
  return [...years].reverse().map((y) => ({
    Jahr: y.partial ? `${y.year} (laufend)` : y.year,
    Anlagen: de(y.facilities),
    Stellplätze: y.capacity,
    Zuwachs: `${signed(y.capacityDelta)} (${signed(y.facilityDelta)} Anlagen)`,
    Wachstum: percent(y.growthPercent),
  }));
}

export default function Progress({
  history,
  summary,
  yearRows,
}: ProgressProps) {
  return (
    <>
      <Head>
        <title>Entwicklung — Fahrradparken Karlsruhe</title>
        <meta
          name="description"
          content="Entwicklung der erfassten Fahrrad-Stellplätze in Karlsruhe und Umgebung über die Zeit."
        />
      </Head>

      <div className="app-page">
        <PageHeader eyebrow="Zeitreihe" title="Entwicklung über Zeit">
          Monatliche Messpunkte zeigen, wie das erfasste Fahrrad-Parkangebot in
          Karlsruhe und im Umland wächst.
          {summary && (
            <>
              {" "}
              Seit {monthYear(summary.firstDate)} hat sich die erfasste
              Kapazität auf das{" "}
              <strong>{decimal(summary.growthFactor)}-fache</strong> erhöht —
              Stand {monthYear(summary.latestDate)}.
            </>
          )}
        </PageHeader>

        {summary && (
          <section className="app-grid app-grid--stats" aria-label="Kennzahlen">
            <StatCard
              label="Stellplätze heute"
              value={de(summary.capacityTotal)}
              sub={`in ${de(summary.facilitiesTotal)} Anlagen`}
            />
            <StatCard
              label="Zuwachs 12 Monate"
              value={signed(summary.capacity12m)}
              sub={`${percent(summary.capacity12mPercent)} · ${signed(
                summary.facilities12m,
              )} Anlagen`}
            />
            <StatCard
              label="Ø Zuwachs pro Monat"
              value={signed(Math.round(summary.capacityPerMonth12m))}
              sub="Mittel der letzten 12 Monate"
            />
            <StatCard
              label="Ø Plätze pro Anlage"
              value={decimal(summary.avgCapacity)}
              sub={`${monthYear(summary.firstDate)}: ${decimal(
                summary.avgCapacityFirst,
              )}`}
            />
          </section>
        )}

        <section className="app-section" aria-labelledby="history-heading">
          <SectionHeader id="history-heading" title="Messpunkte">
            {summary
              ? `${summary.months} Messpunkte zwischen ${monthYear(
                  summary.firstDate,
                )} und ${monthYear(summary.latestDate)}. Karlsruhe stellt heute ${
                  summary.cityShare !== null
                    ? `${decimal(summary.cityShare, 0)} %`
                    : "einen Teil"
                } der erfassten Stellplätze.`
              : "Die Zeitreihe wächst mit jedem Daten-Update."}
          </SectionHeader>
          <HistoryChart history={history} />
        </section>

        {yearRows.length > 0 && (
          <section className="app-section" aria-labelledby="years-heading">
            <SectionHeader id="years-heading" title="Jahresbilanz">
              Stand am Jahresende und der Zuwachs innerhalb des Jahres —
              sortierbar, neueste Jahre zuerst.
            </SectionHeader>
            <DataTable
              data={yearRows}
              columns={yearColumns}
              id="historyYears"
              ariaLabel="Jahresbilanz der erfassten Stellplätze"
            />
          </section>
        )}

        <p className="app-muted app-note">
          Die Messpunkte bis Juni 2026 stammen aus der OSM-Vollhistorie
          (ohsome-API), danach schreibt jeder monatliche Datenabgleich einen
          neuen Punkt. Gezählt wird nur öffentlich zugängliches Fahrradparken.
          Zuwachs heißt &bdquo;neu in OpenStreetMap erfasst&ldquo; — eine neue
          Anlage oder eine bisher fehlende Kartierung.
        </p>
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps<ProgressProps> = async () => {
  const { history } = getOsmData();
  const hasSeries = history.length >= 2;

  return {
    props: {
      history,
      summary: hasSeries ? summarizeHistory(history) : null,
      yearRows: hasSeries ? toYearRows(buildHistoryYears(history)) : [],
    },
  };
};
