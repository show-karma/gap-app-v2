import formatCurrency from "@/utilities/formatCurrency";

/**
 * Format a grant amount string into a human-readable format.
 * Handles amounts with currency suffixes (e.g., "10000 USDC").
 */
export function formatGrantAmount(amount?: string): string | null {
  if (!amount) return null;

  const [rawNumericPart, ...currencyParts] = amount.trim().split(/\s+/);
  const numericPart = rawNumericPart?.replace(/,/g, "");
  const currencySuffix = currencyParts.length > 0 ? currencyParts.join(" ") : null;

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
