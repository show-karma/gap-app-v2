import millify from "millify";

const WEI_PER_ETH = 1e18;

/**
 * Convert wei to ETH and format for display.
 * @param weiValue - Value in wei (10^18 wei = 1 ETH)
 * @returns Formatted string with ETH suffix
 */
export function formatWeiToEth(weiValue: number): string {
  if (weiValue === 0) return "0 ETH";

  const ethValue = weiValue / WEI_PER_ETH;

  // For very small ETH values, show more precision
  if (ethValue < 0.0001) {
    return `${ethValue.toExponential(2)} ETH`;
  }

  if (ethValue < 0.01) {
    return `${ethValue.toFixed(6)} ETH`;
  }

  if (ethValue < 1) {
    return `${ethValue.toFixed(4)} ETH`;
  }

  if (ethValue < 1000) {
    // Show 2 decimals for values < 1000
    const formatted = ethValue.toFixed(2);
    return formatted.endsWith(".00") ? `${Math.round(ethValue)} ETH` : `${formatted} ETH`;
  }

  // For large ETH values, use K, M, B suffixes
  return `${formatLargeNumber(ethValue)} ETH`;
}

/**
 * Format large numbers for display using K, M, B, T, P, E suffixes.
 * Handles very large numbers (up to Exa = 10^18) which are common for
 * blockchain values like Wei.
 */
export default function formatCurrency(value: number) {
  if (value === 0) {
    return "0";
  }

  if (value < 1) {
    return Number(value)?.toFixed(2);
  }

  // Use custom formatting for very large numbers to avoid precision issues
  // JavaScript's MAX_SAFE_INTEGER is ~9 * 10^15, so we handle large numbers manually
  return formatLargeNumber(value);
}

/**
 * Format large numbers with K, M, B, T, P, E suffixes.
 * Handles numbers up to 10^18 (Exa) range.
 */
function formatLargeNumber(value: number): string {
  // Define thresholds and suffixes (ordered from largest to smallest)
  const tiers = [
    { threshold: 1e18, suffix: "E" }, // Exa (10^18)
    { threshold: 1e15, suffix: "P" }, // Peta (10^15)
    { threshold: 1e12, suffix: "T" }, // Tera (10^12)
    { threshold: 1e9, suffix: "B" }, // Billion (10^9)
    { threshold: 1e6, suffix: "M" }, // Million (10^6)
    { threshold: 1e3, suffix: "K" }, // Thousand (10^3)
  ];

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    if (value >= tier.threshold) {
      const scaled = value / tier.threshold;

      // Check if rounding would push us to 1000 (next tier boundary)
      const rounded = Math.round(scaled * 10) / 10;
      if (rounded >= 1000 && i > 0) {
        // Move to the next higher tier
        const higherTier = tiers[i - 1];
        return `1${higherTier.suffix}`;
      }

      // Use 1 decimal place, but drop .0 for cleaner display
      const formatted = scaled.toFixed(1);
      return formatted.endsWith(".0")
        ? `${Math.round(scaled)}${tier.suffix}`
        : `${formatted}${tier.suffix}`;
    }
  }

  // Handle values that would round up to the next tier (e.g., 999.99 -> 1K)
  if (value >= 999.5) {
    return "1K";
  }

  // For values < 1000, show with appropriate precision
  if (value >= 100) {
    return Math.round(value).toString();
  }

  // For values 10-99, preserve 1 decimal if meaningful
  if (value >= 10) {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
  }

  // For values 1-9.99, show integer if whole, otherwise 1 decimal
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
}
