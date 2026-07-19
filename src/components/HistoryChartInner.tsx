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
              dataKey="cityCapacity"
              name="Stellplätze Karlsruhe"
              stroke="#305f43"
              activeDot={{ r: 8 }}
              connectNulls
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cityFacilities"
              name="Anlagen Karlsruhe"
              stroke="#9d4d12"
              connectNulls
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="totalCapacity"
              name="Stellplätze mit Umland"
              stroke="#305f43"
              strokeOpacity={0.35}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 5 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="totalFacilities"
              name="Anlagen mit Umland"
              stroke="#9d4d12"
              strokeOpacity={0.35}
              strokeDasharray="4 4"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
