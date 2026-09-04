import type { NotebookMetricQueryResult } from "@/services/notebooks/notebook-metric-registry.types";

/**
 * A catalogue query's result, as a table.
 *
 * THE RENDERER DECIDES NOTHING. The columns, their labels, their alignment
 * kind and every formatted value arrive with the result — including the em
 * dash for an absent figure, which the query layer produced and reconciled
 * against `meta.absenceDisplay`. Re-deriving a value from `row.value` here
 * would be a second formatting opinion, and a second opinion is how a page
 * comes to disagree with the preview an author approved it from.
 *
 * It is the same discipline as the tier rollup, applied to a shape the author
 * composed rather than one the programme fixed: the spec stores the QUESTION
 * (metric, grouping, window, filters) and never the answer's presentation.
 *
 * THE BUILDER'S PREVIEW RENDERS THROUGH THIS SAME COMPONENT. Two tables that
 * merely intended to agree would be free to drift; one table cannot.
 */

/**
 * One cell.
 *
 * A grouped result carries TWO text columns — `label`, which is the row's
 * identity, and one named for the grouping dimension. They are not the same
 * value, and rendering `row.label` for both (as this did until a real payload
 * was looked at) prints the row's name twice and silently hides the dimension.
 * A dimension the row does not carry is the em dash, never a blank cell: an
 * empty cell reads as a rendering fault rather than as absent data.
 */
function cellValue(
  row: NotebookMetricQueryResult["rows"][number],
  column: NotebookMetricQueryResult["columns"][number],
  absence: string
): string {
  if (column.valueKind !== "text") return row.displayValue;
  if (column.id === "label") return row.label;
  return row.dimensions[column.id as keyof typeof row.dimensions] ?? absence;
}

export function NotebookQueryTable({ result }: { result: NotebookMetricQueryResult }) {
  if (result.rows.length === 0) {
    // Distinct from a failure, and said as such. "No rows" is an answer — the
    // filters matched nothing — and showing an error there would send a reader
    // looking for a broken page instead of an empty result.
    return (
      <p className="text-sm text-muted-foreground">
        No rows matched this query for the selected period.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            {result.columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                className={`whitespace-nowrap px-3 py-2 font-medium text-muted-foreground ${
                  column.valueKind === "text" ? "text-left" : "text-right"
                }`}
              >
                {column.label}
                {column.unit ? ` (${column.unit})` : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row) => (
            <tr key={row.key} className="border-b border-border/60 last:border-0">
              {result.columns.map((column) => (
                <td
                  key={column.id}
                  className={`px-3 py-2 text-foreground ${
                    column.valueKind === "text" ? "text-left" : "text-right tabular-nums"
                  }`}
                >
                  {cellValue(row, column, result.meta.absenceDisplay)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {/* Provenance on the page, not only in the payload. A figure a funder
          might quote should carry how it was computed and over what window. */}
      <p className="mt-3 text-xs text-muted-foreground">
        {result.meta.source.methodology} Window: {result.meta.window}.
      </p>
    </div>
  );
}
