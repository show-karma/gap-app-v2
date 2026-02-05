import type { Grant } from "@/types/v2/grant";
import formatCurrency from "./formatCurrency";

interface GrantAmountInfo {
  /** The raw amount string (e.g., "80000", "50000 USDC") */
  rawAmount: string | undefined;
  /** The formatted display amount (e.g., "80K", "50,000") */
  displayAmount: string | undefined;
  /** The currency extracted from the amount string or grant details */
  currency: string;
  /** Whether the amount comes from financial config (approvedAmount) vs attestation (details.amount) */
  isFromFinancialConfig: boolean;
  /** Whether there's a valid amount to display */
  hasAmount: boolean;
}

interface ParsedAmount {
  numericPart: string;
  currencyInAmount: string;
  /** Parsed numeric value, or undefined if parsing failed */
  parsedValue: number | undefined;
  isAlreadyFormatted: boolean;
}

/**
 * Parses an amount string that may contain currency (e.g., "50000 USDC", "40K", "5686.59 USD")
 * Returns the numeric value and extracted currency
 */
function parseAmountString(amount: string): ParsedAmount {
  try {
    const trimmed = amount.trim();

    // Match patterns like: "5686.59 USD", "40K USDC", "2500 ARB", "80000", "40K"
    const amountMatch = trimmed.match(/^([\d,.]+[KMBTkmbt]?)\s*([a-zA-Z]{2,})?$/);
    const numericPart = amountMatch?.[1] || trimmed;
    const currencyInAmount = amountMatch?.[2] || "";

    // Check if numeric part is already formatted (like "40K", "5M")
    const isAlreadyFormatted = /[KMBTkmbt]$/.test(numericPart);

    // Parse the numeric value (remove commas for parsing)
    const cleanNumber = numericPart.replace(/,/g, "").replace(/[KMBTkmbt]$/, "");
    const multiplier = /[Kk]$/.test(numericPart)
      ? 1000
      : /[Mm]$/.test(numericPart)
        ? 1e6
        : /[Bb]$/.test(numericPart)
          ? 1e9
          : /[Tt]$/.test(numericPart)
            ? 1e12
            : 1;

    const rawValue = Number(cleanNumber) * multiplier;
    const parsedValue = Number.isNaN(rawValue) ? undefined : rawValue;

    return {
      numericPart,
      currencyInAmount,
      parsedValue,
      isAlreadyFormatted,
    };
  } catch {
    // Fallback for malformed strings
    return {
      numericPart: amount,
      currencyInAmount: "",
      parsedValue: undefined,
      isAlreadyFormatted: false,
    };
  }
}

/**
 * Formats an amount for display, handling various input formats
 */
function formatAmount(rawAmount: string): string {
  try {
    const { numericPart, parsedValue, isAlreadyFormatted } = parseAmountString(rawAmount);

    if (isAlreadyFormatted) {
      return numericPart;
    }

    if (parsedValue !== undefined && parsedValue !== 0) {
      return formatCurrency(parsedValue);
    }

    return numericPart;
  } catch {
    // Fallback to original string if formatting fails
    return rawAmount;
  }
}

/**
 * Gets the display amount for a grant, prioritizing financial config (approvedAmount)
 * over attestation data (details.amount).
 *
 * Priority:
 * 1. grant.approvedAmount - Admin-configured amount from payout_grant_config
 * 2. grant.amount - Root-level amount (legacy Hex format)
 * 3. grant.details.amount - Attestation amount from on-chain data
 *
 * @param grant - The grant object
 * @returns Information about the amount to display
 *
 * @example
 * ```tsx
 * const { displayAmount, currency, hasAmount } = getGrantDisplayAmount(grant);
 * if (hasAmount) {
 *   return <span>${displayAmount} {currency}</span>;
 * }
 * ```
 */
export function getGrantDisplayAmount(grant: Grant | undefined | null): GrantAmountInfo {
  if (!grant) {
    return {
      rawAmount: undefined,
      displayAmount: undefined,
      currency: "",
      isFromFinancialConfig: false,
      hasAmount: false,
    };
  }

  // Priority 1: Use approvedAmount from financial config if available
  if (grant.approvedAmount) {
    const { currencyInAmount, parsedValue } = parseAmountString(grant.approvedAmount);
    const currency = currencyInAmount || grant.details?.currency || "";

    return {
      rawAmount: grant.approvedAmount,
      displayAmount: formatAmount(grant.approvedAmount),
      currency,
      isFromFinancialConfig: true,
      hasAmount: parsedValue !== undefined && parsedValue > 0,
    };
  }

  // Priority 2: Check root-level amount (legacy Hex format)
  if (grant.amount) {
    const numericValue = Number(grant.amount);
    const isValidNumber = !Number.isNaN(numericValue) && numericValue > 0;
    const formattedAmount = isValidNumber ? formatCurrency(numericValue) : grant.amount;

    return {
      rawAmount: grant.amount,
      displayAmount: formattedAmount,
      currency: grant.details?.currency || "",
      isFromFinancialConfig: false,
      hasAmount: isValidNumber,
    };
  }

  // Priority 3: Fallback to details.amount (attestation data)
  const detailsAmount = grant.details?.amount;
  if (!detailsAmount) {
    return {
      rawAmount: undefined,
      displayAmount: undefined,
      currency: grant.details?.currency || "",
      isFromFinancialConfig: false,
      hasAmount: false,
    };
  }

  const { currencyInAmount, parsedValue } = parseAmountString(detailsAmount);
  const currency = currencyInAmount || grant.details?.currency || "";

  return {
    rawAmount: detailsAmount,
    displayAmount: formatAmount(detailsAmount),
    currency,
    isFromFinancialConfig: false,
    hasAmount: parsedValue !== undefined && parsedValue > 0,
  };
}

/**
 * Simple helper to get just the formatted amount string
 * Returns undefined if no valid amount exists
 */
export function getGrantAmountDisplay(grant: Grant | undefined | null): string | undefined {
  const { displayAmount, hasAmount } = getGrantDisplayAmount(grant);
  return hasAmount ? displayAmount : undefined;
}

export default getGrantDisplayAmount;
