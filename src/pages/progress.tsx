import { GetStaticProps } from "next";
import Head from "next/head";
import { getOsmData } from "@/lib/osmDataCache";
import { OsmSnapshot } from "@/lib/osmHistoryMapper";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import HistoryChart from "@/components/HistoryChart";

interface ProgressProps {
  history: OsmSnapshot[];
}

export default function Progress({ history }: ProgressProps) {
  // Prefer the Karlsruhe-city series; fall back to the whole-dataset totals
  // for the historical span recorded before city tracking existed.
  const cityPoints = history.filter((s) => s.cityCapacity !== undefined);
  const series =
    cityPoints.length >= 2
      ? cityPoints.map((s) => s.cityCapacity as number)
      : history.map((s) => s.totalCapacity);
  const delta = series.length >= 2 ? series[series.length - 1] - series[0] : 0;

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
          Jeder Datenabgleich speichert einen Messpunkt — so wird sichtbar, wie
          das erfasste Fahrrad-Parkangebot wächst.
          {delta > 0 && (
            <>
              {" "}
              Seit Beginn der Aufzeichnung kamen{" "}
              <strong>{delta.toLocaleString("de-DE")}</strong> Stellplätze
              hinzu.
            </>
          )}
        </PageHeader>

        <section className="app-section" aria-labelledby="history-heading">
          <SectionHeader id="history-heading" title="Messpunkte">
            Durchgezogene Linien zeigen Karlsruhe (Stadtgebiet), die
            gestrichelten das Gesamtangebot inklusive Umland — jeweils getrennt
            nach Stellplätzen und Anlagen.
          </SectionHeader>
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
