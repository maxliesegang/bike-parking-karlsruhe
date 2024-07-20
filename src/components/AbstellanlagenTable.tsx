import { Box, useMediaQuery, useTheme } from "@mui/material";
import React, { useMemo } from "react";
import { Abstellanlage } from "../models/abstellanlage";
import DataTable from "./DataTable";

interface AbstellanlagenTableProps {
  abstellanlagen: Abstellanlage[];
}

const AbstellanlagenTable: React.FC<AbstellanlagenTableProps> = ({
  abstellanlagen,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const columns = [
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

  const mobileColumns = columns.slice(0, 5);

  const sortedAbstellanlagen = useMemo(() => {
    return [...abstellanlagen].sort((a, b) => {
      return (
        new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      );
    });
  }, [abstellanlagen]);

  const parsedAbstellanlagen = sortedAbstellanlagen.map((anlage) => ({
    ...anlage,
    lastUpdated: new Date(anlage.lastUpdated),
  }));

  return (
    <Box sx={{ width: "100%", overflowX: "auto" }}>
      <DataTable
        data={parsedAbstellanlagen}
        columns={isMobile ? mobileColumns : columns}
        id="abstellanlagenTable"
        ariaLabel="Abstellanlagen"
      />
    </Box>
  );
};

export default AbstellanlagenTable;
