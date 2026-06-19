import { useState, useMemo, ReactNode, CSSProperties } from "react";

type ColumnType = "text" | "number" | "date" | "boolean" | "link" | "bar";

// A column keyed to a field of the row type `T`, so column keys are checked
// against the data shape and the call sites need no casts.
export interface Column<T> {
  key: keyof T & string;
  label: string;
  type: ColumnType;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  id: string;
  ariaLabel: string;
}

function renderCellContent(
  value: unknown,
  type: ColumnType,
  max?: number,
): ReactNode {
  if (type === "bar") {
    if (typeof value !== "number") return value as ReactNode;
    const fill = max && max > 0 ? Math.round((value / max) * 100) : 0;
    return (
      <span
        className="app-bar"
        style={{ "--app-bar-fill": `${fill}%` } as CSSProperties}
      >
        {value.toLocaleString("de-DE")}
      </span>
    );
  }
  if (type === "link" && value) {
    return (
      <a
        className="kern-link kern-link--x-small"
        href={value as string}
        target="_blank"
        rel="noopener noreferrer"
      >
        Link
      </a>
    );
  }
  if (type === "date") {
    return new Date(value as string).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  if (type === "boolean") {
    return value ? "Ja" : "Nein";
  }
  return value as ReactNode;
}

export default function DataTable<T extends object>({
  data,
  columns,
  id,
  ariaLabel,
}: DataTableProps<T>) {
  const [orderBy, setOrderBy] = useState("");
  const [order, setOrder] = useState<"asc" | "desc">("asc");

  const handleSort = (property: string) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortedData = useMemo(() => {
    if (!orderBy) return data;

    return [...data].sort((a, b) => {
      const aValue = (a as Record<string, unknown>)[orderBy];
      const bValue = (b as Record<string, unknown>)[orderBy];

      if (aValue == null || bValue == null) return 0;
      if (aValue < bValue) return order === "asc" ? -1 : 1;
      if (aValue > bValue) return order === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, order, orderBy]);

  const sortedColumn = columns.find((col) => col.key === orderBy);

  // Per-column maxima drive the bar fills; recomputed only when data changes.
  const barMax = useMemo(() => {
    const maxima: Record<string, number> = {};
    for (const col of columns) {
      if (col.type !== "bar") continue;
      maxima[col.key] = data.reduce((max, row) => {
        const v = (row as Record<string, unknown>)[col.key];
        return typeof v === "number" && v > max ? v : max;
      }, 0);
    }
    return maxima;
  }, [columns, data]);

  const isNumeric = (type: ColumnType) => type === "number" || type === "bar";

  return (
    <div className="app-table-frame">
      <div className="app-table-toolbar">
        <span className="app-table-meta">
          {data.length.toLocaleString("de-DE")} Einträge
        </span>
        <span className="app-table-meta" aria-live="polite">
          {sortedColumn
            ? `Sortiert nach ${sortedColumn.label}, ${order === "asc" ? "aufsteigend" : "absteigend"}`
            : "Nicht sortiert"}
        </span>
      </div>
      <div className="kern-table-responsive">
        <table
          id={id}
          className="kern-table kern-table--striped kern-table--small"
          aria-label={ariaLabel}
        >
          <thead>
            <tr className="kern-table__row">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`kern-table__header ${isNumeric(col.type) ? "kern-table__header--numeric" : ""}`}
                  data-key={col.key}
                  data-type={col.type}
                  scope="col"
                  aria-sort={
                    orderBy === col.key
                      ? order === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <button
                    type="button"
                    className="app-sort-button"
                    onClick={() => handleSort(col.key)}
                  >
                    <span>{col.label}</span>
                    <span className="app-sort-icon" aria-hidden="true">
                      {orderBy === col.key
                        ? order === "asc"
                          ? "↑"
                          : "↓"
                        : "↕"}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="kern-table__body">
            {sortedData.map((item, index) => (
              <tr className="kern-table__row" key={index}>
                {columns.map((col) => (
                  <td
                    className={`kern-table__cell ${isNumeric(col.type) ? "kern-table__cell--numeric" : ""}`}
                    key={col.key}
                  >
                    {renderCellContent(
                      item[col.key],
                      col.type,
                      barMax[col.key],
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
