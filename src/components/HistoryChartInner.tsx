import { useMemo, ReactNode } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { OsmSnapshot } from "@/lib/osmHistoryMapper";
import {
  buildHistoryPoints,
  buildHistoryYears,
  HistoryPoint,
  HistoryYear,
} from "@/lib/osm/history";

interface HistoryChartProps {
  history: OsmSnapshot[];
}

// Two hues, validated for colour-vision deficiency against the page surface
// (green/orange of the app accent pair is not separable for deuteranopia).
const CITY = "#2d7a4f";
const UMLAND = "#1f5fa8";

const de = (value: number) => value.toLocaleString("de-DE");
const monthLabel = (date: string) =>
  new Date(date).toLocaleDateString("de-DE", {
    month: "2-digit",
    year: "numeric",
  });

/** January of every third year — enough ticks to orient without crowding. */
function yearTicks(points: HistoryPoint[]): string[] {
  const firstOfYear = points.filter(
    (p, i) => i === 0 || p.date.slice(0, 4) !== points[i - 1].date.slice(0, 4),
  );
  const step = firstOfYear.length > 9 ? 2 : 1;
  return firstOfYear.filter((_, i) => i % step === 0).map((p) => p.date);
}

function ChartFrame({
  title,
  subtitle,
  children,
  footnote,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footnote?: string;
}) {
  return (
    <div className="app-chart-frame">
      <div className="app-chart-head">
        <p className="app-chart-title">{title}</p>
        {subtitle && <p className="app-chart-subtitle">{subtitle}</p>}
      </div>
      <div className="app-chart app-chart--compact">{children}</div>
      {footnote && <p className="app-chart-footnote">{footnote}</p>}
    </div>
  );
}

interface TooltipRow {
  name: string;
  value: number;
  color: string;
}

function SeriesTooltip({
  active,
  label,
  rows,
  showTotal,
}: {
  active?: boolean;
  label: string;
  rows: TooltipRow[];
  showTotal: boolean;
}) {
  if (!active || rows.length === 0) return null;
  const total = rows.reduce((sum, r) => sum + r.value, 0);
  return (
    <div className="app-tooltip">
      <p className="app-tooltip__label">{label}</p>
      {rows.map((r) => (
        <p className="app-tooltip__row" key={r.name}>
          <span
            className="app-tooltip__swatch"
            style={{ background: r.color }}
          />
          {r.name}
          <strong>{de(r.value)}</strong>
        </p>
      ))}
      {showTotal && (
        <p className="app-tooltip__row app-tooltip__row--total">
          Gesamt
          <strong>{de(total)}</strong>
        </p>
      )}
    </div>
  );
}

// Recharts passes an untyped payload; narrow it to the fields we render.
interface RechartsTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: readonly {
    name?: string | number;
    value?: unknown;
    color?: string;
  }[];
}

function makeTooltip(labelOf: (label: string) => string, showTotal = true) {
  const Rendered = ({ active, label, payload }: RechartsTooltipProps) => (
    <SeriesTooltip
      active={active}
      label={labelOf(String(label ?? ""))}
      rows={(payload ?? [])
        .filter((p) => typeof p.value === "number")
        .map((p) => ({
          name: String(p.name ?? ""),
          value: p.value as number,
          color: p.color ?? CITY,
        }))}
      showTotal={showTotal}
    />
  );
  return Rendered;
}

function StackedAreaChart({
  points,
  ticks,
  cityKey,
  umlandKey,
}: {
  points: HistoryPoint[];
  ticks: string[];
  cityKey: "capacityCity" | "facilitiesCity";
  umlandKey: "capacityUmland" | "facilitiesUmland";
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={points}
        margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
      >
        <CartesianGrid stroke="var(--app-grid-line)" vertical={false} />
        <XAxis
          dataKey="date"
          ticks={ticks}
          tickFormatter={(date: string) => date.slice(0, 4)}
          tick={{ fontSize: 12 }}
          tickLine={false}
          stroke="var(--app-grid-line)"
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={de}
        />
        <Tooltip
          content={makeTooltip(monthLabel)}
          cursor={{ stroke: "var(--app-text-muted)", strokeWidth: 1 }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
          iconType="square"
        />
        <Area
          type="monotone"
          dataKey={cityKey}
          name="Karlsruhe (Stadt)"
          stackId="1"
          stroke={CITY}
          strokeWidth={2}
          fill={CITY}
          fillOpacity={0.5}
          connectNulls
        />
        <Area
          type="monotone"
          dataKey={umlandKey}
          name="Umland"
          stackId="1"
          stroke={UMLAND}
          strokeWidth={2}
          fill={UMLAND}
          fillOpacity={0.35}
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function YearlyGrowthChart({ years }: { years: HistoryYear[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={years} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
        <CartesianGrid stroke="var(--app-grid-line)" vertical={false} />
        <XAxis
          dataKey="year"
          tickFormatter={(year: string) => year.slice(2)}
          tick={{ fontSize: 12 }}
          tickLine={false}
          stroke="var(--app-grid-line)"
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={de}
        />
        <Tooltip
          content={makeTooltip((year) => `Jahr ${year}`)}
          cursor={{ fill: "var(--app-grid-line)" }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
          iconType="square"
        />
        <Bar
          dataKey="capacityDeltaCity"
          name="Karlsruhe (Stadt)"
          stackId="1"
          fill={CITY}
        />
        <Bar
          dataKey="capacityDeltaUmland"
          name="Umland"
          stackId="1"
          fill={UMLAND}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function HistoryChartInner({ history }: HistoryChartProps) {
  const points = useMemo(() => buildHistoryPoints(history), [history]);
  const years = useMemo(() => buildHistoryYears(history), [history]);
  const ticks = useMemo(() => yearTicks(points), [points]);
  const partialYear = years.find((y) => y.partial)?.year;

  return (
    <div className="app-chart-stack">
      <ChartFrame
        title="Stellplätze im Zeitverlauf"
        subtitle="Gestapelt — die Höhe der Fläche entspricht der Gesamtkapazität."
      >
        <StackedAreaChart
          points={points}
          ticks={ticks}
          cityKey="capacityCity"
          umlandKey="capacityUmland"
        />
      </ChartFrame>

      <div className="app-grid app-grid--even">
        <ChartFrame
          title="Anlagen im Zeitverlauf"
          subtitle="Anzahl erfasster Abstellanlagen, gestapelt."
        >
          <StackedAreaChart
            points={points}
            ticks={ticks}
            cityKey="facilitiesCity"
            umlandKey="facilitiesUmland"
          />
        </ChartFrame>

        <ChartFrame
          title="Zuwachs an Stellplätzen pro Jahr"
          subtitle="Veränderung gegenüber dem Stand am Jahresende davor."
          footnote={
            partialYear
              ? `${partialYear} ist ein laufendes Jahr und daher noch nicht vollständig.`
              : undefined
          }
        >
          <YearlyGrowthChart years={years} />
        </ChartFrame>
      </div>
    </div>
  );
}
