import { Box, useMediaQuery, useTheme } from "@mui/material";
import { useMemo } from "react";
import { Abstellanlage } from "../models/abstellanlage";
import DataTable, { Column } from "./DataTable";

interface AbstellanlagenTableProps {
  abstellanlagen: Abstellanlage[];
}

const allColumns: Column[] = [
  { key: "standort", label: "Standort", type: "text" },
  { key: "bemerkung", label: "Bemerkung", type: "text" },
  { key: "stadtteil", label: "Stadtteil", type: "text" },
  { key: "stellplaetze", label: "Stellplätze", type: "number" },
  { key: "b_r", label: "B+R", type: "text" },
  { key: "gemeinde", label: "Gemeinde", type: "text" },
  { key: "link", label: "Link", type: "link" },
  { key: "art", label: "Art", type: "text" },
  { key: "lastUpdated", label: "Zuletzt aktualisiert", type: "date" },
  { key: "e_ladestation", label: "E-Ladestation", type: "boolean" },
  { key: "lastenrad", label: "Lastenrad", type: "boolean" },
  { key: "mit_anhaenger", label: "Mit Anhänger", type: "boolean" },
];

const mobileColumns = allColumns.slice(0, 5);

export default function AbstellanlagenTable({
  abstellanlagen,
}: AbstellanlagenTableProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const sortedData = useMemo(
    () =>
      [...abstellanlagen]
        .sort(
          (a, b) =>
            new Date(b.lastUpdated).getTime() -
            new Date(a.lastUpdated).getTime(),
        )
        .map((anlage) => ({
          ...anlage,
          lastUpdated: new Date(anlage.lastUpdated),
        })),
    [abstellanlagen],
  );

  return (
    <Box sx={{ width: "100%", overflowX: "auto" }}>
      <DataTable
        data={sortedData as unknown as Record<string, unknown>[]}
        columns={isMobile ? mobileColumns : allColumns}
        id="abstellanlagenTable"
        ariaLabel="Abstellanlagen"
      />
    </Box>
  );
}
