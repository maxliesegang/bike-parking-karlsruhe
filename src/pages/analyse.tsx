import { useState, useMemo, ReactNode } from "react";
import { GetStaticProps } from "next";
import Head from "next/head";
import { getOsmData } from "@/lib/osmDataCache";
import { generateTypeStats, TypeStats } from "@/lib/osm/analytics";
import {
  generateSupplyAnalysis,
  generateQualityAnalysis,
  generateBikeRideAnalysis,
  generateCompletenessAnalysis,
  summarizeBikeRide,
  summarizeCompleteness,
  ratingBaselineOf,
  HUB_MIN_CAPACITY,
  SupplyEntry,
  QualityEntry,
  BikeRideEntry,
  BikeRideSummary,
  CompletenessEntry,
  CompletenessSummary,
} from "@/lib/osm/regionMetrics";
import {
  buildPeerGroups,
  PeerGroup,
  PEER_GROUPS,
  PEER_GROUP_LABEL,
  PEER_GROUP_HINT,
} from "@/lib/osm/peerGroups";
import { median } from "@/lib/math";
import DataTable, { Column } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { StatCard, RatingBadge } from "@/components/StatCard";

interface AnalyseProps {
  supply: SupplyEntry[];
  quality: QualityEntry[];
  bikeRide: BikeRideEntry[];
  bikeRideSummary: BikeRideSummary;
  completeness: CompletenessEntry[];
  completenessSummary: CompletenessSummary;
  types: TypeStats[];
}

// --- Peer-group filter -----------------------------------------------------

type GroupFilter = PeerGroup | "alle";

const GROUP_FILTERS: { value: GroupFilter; label: string }[] = [
  ...PEER_GROUPS.map((group) => ({
    value: group as GroupFilter,
    label: PEER_GROUP_LABEL[group],
  })),
  { value: "alle", label: "Alle Regionen" },
];

function inGroup<T extends { group: PeerGroup }>(
  rows: T[],
  filter: GroupFilter,
): T[] {
  return filter === "alle" ? rows : rows.filter((r) => r.group === filter);
}

function GroupSwitch({
  value,
  onChange,
}: {
  value: GroupFilter;
  onChange: (value: GroupFilter) => void;
}) {
  return (
    <>
      <div className="app-filter" role="group" aria-label="Vergleichsgruppe">
        <span className="app-filter__label">Vergleichsgruppe</span>
        {GROUP_FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            className="app-chip"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="app-muted app-footnote">
        {value === "alle"
          ? "Alle Regionen zusammen — Bewertungen bleiben aber innerhalb der jeweiligen Gruppe."
          : PEER_GROUP_HINT[value]}
      </p>
    </>
  );
}

const pct = (value: number | null): string =>
  value === null ? "—" : `${value} %`;

/** Marks regions whose figures rest on too little or too patchy mapping. */
const SPARSE_MARK = " *";

// --- Versorgung ------------------------------------------------------------

type SupplyRow = {
  name: string;
  population: number | string;
  capacity: number;
  everydayPerThousand: number | string;
  hubPercent: string;
  nearestMedianM: number | string;
  rating: ReactNode;
};

function SupplyView({
  supply,
  filter,
}: {
  supply: SupplyEntry[];
  filter: GroupFilter;
}) {
  const rows = inGroup(supply, filter);

  const columns: Column<SupplyRow>[] = [
    { key: "name", label: "Region", type: "text" },
    { key: "population", label: "Einwohner", type: "number" },
    { key: "capacity", label: "Stellplätze", type: "number" },
    { key: "everydayPerThousand", label: "Alltag pro 1.000 EW", type: "bar" },
    { key: "hubPercent", label: "davon Hubs", type: "text" },
    { key: "nearestMedianM", label: "Nächste Anlage", type: "number" },
    { key: "rating", label: "Bewertung", type: "text" },
  ];

  const data: SupplyRow[] = rows.map((e) => ({
    name: e.name + (e.sparselyMapped ? SPARSE_MARK : ""),
    population: e.population ?? "—",
    capacity: e.capacity,
    everydayPerThousand: e.everydayPerThousand ?? "—",
    hubPercent: `${e.hubPercent} %`,
    nearestMedianM: e.nearestMedianM === null ? "—" : `${e.nearestMedianM} m`,
    rating: <RatingBadge rating={e.rating} />,
  }));

  const rated = rows.filter((e) => e.everydayPerThousand !== null);
  const groupMedian = median(rated.map((e) => e.everydayPerThousand as number));
  const baseline = ratingBaselineOf(groupMedian);
  const hubShare = median(rows.map((e) => e.hubPercent));

  return (
    <div className="app-view">
      <div className="app-grid app-grid--stats">
        <StatCard
          label="Typische Versorgung"
          value={groupMedian.toLocaleString("de-DE")}
          sub="pro 1.000 Einwohner, ohne Bahnhöfe"
        />
        <StatCard
          label="Anteil Bahnhöfe"
          value={`${hubShare} %`}
          sub="der Plätze liegen an Bahnhöfen"
        />
        <StatCard
          label="Regionen in der Gruppe"
          value={rows.length.toLocaleString("de-DE")}
          sub={
            rated.length < rows.length
              ? `${rows.length - rated.length} ohne Einwohnerzahl, ohne Bewertung`
              : "alle mit Einwohnerzahl und Bewertung"
          }
        />
      </div>
      <p className="app-muted">
        <strong>Alltag pro 1.000 EW</strong> zählt nur Anlagen in Wohnnähe.
        Große Anlagen am Bahnhof — Bike-and-Ride oder ab {HUB_MIN_CAPACITY}{" "}
        Plätzen — sind für Pendler da und stehen separat in{" "}
        <strong>davon Hubs</strong>; sonst stünde jeder Bezirk mit Bahnhof
        blendend da.
      </p>
      <p className="app-muted">
        Die <strong>Bewertung</strong> misst am Mittelwert der Gruppe:{" "}
        {groupMedian.toLocaleString("de-DE")} pro 1.000 EW.{" "}
        {baseline > groupMedian && (
          <>
            Das ist zu wenig als Maßstab — wo fast nichts steht, ist „über dem
            Schnitt“ keine gute Versorgung. Hier messen wir deshalb an{" "}
            {baseline.toLocaleString("de-DE")}.{" "}
          </>
        )}
        <strong>Nächste Anlage</strong> ist die Distanz zur nächstgelegenen —
        ehrlicher als „pro km²“, das Wald und Felder verzerren.
      </p>
      <DataTable
        data={data}
        columns={columns}
        id="versorgungTable"
        ariaLabel="Versorgungsgrad"
      />
      <p className="app-muted app-footnote">
        {SPARSE_MARK.trim()} Sehr wenige Anlagen oder viele fehlende Angaben —
        die Zahlen zeigen hier eher, wie gut kartiert wurde. Mehr im Tab
        „Datenqualität“.
      </p>
    </div>
  );
}

// --- Qualität --------------------------------------------------------------

type QualityRow = {
  name: string;
  facilities: number;
  coveredPercent: number;
  securePercent: number;
  litPercent: string;
  feePercent: string;
  mainType: string;
};

function QualityView({
  quality,
  types,
  filter,
}: {
  quality: QualityEntry[];
  types: TypeStats[];
  filter: GroupFilter;
}) {
  const rows = inGroup(quality, filter);

  const columns: Column<QualityRow>[] = [
    { key: "name", label: "Region", type: "text" },
    { key: "facilities", label: "Anlagen", type: "number" },
    { key: "coveredPercent", label: "% überdacht", type: "bar" },
    { key: "securePercent", label: "% abschließbar", type: "bar" },
    { key: "litPercent", label: "% beleuchtet", type: "text" },
    { key: "feePercent", label: "% kostenpflichtig", type: "text" },
    { key: "mainType", label: "Haupttyp", type: "text" },
  ];

  const data: QualityRow[] = rows.map((e) => ({
    name: e.name,
    facilities: e.facilities,
    coveredPercent: e.coveredPercent,
    securePercent: e.securePercent,
    litPercent: pct(e.litPercent),
    feePercent: `${e.feePercent} %`,
    mainType: e.mainType,
  }));

  const secureTotal = rows.reduce((sum, e) => sum + e.secureFacilities, 0);
  const litCoverage = median(rows.map((e) => e.litTaggedPercent));

  const typeColumns: Column<TypeStats>[] = [
    { key: "name", label: "Art", type: "text" },
    { key: "facilities", label: "Anlagen", type: "bar" },
    { key: "capacity", label: "Stellplätze", type: "number" },
    { key: "avgCapacity", label: "Ø/Anlage", type: "number" },
  ];

  return (
    <div className="app-view">
      <p className="app-muted">
        Vier Anteile statt einer Note. <strong>Abschließbar</strong> heißt: Box,
        Schuppen, Gebäude oder Doppelstockparker — in dieser Gruppe{" "}
        {secureTotal.toLocaleString("de-DE")} Anlagen.{" "}
        <strong>Beleuchtet</strong> zählt nur Anlagen mit entsprechendem
        Eintrag, im Schnitt {litCoverage} %.
      </p>
      <DataTable
        data={data}
        columns={columns}
        id="qualitaetTable"
        ariaLabel="Qualitätsmerkmale nach Region"
      />
      <h3 className="app-subheading">Bauarten im Bestand</h3>
      <p className="app-muted">
        Viele kleine Ständer oder wenige große Anlagen? Gilt immer für alle
        Regionen.
      </p>
      <DataTable
        data={types}
        columns={typeColumns}
        id="typTable"
        ariaLabel="Anlagentypen"
      />
    </div>
  );
}

// --- Bike and Ride ---------------------------------------------------------

type BikeRideRow = {
  name: string;
  facilities: number;
  capacity: number;
  largest: number;
  shareOfRegionPercent: string;
  coveredPercent: string;
  securePercent: string;
};

function BikeRideView({
  bikeRide,
  summary,
  filter,
}: {
  bikeRide: BikeRideEntry[];
  summary: BikeRideSummary;
  filter: GroupFilter;
}) {
  const rows = inGroup(bikeRide, filter);

  const columns: Column<BikeRideRow>[] = [
    { key: "name", label: "Region", type: "text" },
    { key: "facilities", label: "Anlagen", type: "number" },
    { key: "capacity", label: "Stellplätze", type: "bar" },
    { key: "largest", label: "größte Anlage", type: "number" },
    { key: "shareOfRegionPercent", label: "Anteil an Region", type: "text" },
    { key: "coveredPercent", label: "% überdacht", type: "text" },
    { key: "securePercent", label: "% abschließbar", type: "text" },
  ];

  const data: BikeRideRow[] = rows.map((e) => ({
    name: e.name,
    facilities: e.facilities,
    capacity: e.capacity,
    largest: e.largest,
    shareOfRegionPercent: `${e.shareOfRegionPercent} %`,
    coveredPercent: `${e.coveredPercent} %`,
    securePercent: `${e.securePercent} %`,
  }));

  return (
    <div className="app-view">
      <div className="app-grid app-grid--stats">
        <StatCard
          label="B+R-Stellplätze"
          value={summary.capacity.toLocaleString("de-DE")}
          sub={`${summary.capacityPercent} % aller Stellplätze`}
        />
        <StatCard
          label="B+R-Anlagen"
          value={summary.facilities.toLocaleString("de-DE")}
          sub={`in ${summary.regions} Regionen`}
        />
        <StatCard
          label="davon überdacht"
          value={`${summary.coveredPercent} %`}
          sub={`${summary.securePercent} % abschließbar`}
        />
      </div>
      <p className="app-muted">
        Radparken an Bahnhöfen und Haltestellen — im Tab „Versorgung“ nicht
        enthalten. Gezählt wird pro Region, weil die Anlagen in OpenStreetMap
        fast nie einen Namen haben; die Summe einer Region ist meist genau die
        Station dort.
      </p>
      <DataTable
        data={data}
        columns={columns}
        id="bikeRideTable"
        ariaLabel="Bike-and-Ride nach Region"
      />
    </div>
  );
}

// --- Datenqualität ---------------------------------------------------------

type CompletenessRow = {
  name: string;
  facilities: number;
  capacityTaggedPercent: string;
  coveredTaggedPercent: string;
  accessTaggedPercent: string;
  litTaggedPercent: string;
  taggingPercent: number;
  lastCheck: string;
};

function CompletenessView({
  completeness,
  summary,
  filter,
}: {
  completeness: CompletenessEntry[];
  summary: CompletenessSummary;
  filter: GroupFilter;
}) {
  const rows = inGroup(completeness, filter);

  const columns: Column<CompletenessRow>[] = [
    { key: "name", label: "Region", type: "text" },
    { key: "facilities", label: "Anlagen", type: "number" },
    { key: "taggingPercent", label: "Ø Tag-Abdeckung", type: "bar" },
    { key: "capacityTaggedPercent", label: "Stellplätze", type: "text" },
    { key: "coveredTaggedPercent", label: "Überdachung", type: "text" },
    { key: "accessTaggedPercent", label: "Zugang", type: "text" },
    { key: "litTaggedPercent", label: "Beleuchtung", type: "text" },
    { key: "lastCheck", label: "zuletzt geprüft", type: "text" },
  ];

  const data: CompletenessRow[] = rows.map((e) => ({
    name: e.name,
    facilities: e.facilities,
    capacityTaggedPercent: `${e.capacityTaggedPercent} %`,
    coveredTaggedPercent: `${e.coveredTaggedPercent} %`,
    accessTaggedPercent: `${e.accessTaggedPercent} %`,
    litTaggedPercent: `${e.litTaggedPercent} %`,
    taggingPercent: e.taggingPercent,
    lastCheck: e.lastCheck
      ? new Date(e.lastCheck).toLocaleDateString("de-DE")
      : "nie",
  }));

  return (
    <div className="app-view">
      <div className="app-grid app-grid--stats">
        <StatCard
          label="mit Stellplatz-Angabe"
          value={`${summary.capacityTaggedPercent} %`}
          sub="über alle Regionen"
        />
        <StatCard
          label="mit Zugangs-Angabe"
          value={`${summary.accessTaggedPercent} %`}
          sub={`Beleuchtung: ${summary.litTaggedPercent} %`}
        />
        <StatCard
          label="vor Ort geprüft"
          value={`${summary.checkedPercent} %`}
          sub="jemals vor Ort nachgesehen"
        />
        <StatCard
          label="dünn kartierte Regionen"
          value={summary.sparseRegions.toLocaleString("de-DE")}
          sub="in der Versorgung mit * markiert"
        />
      </div>
      <p className="app-muted">
        Fehlt eine Angabe, rechnet die Auswertung mit null: ohne
        Stellplatz-Angabe 0 Plätze, ohne Angabe zur Überdachung nicht überdacht.
        Die Spalten zeigen, wie oft die Angabe da ist. Steht eine Region hier
        weit oben und in der Versorgung weit unten, ist sie eher schlecht
        kartiert als schlecht ausgestattet. Sortiert von wenig zu viel — ganz
        oben bringt Mitmachen am meisten.
      </p>
      <DataTable
        data={data}
        columns={columns}
        id="datenqualitaetTable"
        ariaLabel="Datenqualität nach Region"
      />
    </div>
  );
}

// --- Page ------------------------------------------------------------------

const TABS = ["Versorgung", "Qualität", "Bike+Ride", "Datenqualität"];

export default function Analyse({
  supply,
  quality,
  bikeRide,
  bikeRideSummary,
  completeness,
  completenessSummary,
  types,
}: AnalyseProps) {
  const [view, setView] = useState(0);
  const [filter, setFilter] = useState<GroupFilter>("stadt");

  const views = useMemo(
    () => [
      <SupplyView key="v" supply={supply} filter={filter} />,
      <QualityView key="q" quality={quality} types={types} filter={filter} />,
      <BikeRideView
        key="b"
        bikeRide={bikeRide}
        summary={bikeRideSummary}
        filter={filter}
      />,
      <CompletenessView
        key="d"
        completeness={completeness}
        summary={completenessSummary}
        filter={filter}
      />,
    ],
    [
      supply,
      quality,
      bikeRide,
      bikeRideSummary,
      completeness,
      completenessSummary,
      types,
      filter,
    ],
  );

  return (
    <>
      <Head>
        <title>Analyse — Fahrradparken Karlsruhe</title>
        <meta
          name="description"
          content="Versorgung, Qualität, Bike-and-Ride und Datenqualität der Fahrrad-Abstellanlagen nach Region — nach Siedlungstyp gruppiert, von der dichten Stadt bis zum Dorf."
        />
      </Head>

      <div className="app-page">
        <PageHeader eyebrow="Regionen im Vergleich" title="Analyse nach Region">
          Ein Stadtteil und eine Umland-Gemeinde lassen sich nicht direkt
          vergleichen. Beide Gruppen werten wir deshalb getrennt aus, und Plätze
          am Bahnhof zählen extra — nicht zur Versorgung der Nachbarschaft.
        </PageHeader>

        <section className="app-section">
          <div
            className="app-tabs"
            role="tablist"
            aria-label="Analyse-Ansichten"
          >
            {TABS.map((tab, index) => (
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
          <GroupSwitch value={filter} onChange={setFilter} />
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
  const supply = generateSupplyAnalysis(parkings, regions);
  const groups = buildPeerGroups(regions);

  return {
    props: {
      supply,
      quality: generateQualityAnalysis(parkings, groups),
      bikeRide: generateBikeRideAnalysis(parkings, groups),
      bikeRideSummary: summarizeBikeRide(parkings),
      completeness: generateCompletenessAnalysis(parkings, groups),
      completenessSummary: summarizeCompleteness(parkings, supply),
      types: generateTypeStats(parkings),
    },
  };
};
