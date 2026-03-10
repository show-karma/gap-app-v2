import formatCurrency from "@/utilities/formatCurrency";

/**
 * Format a grant amount string into a human-readable format.
 * Handles amounts with currency suffixes (e.g., "10000 USDC").
 */
export function formatGrantAmount(amount?: string): string | null {
  if (!amount) return null;

  const parts = amount.split(" ");
  const numericPart = parts[0]?.replace(",", "");
  const currencySuffix = parts.length > 1 ? parts.slice(1).join(" ") : null;

  const numAmount = Number(numericPart);
  if (Number.isNaN(numAmount) || numAmount === 0) return null;

  if (numAmount < 1000) {
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(numAmount);
    return currencySuffix ? `${formatted} ${currencySuffix}` : formatted;
  }

  const formattedNum = formatCurrency(numAmount);
  return currencySuffix ? `${formattedNum} ${currencySuffix}` : formattedNum;
}
