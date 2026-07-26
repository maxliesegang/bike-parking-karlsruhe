import { useId, useState, useMemo, ReactNode, CSSProperties } from "react";

type ColumnType = "text" | "number" | "date" | "boolean" | "link" | "bar";

// A column keyed to a field of the row type `T`, so column keys are checked
// against the data shape and the call sites need no casts.
export interface Column<T> {
  key: keyof T & string;
  label: string;
  type: ColumnType;
  /** Value to sort by, where the cell shows something else (e.g. an ISO date
   *  rendered as „12.02.2026“ or „nie“). Falls back to the cell value. */
  sortValue?: (row: T) => number | string | null;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  id: string;
  ariaLabel: string;
}

/** Rows above this get a filter field and a scroll box with a pinned header. */
const LONG_TABLE_ROWS = 14;

const DATE_DE = /^(\d{2})\.(\d{2})\.(\d{4})$/;
// A German figure, optionally signed and with a unit: "1.234", "12 %", "820 m".
const NUMBER_DE = /^[+-]?\d{1,3}(\.\d{3})*(,\d+)?(\s*(%|m|km|×|x))?$/;
/** Cells that carry no value — sorted last in both directions. */
const EMPTY_CELLS = new Set(["—", "-", "", "nie", "k. A."]);

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
  // Thousands separators, so a five-digit population reads as one — the bar
  // columns already formatted, and these sat next to them unformatted.
  if (type === "number" && typeof value === "number") {
    return value.toLocaleString("de-DE");
  }
  return value as ReactNode;
}

/**
 * The value a cell actually sorts by.
 *
 * Most numeric columns arrive pre-formatted as German text — „12 %“, „820 m“,
 * „1.234“ — because that is what the reader should see. Comparing those as
 * strings puts 100 before 20, which quietly makes every ranking wrong, so
 * anything that parses as a figure or a date is compared as one. Cells with no
 * value sort last either way: „—“ is not the smallest region, it is an unknown
 * one.
 */
function sortableValue(value: unknown): number | string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value !== "string") return null;

  const text = value.trim();
  if (EMPTY_CELLS.has(text)) return null;

  const date = DATE_DE.exec(text);
  if (date) return Date.UTC(+date[3], +date[2] - 1, +date[1]);

  if (NUMBER_DE.test(text)) {
    const digits = text
      .replace(/[^\d,.+-]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");
    const parsed = Number(digits);
    if (Number.isFinite(parsed)) return parsed;
  }

  return text.toLocaleLowerCase("de-DE");
}

/** Cell text a filter query is matched against. */
function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return "";
  return String(value);
}

export default function DataTable<T extends object>({
  data,
  columns,
  id,
  ariaLabel,
}: DataTableProps<T>) {
  const [orderBy, setOrderBy] = useState("");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [query, setQuery] = useState("");
  const filterId = useId();

  const isNumeric = (type: ColumnType) => type === "number" || type === "bar";

  // Sorting cycles through three states, ending back at the order the page
  // chose — which is itself information (worst-first, largest-first), and
  // otherwise unrecoverable without a reload.
  const handleSort = (column: Column<T>) => {
    if (orderBy !== column.key) {
      setOrderBy(column.key);
      // Figures are read largest-first; names are read A–Z.
      setOrder(isNumeric(column.type) ? "desc" : "asc");
      return;
    }
    if (order === (isNumeric(column.type) ? "desc" : "asc")) {
      setOrder(order === "asc" ? "desc" : "asc");
      return;
    }
    setOrderBy("");
  };

  const filteredData = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("de-DE");
    if (!needle) return data;
    return data.filter((row) =>
      columns.some((col) =>
        cellText(row[col.key]).toLocaleLowerCase("de-DE").includes(needle),
      ),
    );
  }, [columns, data, query]);

  const sortedData = useMemo(() => {
    const column = columns.find((col) => col.key === orderBy);
    if (!column) return filteredData;

    const direction = order === "asc" ? 1 : -1;
    const valueOf = (row: T) =>
      column.sortValue
        ? sortableValue(column.sortValue(row))
        : sortableValue(row[column.key]);

    return [...filteredData]
      .map((row, index) => ({ row, index, value: valueOf(row) }))
      .sort((a, b) => {
        if (a.value === null || b.value === null) {
          if (a.value === b.value) return a.index - b.index;
          return a.value === null ? 1 : -1;
        }
        if (typeof a.value === "string" || typeof b.value === "string") {
          return (
            String(a.value).localeCompare(String(b.value), "de") * direction
          );
        }
        return (a.value - b.value) * direction || a.index - b.index;
      })
      .map((entry) => entry.row);
  }, [columns, filteredData, order, orderBy]);

  const sortedColumn = columns.find((col) => col.key === orderBy);

  // Per-column maxima drive the bar fills. Taken over the unfiltered data, so a
  // filtered row keeps the bar length it had in the full table.
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

  const isLong = data.length > LONG_TABLE_ROWS;

  return (
    <div className="app-table-frame">
      <div className="app-table-toolbar">
        {isLong ? (
          <div className="kern-form-input app-table-filter">
            <label className="kern-sr-only kern-label" htmlFor={filterId}>
              {ariaLabel} filtern
            </label>
            <input
              id={filterId}
              className="kern-form-input__input"
              type="search"
              value={query}
              placeholder="Filtern, z. B. Region"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        ) : (
          <span className="app-table-meta">
            {data.length.toLocaleString("de-DE")} Einträge
          </span>
        )}
        <span className="app-table-meta" aria-live="polite">
          {isLong &&
            `${sortedData.length.toLocaleString("de-DE")} von ${data.length.toLocaleString("de-DE")} Einträgen · `}
          {sortedColumn
            ? `sortiert nach ${sortedColumn.label}, ${order === "asc" ? "aufsteigend" : "absteigend"}`
            : "Ausgangsreihenfolge"}
        </span>
      </div>
      <div
        className={`kern-table-responsive app-table-scroll ${isLong ? "app-table-scroll--tall" : ""}`}
        // Scrollable regions must be reachable and operable from the keyboard.
        tabIndex={0}
        role="region"
        aria-label={ariaLabel}
      >
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
                    onClick={() => handleSort(col)}
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
      {sortedData.length === 0 && (
        <p className="app-table-empty">
          Kein Eintrag passt zu „{query}“.{" "}
          <button
            type="button"
            className="app-sort-button"
            onClick={() => setQuery("")}
          >
            Filter zurücksetzen
          </button>
        </p>
      )}
    </div>
  );
}
