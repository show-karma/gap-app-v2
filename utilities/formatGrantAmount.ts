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

  // Safety net: strip hex addresses (e.g., "0x0", "0xA0b86991...") from currency suffix.
  // Primary filtering happens in transformGrantsToMilestones, but this guards against
  // any amount strings that already contain a hex suffix.
  const isHex = currencySuffix ? /^0x[0-9a-fA-F]*$/.test(currencySuffix) : false;
  const safeCurrency = currencySuffix && !isHex ? currencySuffix : null;

  if (numAmount < 1000) {
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(numAmount);
    return safeCurrency ? `${formatted} ${safeCurrency}` : formatted;
  }

  const formattedNum = formatCurrency(numAmount);
  return safeCurrency ? `${formattedNum} ${safeCurrency}` : formattedNum;
}
