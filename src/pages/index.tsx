import { GetStaticProps } from "next";
import Head from "next/head";
import { getOsmData } from "@/lib/osmDataCache";
import { writeCoverageData, writeMapData } from "@/lib/mapDataWriter";
import { buildCoverageGrid } from "@/lib/osm/coverage";
import {
  generateOverviewStats,
  generateTopFacilities,
  OverviewStats,
  TopFacility,
} from "@/lib/osm/analytics";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import ParkingMap from "@/components/ParkingMap";
import TopFacilitiesMap from "@/components/TopFacilitiesMap";
import DataTable, { Column } from "@/components/DataTable";

interface HomeProps {
  stats: OverviewStats;
  topFacilities: TopFacility[];
}

const topColumns: Column<TopFacility>[] = [
  { key: "rank", label: "#", type: "number" },
  { key: "name", label: "Standort", type: "text" },
  { key: "type", label: "Art", type: "text" },
  { key: "covered", label: "Überdacht", type: "boolean" },
  { key: "capacity", label: "Stellplätze", type: "bar" },
];

export default function Home({ stats, topFacilities }: HomeProps) {
  return (
    <>
      <Head>
        <title>Fahrradparken Karlsruhe</title>
        <meta
          name="description"
          content="Fahrrad-Abstellanlagen in Karlsruhe und Umgebung — Verteilung, Versorgung und Entwicklung auf Basis von OpenStreetMap."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="app-page">
        <PageHeader
          eyebrow="Karlsruhe und Umland"
          title="Fahrradparken in Karlsruhe"
        >
          Verteilung, Versorgung und Qualität der öffentlichen
          Fahrrad-Abstellplätze in Karlsruhe und Umgebung — auf Basis von
          OpenStreetMap.
        </PageHeader>

        <section className="app-grid app-grid--stats" aria-label="Kennzahlen">
          {/* Karlsruhe and the Umland share a card each, rather than one card
              per pair: the city figure only means something next to the total,
              and the two spare slots buy two readings the page didn't have. */}
          <StatCard
            label="Erfasste Anlagen"
            value={stats.totalFacilities.toLocaleString("de-DE")}
            sub={`davon ${stats.karlsruheFacilities.toLocaleString("de-DE")} in Karlsruhe`}
          />
          <StatCard
            label="Stellplätze gesamt"
            value={stats.totalCapacity.toLocaleString("de-DE")}
            sub={`davon ${stats.karlsruheCapacity.toLocaleString("de-DE")} in Karlsruhe`}
          />
          <StatCard
            label="Überdacht"
            value={`${stats.coveredPercent.toLocaleString("de-DE")} %`}
            sub="der Anlagen stehen im Trockenen"
          />
          <StatCard
            label="Ø Stellplätze pro Anlage"
            value={stats.avgCapacity.toLocaleString("de-DE")}
            sub={`in ${stats.regionsCovered.toLocaleString("de-DE")} Regionen`}
          />
        </section>

        <section className="app-section" aria-labelledby="map-heading">
          <SectionHeader id="map-heading" title="Karte">
            Drei Blicke auf dieselben Daten: wo die Anlagen stehen, wo es keine
            gibt — und was sie taugen.
          </SectionHeader>
          <ParkingMap />
        </section>

        <section className="app-section" aria-labelledby="top-heading">
          <SectionHeader id="top-heading" title="Größte Anlagen">
            Verkehrsknoten wie der Hauptbahnhof bündeln viele Stellplätze — in
            der Analyse zählen sie deshalb getrennt. Die Nummern verbinden
            Tabelle und Karte.
          </SectionHeader>
          <div className="app-grid app-grid--two">
            <DataTable
              data={topFacilities}
              columns={topColumns}
              id="topFacilities"
              ariaLabel="Größte Anlagen"
            />
            <aside className="app-panel" aria-label="Lage der größten Anlagen">
              <p className="app-card-subtitle app-legend">
                <span className="app-legend__dot" aria-hidden="true" />
                Lage der größten Anlagen — die Nummern entsprechen der Tabelle.
              </p>
              <div className="app-map-frame">
                <TopFacilitiesMap facilities={topFacilities} />
              </div>
            </aside>
          </div>
        </section>
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  const { parkings, districts } = getOsmData();

  // Emit the slim point set as a static asset the client map fetches async,
  // keeping the multi-thousand-point array out of this page's static props.
  // The walking-distance raster rides along for the same reason.
  writeMapData(parkings);
  writeCoverageData(buildCoverageGrid(parkings, districts));

  return {
    props: {
      stats: generateOverviewStats(parkings),
      topFacilities: generateTopFacilities(parkings, 20),
    },
  };
};
