import type {
  NotebookKernelInventoryColumn,
  NotebookKernelInventoryRow,
} from "@/services/notebooks/notebook-kernel.types";
import { NOTEBOOK_ABSENT_VALUE } from "@/services/notebooks/notebook-metrics.types";
import type { NotebookKernelTableColumn } from "@/services/notebooks/notebook-spec";

/**
 * The kernel function inventory, in the columns an author chose.
 *
 * A real table: `<table>` with a `<thead>`, so it reads as tabular data to a
 * screen reader and can be copied into a spreadsheet. The alternative — a grid
 * of divs — looks identical and is useless to both.
 *
 * Column ORDER is the author's, because in a table order is meaning: the first
 * column is what the reader scans down. Column CHOICE is constrained to the
 * query layer's declared vocabulary, so an API that grows a field does not
 * thereby turn an internal value into a published one.
 */

interface Props {
  columns: readonly NotebookKernelTableColumn[];
  declared: readonly NotebookKernelInventoryColumn[];
  rows: readonly NotebookKernelInventoryRow[];
}

/**
 * One cell, formatted by the column's declared format.
 *
 * `null` is NOT zero and not "false" — a function with no readings has no SLA
 * percentage, and printing 0% there would report a failure the data does not
 * show. Absence renders as the em-dash, the same rule the KPI tiles follow.
 */
function formatCell(
  value: NotebookKernelInventoryRow[keyof NotebookKernelInventoryRow],
  format: NotebookKernelInventoryColumn["format"]
): string {
  if (value === null || value === undefined) return NOTEBOOK_ABSENT_VALUE;

  switch (format) {
    case "boolean":
      return value ? "Yes" : "No";
    case "percent":
      return typeof value === "number" ? `${value.toFixed(1)}%` : NOTEBOOK_ABSENT_VALUE;
    case "count":
      return typeof value === "number" ? value.toLocaleString("en-US") : NOTEBOOK_ABSENT_VALUE;
    case "date":
      return typeof value === "string" ? value.slice(0, 10) : NOTEBOOK_ABSENT_VALUE;
    default:
      return String(value);
  }
}

/** Numbers align right so magnitudes line up; text aligns left so it scans. */
function alignment(format: NotebookKernelInventoryColumn["format"]): string {
  return format === "count" || format === "percent" ? "text-right tabular-nums" : "text-left";
}

export function NotebookKernelTable({ columns, declared, rows }: Props) {
  // Resolve the author's ids against the declared vocabulary. An id the query
  // layer no longer publishes is skipped rather than rendered as a blank
  // column — the same rule the KPI selector follows for a retired metric.
  const resolved = columns
    .map((id) => declared.find((column) => column.id === id))
    .filter((column): column is NotebookKernelInventoryColumn => column !== undefined);

  if (resolved.length === 0 || rows.length === 0) return null;

  return (
    // Wide tables scroll inside their own container rather than pushing the
    // page sideways — a horizontally scrolling page is broken, a scrolling
    // table is a table.
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            {resolved.map((column) => (
              <th
                key={column.id}
                scope="col"
                className={`whitespace-nowrap px-3 py-2 font-medium text-muted-foreground ${alignment(column.format)}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border/60 last:border-0">
              {resolved.map((column) => (
                <td
                  key={column.id}
                  className={`px-3 py-2 text-foreground ${alignment(column.format)}`}
                >
                  {formatCell(row[column.id], column.format)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
