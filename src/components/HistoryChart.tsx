import { Box, Typography, useMediaQuery, useTheme } from "@mui/material";
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

export default function HistoryChart({ history }: HistoryChartProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  if (history.length < 2) {
    return (
      <Typography color="text.secondary">
        Die Zeitreihe wird mit jedem Daten-Update länger. Aktuell liegen{" "}
        {history.length} Messpunkt(e) vor — bitte später erneut vorbeischauen.
      </Typography>
    );
  }

  return (
    <Box sx={{ height: isMobile ? 320 : 440 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={history}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: isMobile ? 10 : 12 }}
            angle={isMobile ? -45 : 0}
            textAnchor={isMobile ? "end" : "middle"}
            height={isMobile ? 60 : 30}
          />
          <YAxis yAxisId="left" tick={{ fontSize: isMobile ? 10 : 12 }} />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: isMobile ? 10 : 12 }}
          />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="totalStellplaetze"
            name="Stellplätze gesamt"
            stroke="#005538"
            activeDot={{ r: 8 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="totalAnlagen"
            name="Anlagen gesamt"
            stroke="#f57c00"
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
