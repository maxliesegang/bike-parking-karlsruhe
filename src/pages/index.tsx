import { GetStaticProps } from "next";
import Head from "next/head";
import { getOsmData } from "@/lib/osmDataCache";
import { writeMapData } from "@/lib/mapDataWriter";
import {
  generateOverviewStats,
  generateTopFacilities,
  OverviewStats,
  TopFacility,
} from "@/lib/osm/analytics";
import { StatCard } from "@/components/StatCard";
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
        <header className="app-hero">
          <div className="app-hero__content">
            <span className="app-eyebrow">Karlsruhe und Umland</span>
            <h1 className="kern-heading-display">Fahrradparken in Karlsruhe</h1>
            <p className="app-lead">
              Wie ist das Fahrrad-Parkangebot in Karlsruhe und den umliegenden
              Gemeinden verteilt? Diese Auswertung basiert auf
              OpenStreetMap-Daten und zeigt, wo die Versorgung gut ist und wo
              sie ausgebaut werden sollte.
            </p>
            <ul className="app-kicker-list" aria-label="Dashboard-Schwerpunkte">
              <li>
                <span className="kern-badge kern-badge--info">
                  <span className="kern-label">Karte</span>
                </span>
              </li>
              <li>
                <span className="kern-badge kern-badge--success">
                  <span className="kern-label">Regionen</span>
                </span>
              </li>
              <li>
                <span className="kern-badge kern-badge--warning">
                  <span className="kern-label">Datenqualität</span>
                </span>
              </li>
            </ul>
          </div>
        </header>

        <section className="app-grid app-grid--stats" aria-label="Kennzahlen">
          <StatCard
            label="Erfasste Anlagen"
            value={stats.totalFacilities.toLocaleString("de-DE")}
            sub="Karlsruhe & Umgebung"
          />
          <StatCard
            label="Stellplätze gesamt"
            value={stats.totalCapacity.toLocaleString("de-DE")}
            sub="Karlsruhe & Umgebung"
          />
          <StatCard
            label="Anlagen in Karlsruhe"
            value={stats.karlsruheFacilities.toLocaleString("de-DE")}
          />
          <StatCard
            label="Stellplätze in Karlsruhe"
            value={stats.karlsruheCapacity.toLocaleString("de-DE")}
          />
        </section>

        <section className="app-section" aria-labelledby="map-heading">
          <div className="app-section__header">
            <h2 id="map-heading" className="kern-heading-x-large">
              Karte
            </h2>
            <p className="app-muted">
              Jeder Punkt ist eine erfasste Fahrrad-Abstellanlage. Beim
              Herauszoomen werden Anlagen gruppiert; ein Klick zeigt Details zur
              Anlage.
            </p>
          </div>
          <div className="app-map-frame">
            <ParkingMap />
          </div>
        </section>

        <section className="app-section" aria-labelledby="top-heading">
          <div className="app-section__header">
            <h2 id="top-heading" className="kern-heading-x-large">
              Größte Anlagen
            </h2>
            <p className="app-muted">
              Verkehrsknoten wie der Hauptbahnhof bündeln sehr viele Stellplätze
              und können die Pro-Kopf-Versorgung eines Bezirks stark anheben.
              Die Nummern in der Tabelle entsprechen den Markierungen auf der
              Karte.
            </p>
          </div>
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
  const { parkings } = getOsmData();

  // Emit the slim point set as a static asset the client map fetches async,
  // keeping the ~7.5k-point array out of this page's static props.
  writeMapData(parkings);

  return {
    props: {
      stats: generateOverviewStats(parkings),
      topFacilities: generateTopFacilities(parkings, 20),
    },
  };
};
