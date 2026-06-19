import { GetStaticProps } from "next";
import Head from "next/head";
import { getOsmData } from "@/lib/osmDataCache";
import { getAbstellanlagen } from "@/lib/staticDataCache";
import {
  generateComparison,
  generateCoverageComparison,
  ComparisonEntry,
  CoverageEntry,
} from "@/lib/osm/analytics";
import { round } from "@/lib/math";
import DataTable, { Column } from "@/components/DataTable";
import { StatCard } from "@/components/StatCard";

interface VergleichProps {
  comparison: ComparisonEntry[];
  coverage: CoverageEntry[];
}

const comparisonColumns: Column<ComparisonEntry>[] = [
  { key: "category", label: "Kategorie", type: "text" },
  { key: "osm", label: "OpenStreetMap", type: "number" },
  { key: "city", label: "Stadt Karlsruhe", type: "number" },
];

const coverageColumns: Column<CoverageEntry>[] = [
  { key: "category", label: "Merkmal", type: "text" },
  { key: "osm", label: "OpenStreetMap", type: "text" },
  { key: "city", label: "Stadt Karlsruhe", type: "text" },
];

export default function Vergleich({ comparison, coverage }: VergleichProps) {
  const total = comparison.find(
    (e) => e.category === "Erfasste Anlagen (gesamt)",
  );
  const osmCount = total?.osm ?? 0;
  const cityCount = total?.city ?? 0;
  const factor = cityCount > 0 ? `${round(osmCount / cityCount)}×` : "—";

  return (
    <>
      <Head>
        <title>Datenquellen-Vergleich — Fahrradparken Karlsruhe</title>
        <meta
          name="description"
          content="Vergleich der Fahrradparken-Daten aus OpenStreetMap mit dem offiziellen Open-Data-Datensatz der Stadt Karlsruhe."
        />
      </Head>

      <div className="app-page">
        <header className="app-hero">
          <div className="app-hero__content">
            <span className="app-eyebrow">Datenquellen-Vergleich</span>
            <h1 className="kern-heading-display">
              OpenStreetMap vs. Stadt Karlsruhe
            </h1>
            <p className="app-lead">
              Diese Seite basiert auf OpenStreetMap, weil es die vollständigere
              und kontinuierlich aktualisierte Quelle ist. Der offizielle
              Open-Data-Datensatz der Stadt Karlsruhe (WFS) wird als Referenz
              und Gegenprobe herangezogen.
            </p>
          </div>
        </header>

        <section className="app-grid app-grid--stats" aria-label="Kennzahlen">
          <StatCard
            label="OpenStreetMap"
            value={osmCount.toLocaleString("de-DE")}
            sub="erfasste Anlagen"
          />
          <StatCard
            label="Stadt Karlsruhe"
            value={cityCount.toLocaleString("de-DE")}
            sub="erfasste Anlagen"
          />
          <StatCard label="Faktor" value={factor} sub="mehr Anlagen in OSM" />
        </section>

        <section className="app-section" aria-labelledby="count-heading">
          <div className="app-section__header">
            <h2 id="count-heading" className="kern-heading-x-large">
              Erfasste Anlagen & Stellplätze
            </h2>
            <p className="app-muted">
              Gegenüberstellung der Anzahl erfasster Anlagen und der Summe der
              Stellplätze, jeweils gesamt und auf das Stadtgebiet Karlsruhe
              begrenzt.
            </p>
          </div>
          <DataTable
            data={comparison}
            columns={comparisonColumns}
            id="vergleich"
            ariaLabel="Datenquellen-Vergleich"
          />
        </section>

        <section className="app-section" aria-labelledby="coverage-heading">
          <div className="app-section__header">
            <h2 id="coverage-heading" className="kern-heading-x-large">
              Vollständigkeit der Angaben
            </h2>
            <p className="app-muted">
              Anteil der Einträge jeder Quelle, die das jeweilige Merkmal
              angeben. Einige Merkmale, etwa Bike+Ride und Lastenrad-Eignung,
              sind nur im Schema der Stadt Karlsruhe vorgesehen und für
              OpenStreetMap mit „—“ gekennzeichnet.
            </p>
          </div>
          <DataTable
            data={coverage}
            columns={coverageColumns}
            id="abdeckung"
            ariaLabel="Vollständigkeit der Angaben"
          />
          <p className="app-footnote">
            Die OpenStreetMap-Daten auf dieser Seite werden automatisch
            aktualisiert, während der städtische Datensatz eine statische
            Momentaufnahme ist.
          </p>
        </section>
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps<VergleichProps> = async () => {
  const { parkings } = getOsmData();
  const abstellanlagen = await getAbstellanlagen();
  return {
    props: {
      comparison: generateComparison(parkings, abstellanlagen),
      coverage: generateCoverageComparison(parkings, abstellanlagen),
    },
  };
};
