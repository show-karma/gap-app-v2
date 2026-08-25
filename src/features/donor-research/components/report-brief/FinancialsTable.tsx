import type { CandidateFinancialYear } from "@/types/donor-research";
import formatCurrency from "@/utilities/formatCurrency";
import { cn } from "@/utilities/tailwind";
import {
  TABLE_BODY_ROW,
  TABLE_CAPTION,
  TABLE_CELL_MONO,
  TABLE_HEAD_CELL,
  TABLE_HEAD_ROW,
  TABLE_WRAP,
} from "./table-classes";

interface FinancialsTableProps {
  financials: CandidateFinancialYear[];
}

const HEAD_CELL_LEFT = cn(TABLE_HEAD_CELL, "py-2 pr-4 text-left");
const HEAD_CELL_RIGHT = cn(TABLE_HEAD_CELL, "py-2 pl-4 text-right");
const BODY_CELL_LEFT = cn(TABLE_CELL_MONO, "py-2 pr-4 text-left");
const BODY_CELL_RIGHT = cn(TABLE_CELL_MONO, "py-2 pl-4 text-right");

/**
 * "Financials (last 3 years)" — a compact IRS-990 summary shown on every
 * candidate in the brief. One row per filed year (most-recent first),
 * money formatted to compact USD (e.g. $1.2M). Missing figures render as
 * an em dash. Renders nothing when no 990 financials are available.
 */
export function FinancialsTable({ financials }: FinancialsTableProps) {
  if (financials.length === 0) return null;

  return (
    <div className="mt-6">
      <p className={TABLE_CAPTION}>Financials (last 3 years)</p>
      <table className={cn(TABLE_WRAP, "w-full border-collapse text-[13px]")}>
        <thead>
          <tr className={TABLE_HEAD_ROW}>
            <th scope="col" className={HEAD_CELL_LEFT}>
              Year
            </th>
            <th scope="col" className={HEAD_CELL_RIGHT}>
              Income
            </th>
            <th scope="col" className={HEAD_CELL_RIGHT}>
              Expenses
            </th>
            <th scope="col" className={HEAD_CELL_RIGHT}>
              Assets
            </th>
          </tr>
        </thead>
        <tbody>
          {financials.map((entry) => (
            <tr key={entry.year} className={TABLE_BODY_ROW}>
              <th scope="row" className={BODY_CELL_LEFT}>
                {entry.year}
              </th>
              <td className={BODY_CELL_RIGHT}>{formatMoney(entry.income)}</td>
              <td className={BODY_CELL_RIGHT}>{formatMoney(entry.expenses)}</td>
              <td className={BODY_CELL_RIGHT}>{formatMoney(entry.assets)}</td>
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
