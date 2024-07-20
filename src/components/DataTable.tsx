import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  TableSortLabel,
  useMediaQuery,
  useTheme,
} from "@mui/material";

interface Column {
  key: string;
  label: string;
  type: string;
}

interface DataTableProps {
  data: any[];
  columns: Column[];
  id: string;
  ariaLabel: string;
}

const DataTable: React.FC<DataTableProps> = ({
  data,
  columns,
  id,
  ariaLabel,
}) => {
  const [orderBy, setOrderBy] = useState<string>("");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleSort = (property: string) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortedData = React.useMemo(() => {
    if (!orderBy) return data;

    return [...data].sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];

      if (aValue < bValue) return order === "asc" ? -1 : 1;
      if (aValue > bValue) return order === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, order, orderBy]);

  return (
    <TableContainer
      component={Paper}
      elevation={2}
      sx={{ borderRadius: 2, overflow: "hidden" }}
    >
      <Table id={id} aria-label={ariaLabel} sx={{ minWidth: "100%" }}>
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell
                key={col.key}
                data-key={col.key}
                data-type={col.type}
                sortDirection={orderBy === col.key ? order : false}
              >
                <TableSortLabel
                  active={orderBy === col.key}
                  direction={orderBy === col.key ? order : "asc"}
                  onClick={() => handleSort(col.key)}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                    {col.label}
                  </Typography>
                </TableSortLabel>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedData.map((item, index) => (
            <TableRow key={index}>
              {columns.map((col) => (
                <TableCell key={col.key}>
                  {isMobile ? (
                    <Typography variant="body2">
                      <strong>{col.label}:</strong>{" "}
                      {renderCellContent(item[col.key], col.type)}
                    </Typography>
                  ) : (
                    renderCellContent(item[col.key], col.type)
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const renderCellContent = (value: any, type: string) => {
  if (type === "link" && value) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "#005538", textDecoration: "none" }}
      >
        Link
      </a>
    );
  } else if (type === "date") {
    return new Date(value).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } else if (type === "boolean") {
    return value ? "✓" : "";
  }
  return value;
};

export default DataTable;
