import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { OsmSnapshot } from "@/lib/osmHistoryMapper";

interface HistoryChartProps {
  history: OsmSnapshot[];
}

export default function HistoryChartInner({ history }: HistoryChartProps) {
  return (
    <div className="app-chart-frame">
      <div className="app-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={history}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              minTickGap={24}
              height={42}
            />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12 }}
            />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="totalCapacity"
              name="Stellplätze gesamt"
              stroke="#305f43"
              activeDot={{ r: 8 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="totalFacilities"
              name="Anlagen gesamt"
              stroke="#9d4d12"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
