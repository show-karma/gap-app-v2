/**
 * Formats a milestone funding amount for display.
 *
 * Returns `null` when the amount is falsy or zero (caller should render nothing).
 * For pure numeric strings:
 *   - If `currency` is provided, returns "N,NNN CURRENCY" (e.g., "30,000 OP")
 *   - Otherwise, falls back to "$N,NNN"
 * For strings that already contain a token suffix (e.g., "5000 OP"), formats the
 * numeric portion and re-appends the suffix (e.g., "5,000 OP").
 * For anything else (e.g., "$5,000 USD"), returns as-is after trimming.
 *
 * @param amount - The raw funding amount string from milestone data
 * @param currency - Optional token/currency symbol (e.g., "OP", "USDC") to append
 * @returns Formatted amount string, or null if amount is empty/zero
 *
 * @example
 * formatMilestoneAmount("5000")          // "$5,000"
 * formatMilestoneAmount("5000", "OP")    // "5,000 OP"
 * formatMilestoneAmount("5000 OP")       // "5,000 OP"
 * formatMilestoneAmount("$5,000 USD")    // "$5,000 USD"
 * formatMilestoneAmount("")              // null
 * formatMilestoneAmount("0")             // null
 */
export function formatMilestoneAmount(
  amount: string | undefined,
  currency?: string
): string | null {
  if (!amount) return null;

  const trimmed = amount.trim();
  if (!trimmed) return null;

  // Check if the string is a pure number (digits, optional commas, optional single decimal point,
  // optional leading minus). Commas are stripped before parsing.
  const stripped = trimmed.replace(/,/g, "");
  const pureNumberPattern = /^-?\d+(\.\d+)?$/;

  if (pureNumberPattern.test(stripped)) {
    const num = parseFloat(stripped);
    if (num === 0) return null;
    // Negative amounts are unusual for milestones; return as-is to avoid confusion
    if (num < 0) return trimmed;

    const formatted = num.toLocaleString("en-US", {
      maximumFractionDigits: 6,
      minimumFractionDigits: 0,
    });

    // If a currency token is provided, show "N,NNN TOKEN" instead of "$N,NNN"
    if (currency) return `${formatted} ${currency}`;

    return `$${formatted}`;
  }

  // If the amount has a recognizable numeric part followed by a token/currency suffix
  // (e.g., "5000 FIL"), format just the numeric portion and re-append the suffix.
  const numericWithSuffix = /^(\d[\d,]*(?:\.\d+)?)\s+(.+)$/;
  const match = trimmed.match(numericWithSuffix);
  if (match) {
    const numPart = parseFloat(match[1].replace(/,/g, ""));
    if (!Number.isNaN(numPart) && numPart !== 0) {
      const formatted = numPart.toLocaleString("en-US", {
        maximumFractionDigits: 6,
        minimumFractionDigits: 0,
      });
      return `${formatted} ${match[2]}`;
    }
  }

  // For anything else (e.g., "$5,000 USD", "~5000"), return as-is
  return trimmed;
}
