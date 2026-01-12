import formatCurrency from "@/utilities/formatCurrency";

/**
 * Formats budget value for display.
 * Returns formatted currency string, raw string if non-numeric, or null if empty/zero.
 */
export function formatBudgetValue(budget: string | undefined): string | null {
  if (!budget || budget === "0") return null;

  const numBudget = Number(budget);
  // Handle pure numbers (assumed USD)
  if (!Number.isNaN(numBudget)) {
    if (numBudget === 0) return null;
    return `$${formatCurrency(numBudget)}`;
  }

  // Handle "Amount Currency" format (e.g. "500000000 POL")
  const match = budget.match(/^([\d.,]+)\s+(.+)$/);
  if (match) {
    const rawAmount = match[1].replace(/,/g, "");
    const currency = match[2];
    const amount = Number(rawAmount);

    if (!Number.isNaN(amount) && amount > 0) {
      return `${formatCurrency(amount)} ${currency}`;
    }
  }

  return budget;
}
