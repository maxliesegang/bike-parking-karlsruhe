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
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
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
        <PageHeader
          eyebrow="Datenquellen-Vergleich"
          title="OpenStreetMap vs. Stadt Karlsruhe"
        >
          Die Auswertung nutzt OpenStreetMap als vollständigere, laufend
          aktualisierte Quelle. Der Open-Data-Datensatz der Stadt Karlsruhe
          dient als Gegenprobe.
        </PageHeader>

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
          <SectionHeader
            id="count-heading"
            title="Erfasste Anlagen & Stellplätze"
          >
            Anlagen und Stellplätze im Vergleich — gesamt und auf das
            Stadtgebiet Karlsruhe begrenzt.
          </SectionHeader>
          <DataTable
            data={comparison}
            columns={comparisonColumns}
            id="vergleich"
            ariaLabel="Datenquellen-Vergleich"
          />
        </section>

        <section className="app-section" aria-labelledby="coverage-heading">
          <SectionHeader
            id="coverage-heading"
            title="Vollständigkeit der Angaben"
          >
            Anteil der Einträge je Quelle, die das Merkmal angeben. Merkmale wie
            Bike+Ride und Lastenrad-Eignung gibt es nur im Schema der Stadt
            Karlsruhe (für OpenStreetMap „—“).
          </SectionHeader>
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
