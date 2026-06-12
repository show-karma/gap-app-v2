import type { CandidateFinancialYear } from "@/types/donor-research";
import formatCurrency from "@/utilities/formatCurrency";
import { briefDisplay } from "./fonts";

interface FinancialsTableProps {
  financials: CandidateFinancialYear[];
}

/**
 * "Financials (last 3 years)" — a compact IRS-990 summary shown on every
 * candidate in the brief. One row per filed year (most-recent first),
 * money formatted to compact USD (e.g. $1.2M). Missing figures render as
 * an em dash. Renders nothing when no 990 financials are available.
 */
export function FinancialsTable({ financials }: FinancialsTableProps) {
  if (financials.length === 0) return null;

  return (
    <div className="mt-8">
      <p
        className={`${briefDisplay.className} text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground`}
      >
        Financials (last 3 years)
      </p>
      <table className={`${briefDisplay.className} mt-3 w-full border-collapse text-sm`}>
        <thead>
          <tr className="border-y border-border/50">
            <th
              scope="col"
              className="py-2 pr-4 text-left text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
            >
              Year
            </th>
            <th
              scope="col"
              className="py-2 pl-4 text-right text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
            >
              Income
            </th>
            <th
              scope="col"
              className="py-2 pl-4 text-right text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
            >
              Expenses
            </th>
            <th
              scope="col"
              className="py-2 pl-4 text-right text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
            >
              Assets
            </th>
          </tr>
        </thead>
        <tbody>
          {financials.map((entry) => (
            <tr key={entry.year} className="border-b border-border/50 last:border-b-0">
              <th
                scope="row"
                className="py-2 pr-4 text-left font-medium tabular-nums text-foreground/80"
              >
                {entry.year}
              </th>
              <td className="py-2 pl-4 text-right tabular-nums text-foreground/70">
                {formatMoney(entry.income)}
              </td>
              <td className="py-2 pl-4 text-right tabular-nums text-foreground/70">
                {formatMoney(entry.expenses)}
              </td>
              <td className="py-2 pl-4 text-right tabular-nums text-foreground/70">
                {formatMoney(entry.assets)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Compact USD for a single 990 figure (e.g. $1.2M, $845K, $3.4B). Reuses
 * the shared magnitude formatter for the K/M/B suffixing. Renders an em
 * dash for missing values.
 */
function formatMoney(value: number | null): string {
  if (value === null) return "—";
  // Defensive: keep the sign outside the $ (e.g. -$5.0K) if a figure is ever
  // negative, rather than $-5.0K.
  if (value < 0) return `-$${formatCurrency(Math.abs(value))}`;
  return `$${formatCurrency(value)}`;
}
