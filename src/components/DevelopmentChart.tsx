import { useMemo } from "react";
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
import { Abstellanlage } from "../models/abstellanlage";

interface DevelopmentChartProps {
  abstellanlagen: Abstellanlage[];
}

function getEarliestDate(anlage: Abstellanlage): number {
  return Math.min(
    new Date(anlage.firstFetched).getTime(),
    new Date(anlage.lastUpdated).getTime(),
  );
}

export default function DevelopmentChart({
  abstellanlagen,
}: DevelopmentChartProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const timelineData = useMemo(() => {
    const dataByDate: Record<
      string,
      { date: string; stellplaetze: number; anlagen: number }
    > = {};
    let cumulativeStellplaetze = 0;
    let cumulativeAnlagen = 0;

    [...abstellanlagen]
      .sort((a, b) => getEarliestDate(a) - getEarliestDate(b))
      .forEach((anlage) => {
        const dateString = new Date(getEarliestDate(anlage))
          .toISOString()
          .split("T")[0];

        cumulativeStellplaetze += anlage.stellplaetze || 0;
        cumulativeAnlagen += 1;

        dataByDate[dateString] = {
          date: dateString,
          stellplaetze: cumulativeStellplaetze,
          anlagen: cumulativeAnlagen,
        };
      });

    return Object.values(dataByDate);
  }, [abstellanlagen]);

  return (
    <Box sx={{ height: isMobile ? 300 : 400, mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        Entwicklung über Zeit
      </Typography>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={timelineData}
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
            dataKey="stellplaetze"
            name="Gesamte Stellplätze"
            stroke="#8884d8"
            activeDot={{ r: 8 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="anlagen"
            name="Gesamte Anlagen"
            stroke="#82ca9d"
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
