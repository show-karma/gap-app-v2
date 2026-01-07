import formatCurrency from "@/utilities/formatCurrency";

/**
 * Formats budget value for display.
 * Returns formatted currency string, raw string if non-numeric, or null if empty/zero.
 */
export function formatBudgetValue(budget: string | undefined): string | null {
  if (!budget || Number(budget) === 0) return null;
  const numBudget = Number(budget);
  if (Number.isNaN(numBudget)) return budget;
  return `$${formatCurrency(numBudget)}`;
}
