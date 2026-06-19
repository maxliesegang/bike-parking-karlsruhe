import { GetStaticProps } from "next";
import Head from "next/head";
import { getOsmData } from "@/lib/osmDataCache";
import { OsmSnapshot } from "@/lib/osmHistoryMapper";
import HistoryChart from "@/components/HistoryChart";

interface ProgressProps {
  history: OsmSnapshot[];
}

export default function Progress({ history }: ProgressProps) {
  const latest = history[history.length - 1];
  const first = history[0];
  const delta =
    latest && first ? latest.totalCapacity - first.totalCapacity : 0;

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
        <header className="app-hero">
          <div className="app-hero__content">
            <span className="app-eyebrow">Zeitreihe</span>
            <h1 className="kern-heading-display">Entwicklung über Zeit</h1>
            <p className="app-lead">
              Bei jedem Datenabgleich wird ein Messpunkt gespeichert. So lässt
              sich verfolgen, wie das erfasste Fahrrad-Parkangebot in der Region
              wächst.
              {delta > 0 && (
                <>
                  {" "}
                  Seit Beginn der Aufzeichnung kamen{" "}
                  <strong>{delta.toLocaleString("de-DE")}</strong> Stellplätze
                  hinzu.
                </>
              )}
            </p>
          </div>
        </header>

        <section className="app-section" aria-labelledby="history-heading">
          <div className="app-section__header">
            <h2 id="history-heading" className="kern-heading-x-large">
              Messpunkte
            </h2>
            <p className="app-muted">
              Die Linien trennen die Entwicklung der Stellplätze von der Anzahl
              der erfassten Anlagen, damit Datenzuwachs und Angebotsausbau
              unterscheidbar bleiben.
            </p>
          </div>
          <HistoryChart history={history} />
        </section>
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps<ProgressProps> = async () => {
  const { history } = getOsmData();
  return { props: { history } };
};
