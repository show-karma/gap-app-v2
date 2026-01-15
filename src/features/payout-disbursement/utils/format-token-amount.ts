/**
 * Token amount formatting utilities for the payout disbursement feature.
 *
 * These utilities handle the conversion between raw blockchain amounts (in smallest units)
 * and human-readable display formats, supporting various token decimals.
 */

/** Default decimals for common tokens */
export const TOKEN_DECIMALS = {
  USDC: 6,
  USDT: 6,
  DAI: 18,
  ETH: 18,
  DEFAULT: 18,
} as const;

/**
 * Formats a raw token amount (in smallest units) to a human-readable string.
 *
 * @param amount - The raw amount as a string (in smallest units, e.g., "1000000" for 1 USDC)
 * @param decimals - Number of decimals for the token (e.g., 6 for USDC, 18 for most ERC-20s)
 * @param options - Optional formatting options
 * @returns Formatted amount string (e.g., "1,000.00")
 *
 * @example
 * // USDC with 6 decimals
 * formatTokenAmount("1000000", 6) // "1"
 * formatTokenAmount("1500000000", 6) // "1,500"
 *
 * @example
 * // ETH with 18 decimals
 * formatTokenAmount("1000000000000000000", 18) // "1"
 * formatTokenAmount("1500000000000000000000", 18) // "1,500"
 */
export function formatTokenAmount(
  amount: string,
  decimals: number,
  options?: {
    /** Maximum fraction digits to display. Defaults based on value and decimals */
    maximumFractionDigits?: number;
    /** Minimum fraction digits to display. Defaults to 0 */
    minimumFractionDigits?: number;
    /** Locale for number formatting. Defaults to user's locale */
    locale?: string;
  }
): string {
  const rawAmount = parseFloat(amount);

  if (Number.isNaN(rawAmount)) {
    return "0";
  }

  const num = rawAmount / 10 ** decimals;

  // Determine maximum fraction digits based on value size
  // Show more precision for small amounts so they don't display as "0"
  let defaultMaxFractionDigits: number;
  if (num === 0) {
    defaultMaxFractionDigits = 0;
  } else if (num < 0.01) {
    // For very small amounts, show up to 6 decimal places
    defaultMaxFractionDigits = 6;
  } else if (num < 1) {
    // For amounts less than 1, show up to 4 decimal places
    defaultMaxFractionDigits = 4;
  } else if (decimals > 6) {
    // For tokens with many decimals (like ETH), show up to 4
    defaultMaxFractionDigits = 4;
  } else {
    // For larger amounts with fewer decimals (like USDC), show 2
    defaultMaxFractionDigits = 2;
  }

  return num.toLocaleString(options?.locale, {
    maximumFractionDigits: options?.maximumFractionDigits ?? defaultMaxFractionDigits,
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
  });
}

/**
 * Converts a human-readable amount to raw token units (smallest unit).
 *
 * @param amount - The human-readable amount (e.g., "1.5" for 1.5 USDC)
 * @param decimals - Number of decimals for the token
 * @returns Raw amount string in smallest units (e.g., "1500000" for 1.5 USDC)
 *
 * @example
 * toSmallestUnit("1.5", 6) // "1500000"
 * toSmallestUnit("1.5", 18) // "1500000000000000000"
 */
export function toSmallestUnit(amount: string | number, decimals: number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;

  if (Number.isNaN(num)) {
    return "0";
  }

  // Use BigInt for precision with large numbers
  const multiplier = BigInt(10 ** decimals);
  // Handle decimal places by multiplying first, then converting
  const scaled = Math.round(num * 10 ** decimals);

  return scaled.toString();
}

/**
 * Converts a raw amount to human-readable format (number, not formatted string).
 *
 * @param amount - The raw amount in smallest units
 * @param decimals - Number of decimals for the token
 * @returns Human-readable number value
 *
 * @example
 * fromSmallestUnit("1500000", 6) // 1.5
 * fromSmallestUnit("1500000000000000000", 18) // 1.5
 */
export function fromSmallestUnit(amount: string, decimals: number): number {
  const rawAmount = parseFloat(amount);

  if (Number.isNaN(rawAmount)) {
    return 0;
  }

  return rawAmount / 10 ** decimals;
}

/**
 * Calculates the progress percentage between disbursed and approved amounts.
 *
 * @param disbursedRaw - Raw disbursed amount (in smallest units)
 * @param approvedHumanReadable - Human-readable approved amount (e.g., "10000")
 * @param decimals - Number of decimals for the disbursed amount token
 * @returns Progress percentage (0-100)
 */
export function calculateDisbursementProgress(
  disbursedRaw: string,
  approvedHumanReadable: string,
  decimals: number
): number {
  const disbursedNum = fromSmallestUnit(disbursedRaw, decimals);
  const approvedNum = parseFloat(approvedHumanReadable.replace(/,/g, ""));

  if (Number.isNaN(disbursedNum) || Number.isNaN(approvedNum) || approvedNum === 0) {
    return 0;
  }

  return Math.min(100, (disbursedNum / approvedNum) * 100);
}

/**
 * Calculates the remaining balance between approved and disbursed amounts.
 *
 * @param disbursedRaw - Raw disbursed amount (in smallest units)
 * @param approvedHumanReadable - Human-readable approved amount (e.g., "10000")
 * @param decimals - Number of decimals for the disbursed amount token
 * @returns Formatted remaining balance string
 */
export function calculateRemainingBalance(
  disbursedRaw: string,
  approvedHumanReadable: string,
  decimals: number
): string {
  const disbursedNum = fromSmallestUnit(disbursedRaw, decimals);
  const approvedNum = parseFloat(approvedHumanReadable.replace(/,/g, ""));

  if (Number.isNaN(disbursedNum) || Number.isNaN(approvedNum)) {
    return "0";
  }

  const remaining = Math.max(0, approvedNum - disbursedNum);
  return remaining.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/**
 * Gets the default decimals for a known token symbol, or returns the default.
 *
 * @param tokenSymbol - Token symbol (e.g., "USDC", "ETH")
 * @returns Number of decimals for the token
 */
export function getDefaultDecimals(tokenSymbol: string): number {
  const upperSymbol = tokenSymbol.toUpperCase();

  if (upperSymbol in TOKEN_DECIMALS) {
    return TOKEN_DECIMALS[upperSymbol as keyof typeof TOKEN_DECIMALS];
  }

  return TOKEN_DECIMALS.DEFAULT;
}
