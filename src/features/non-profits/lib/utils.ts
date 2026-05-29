/**
 * Shared utility helpers for the non-profits feature.
 *
 * Ported from grant-atlas src/lib/utils.ts (formatCurrency only — cn is
 * already provided by @/utilities/cn throughout gap-app-v2).
 */

/**
 * Format a dollar amount using US locale, no decimal places.
 * Returns an em-dash for null/undefined amounts.
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
