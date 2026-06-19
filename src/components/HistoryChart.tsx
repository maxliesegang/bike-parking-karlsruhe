import dynamic from "next/dynamic";
import { OsmSnapshot } from "@/lib/osmHistoryMapper";

interface HistoryChartProps {
  history: OsmSnapshot[];
}

const HistoryChartInner = dynamic(() => import("./HistoryChartInner"), {
  ssr: false,
  loading: () => (
    <div className="app-chart-frame">
      <div className="app-loading" role="status" aria-live="polite">
        <div className="app-loading__content">
          <span
            className="kern-loader kern-loader--visible"
            aria-hidden="true"
          />
          <span>Diagramm wird geladen.</span>
        </div>
      </div>
    </div>
  ),
});

export default function HistoryChart({ history }: HistoryChartProps) {
  if (history.length < 2) {
    return (
      <p className="app-muted">
        Die Zeitreihe wird mit jedem Daten-Update länger. Aktuell liegen{" "}
        {history.length} Messpunkt(e) vor — bitte später erneut vorbeischauen.
      </p>
    );
  }

  return <HistoryChartInner history={history} />;
}
