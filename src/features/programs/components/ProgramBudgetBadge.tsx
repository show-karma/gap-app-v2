import { DollarSign } from "lucide-react";

interface ProgramBudgetBadgeProps {
  budget?: string | number;
  currency?: string;
}

function formatBudgetWithCurrency(
  budget: string | number,
  currency?: string,
): string | null {
  if (!budget) return null;
  const numericValue =
    typeof budget === "number" ? budget : Number.parseFloat(budget);
  if (Number.isNaN(numericValue) || numericValue === 0) return null;

  const currencySymbol = currency?.toUpperCase() || "USD";

  if (numericValue >= 1_000_000) {
    const millions = numericValue / 1_000_000;
    const formatted =
      millions % 1 === 0 ? millions.toString() : millions.toFixed(1);
    return `${formatted}m in ${currencySymbol}`;
  }

  if (numericValue >= 1_000) {
    const thousands = numericValue / 1_000;
    const formatted =
      thousands % 1 === 0 ? thousands.toString() : thousands.toFixed(1);
    return `${formatted}k in ${currencySymbol}`;
  }

  return `${numericValue.toLocaleString("en-US")} in ${currencySymbol}`;
}

export function ProgramBudgetBadge({
  budget,
  currency,
}: ProgramBudgetBadgeProps) {
  if (!budget) return null;

  const formattedBudget = formatBudgetWithCurrency(budget, currency);
  if (!formattedBudget) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-transparent px-2 py-0.5 text-sm text-foreground">
      <DollarSign className="h-3.5 w-3.5" aria-label="Budget amount" />
      {formattedBudget}
    </span>
  );
}
