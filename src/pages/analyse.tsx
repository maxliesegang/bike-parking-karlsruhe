import { useState, useMemo, ReactNode } from "react";
import { GetStaticProps } from "next";
import Head from "next/head";
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
import { PageHeader } from "@/components/PageHeader";
import { RatingBadge } from "@/components/StatCard";

interface AnalyseProps {
  supply: SupplyEntry[];
  quality: QualityEntry[];
  types: TypeStats[];
}

const LEVEL_LABEL: Record<number, string> = {
  10: "Karlsruhe (Stadtbezirk)",
  9: "Karlsruhe (Stadtteil)",
  8: "Umland-Gemeinde",
  0: "—",
};

type SupplyRow = {
  name: string;
  gebiet: string;
  population: number | string;
  capacity: number;
  perThousand: number | string;
  perKm2: number;
  rating: ReactNode;
};

function SupplyView({ supply }: { supply: SupplyEntry[] }) {
  const columns: Column<SupplyRow>[] = [
    { key: "name", label: "Region", type: "text" },
    { key: "gebiet", label: "Gebiet", type: "text" },
    { key: "population", label: "Einwohner", type: "number" },
    { key: "capacity", label: "Stellplätze", type: "number" },
    { key: "perThousand", label: "pro 1.000 EW", type: "bar" },
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
    <div className="app-view">
      <p className="app-muted">
        Stellplätze pro Einwohner, schlecht versorgte Regionen zuerst.
        Vergleichswerte: Bremen ~28, München ~27, Freiburg ~22 pro 1.000 EW
        (ADFC). Gemeinden ohne Einwohnerdaten bleiben unbewertet.
      </p>
      <DataTable
        data={data}
        columns={columns}
        id="versorgungTable"
        ariaLabel="Versorgungsgrad"
      />
    </div>
  );
}

function QualityView({ quality }: { quality: QualityEntry[] }) {
  const avgScore = average(quality.map((e) => e.score));

  const columns: Column<QualityEntry>[] = [
    { key: "name", label: "Region", type: "text" },
    { key: "score", label: "Qualität (1–10)", type: "bar" },
    { key: "capacity", label: "Stellplätze", type: "number" },
    { key: "coveredPercent", label: "% Überdacht", type: "number" },
    { key: "highQuality", label: "Hochwertige Anlagen", type: "number" },
    { key: "mainType", label: "Haupttyp", type: "text" },
  ];

  return (
    <div className="app-view">
      <p className="app-muted">
        Bewertet nach Anlagentyp (Boxen und Häuser hoch, einfache Ständer
        niedrig), Überdachung und Gebührenfreiheit. Ø {avgScore}/10 über alle
        Regionen.
      </p>
      <DataTable
        data={quality}
        columns={columns}
        id="qualitaetTable"
        ariaLabel="Qualitätsanalyse"
      />
    </div>
  );
}

function TypesView({ types }: { types: TypeStats[] }) {
  const columns: Column<TypeStats>[] = [
    { key: "name", label: "Art", type: "text" },
    { key: "facilities", label: "Anlagen", type: "number" },
    { key: "capacity", label: "Stellplätze", type: "number" },
    { key: "avgCapacity", label: "Ø/Anlage", type: "number" },
  ];
  return (
    <div className="app-view">
      <p className="app-muted">
        Verteilung nach Bauart — prägen viele kleine Standardständer oder
        größere, hochwertigere Anlagen den Bestand?
      </p>
      <DataTable
        data={types}
        columns={columns}
        id="typTable"
        ariaLabel="Anlagentypen"
      />
    </div>
  );
}

export default function Analyse({ supply, quality, types }: AnalyseProps) {
  const [view, setView] = useState(0);

  const views = useMemo(
    () => [
      <SupplyView key="v" supply={supply} />,
      <QualityView key="q" quality={quality} />,
      <TypesView key="t" types={types} />,
    ],
    [supply, quality, types],
  );

  const tabs = ["Versorgung", "Qualität", "Anlagentypen"];

  return (
    <>
      <Head>
        <title>Analyse — Fahrradparken Karlsruhe</title>
        <meta
          name="description"
          content="Versorgungsgrad und Qualität der Fahrrad-Abstellanlagen nach Region."
        />
      </Head>

      <div className="app-page">
        <PageHeader
          eyebrow="Regionen, Qualität und Typen"
          title="Analyse nach Region"
        >
          Verdichtet für den schnellen Überblick — alle Tabellen bleiben
          sortierbar für die Detailarbeit.
        </PageHeader>

        <section className="app-section">
          <div
            className="app-tabs"
            role="tablist"
            aria-label="Analyse-Ansichten"
          >
            {tabs.map((tab, index) => (
              <button
                key={tab}
                id={`analysis-tab-${index}`}
                className="app-tab"
                type="button"
                role="tab"
                aria-selected={view === index}
                aria-controls={`analysis-panel-${index}`}
                onClick={() => setView(index)}
              >
                {tab}
              </button>
            ))}
          </div>
          <div
            id={`analysis-panel-${view}`}
            role="tabpanel"
            aria-labelledby={`analysis-tab-${view}`}
          >
            {views[view]}
          </div>
        </section>
      </div>
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
