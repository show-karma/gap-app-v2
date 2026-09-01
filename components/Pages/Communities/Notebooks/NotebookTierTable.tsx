import type {
  NotebookKernelTierRollup,
  NotebookKernelTierRollupColumn,
  NotebookKernelTierRollupRow,
  NotebookStructuredRatio,
  NotebookTableAccentToken,
} from "@/services/notebooks/notebook-kernel.types";
import { NOTEBOOK_ABSENT_VALUE } from "@/services/notebooks/notebook-metrics.types";

/**
 * The kernel tier rollup: four rows, one per OSO tier.
 *
 * EVERY DISPLAY DECISION ARRIVES WITH THE DATA. Column order, labels, the enum
 * display copy and the accent mapping are declared by the query layer; this
 * file formats what it is handed and decides nothing about meaning. That is
 * the reason it can render a rollup whose vocabulary grows without a change
 * here, and the reason "Irreplaceable" reads the same on this page as it does
 * everywhere else the tier is named.
 *
 * The enrichments over a plain table are the ones that make a four-row table
 * worth more than four sentences: an accent stripe carrying tier severity, the
 * tier's definition as a sub-line under its name, and ratios that show their
 * own numerator and denominator so a percentage is checkable rather than
 * merely quotable.
 */

interface Props {
  rollup: NotebookKernelTierRollup;
}

/**
 * Severity token to a theme class.
 *
 * The contract carries SEMANTIC TOKEN IDS, never colours — so a tenant theme
 * restyles severity by redefining its own variables, and this mapping is the
 * single place the design system is consulted. A hex in the payload would have
 * hard-coded one tenant's palette into stored data.
 */
const ACCENT_CLASSES: Readonly<Record<NotebookTableAccentToken, string>> = {
  critical: "bg-destructive",
  high: "bg-warning",
  medium: "bg-primary",
  low: "bg-muted-foreground/40",
};

/**
 * A ratio, with its parts.
 *
 * `value` is the canonical scalar and the parts are what make it auditable:
 * "96.0%" alone invites a reader to trust it, "96.0% (679/707)" lets them
 * check it. When the denominator is absent there is nothing to have measured,
 * so the em-dash stands alone — never "0%", which would report a failure the
 * data does not show.
 */
function RatioCell({
  ratio,
  valueKind,
}: {
  ratio: NotebookStructuredRatio;
  valueKind: "percent" | "count";
}) {
  if (ratio.value === null) {
    return <span className="text-muted-foreground">{NOTEBOOK_ABSENT_VALUE}</span>;
  }

  const headline =
    valueKind === "percent" ? `${ratio.value.toFixed(1)}%` : ratio.value.toLocaleString("en-US");
  const hasParts = ratio.numerator !== null && ratio.denominator !== null;

  return (
    <span className="flex flex-col items-end">
      <span className="tabular-nums text-foreground">{headline}</span>
      {hasParts ? (
        <span className="text-xs tabular-nums text-muted-foreground">
          {ratio.numerator?.toLocaleString("en-US")}/{ratio.denominator?.toLocaleString("en-US")}
        </span>
      ) : null}
    </span>
  );
}

/** Numbers align right so magnitudes line up; text aligns left so it scans. */
function alignment(column: NotebookKernelTierRollupColumn): string {
  return column.format === "enum" ? "text-left" : "text-right";
}

function Cell({
  column,
  row,
}: {
  column: NotebookKernelTierRollupColumn;
  row: NotebookKernelTierRollupRow;
}) {
  switch (column.format) {
    case "enum": {
      // The label comes from the column's own map. An id with no declared
      // label renders as the em-dash rather than as a raw enum key: a reader
      // seeing `nice-to-have` learns we leaked an internal id at them.
      const label = column.labels[row[column.id]];
      return (
        <span className="flex flex-col gap-0.5">
          <span className="font-medium text-foreground">{label ?? NOTEBOOK_ABSENT_VALUE}</span>
          {column.subline === "description" && row.description ? (
            <span className="text-xs font-normal text-muted-foreground">{row.description}</span>
          ) : null}
        </span>
      );
    }
    case "count":
      return <span className="tabular-nums text-foreground">{row.functionsCount}</span>;
    default:
      return <RatioCell ratio={row[column.id]} valueKind={column.valueKind} />;
  }
}

export function NotebookTierTable({ rollup }: Props) {
  if (rollup.columns.length === 0 || rollup.rows.length === 0) return null;

  const accent = rollup.accentBy;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            {/* The stripe is decoration carrying no information a sighted
                reader gets and others do not — the tier name in the next
                column says the same thing in words. So it is an empty header
                cell, not a column called "Severity". */}
            <th scope="col" className="w-1 p-0">
              <span className="sr-only">Tier severity</span>
            </th>
            {rollup.columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                className={`whitespace-nowrap px-3 py-2 font-medium text-muted-foreground ${alignment(column)}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rollup.rows.map((row) => (
            <tr key={row.tier} className="border-b border-border/60 last:border-0">
              <td className="p-0" aria-hidden="true">
                <div
                  className={`h-full min-h-10 w-1 rounded-full ${ACCENT_CLASSES[accent.tokens[row[accent.column]]]}`}
                />
              </td>
              {rollup.columns.map((column) => (
                <td
                  key={column.id}
                  className={`px-3 py-2 align-top text-foreground ${alignment(column)}`}
                >
                  <Cell column={column} row={row} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {/* Said on the page, not just in the payload: a rolling window and a
          pooled denominator are exactly the two things a reader quoting these
          figures needs to have been told. */}
      <p className="mt-3 text-xs text-muted-foreground">
        {rollup.source.methodology} Window: {rollup.windowDays} days.
      </p>
    </div>
  );
}
