/**
 * Utility functions for Impact indicator components
 */

import { urlRegex } from "@/utilities/regexs/urlRegex";

/**
 * Determine indicator sorting priority
 * Priority 0: GitHub indicators (highest - appear first)
 * Priority 1: Blockchain/On-chain indicators
 * Priority 2: All other indicators (lowest - appear last)
 */
export const getIndicatorSortPriority = (indicatorName: string): number => {
  const name = indicatorName.toLowerCase();

  // Priority 0: GitHub indicators (highest priority - appear first)
  if (name.includes("github") || name.includes("git")) {
    return 0;
  }

  // Priority 1: Blockchain/On-chain indicators
  if (
    name.includes("unique users") ||
    name.includes("unique user") ||
    name.includes("no. of transactions") ||
    name.includes("transaction") ||
    name.includes("chain")
  ) {
    return 1;
  }

  // Priority 2: All other indicators (lowest priority - appear last)
  return 2;
};

/**
 * Sort indicators by priority (GitHub, On-chain, Other)
 * Within same priority, sort alphabetically by name
 */
export const sortIndicatorsByPriority = <T extends { name: string }>(indicators: T[]): T[] => {
  return [...indicators].sort((a, b) => {
    const aPriority = getIndicatorSortPriority(a.name);
    const bPriority = getIndicatorSortPriority(b.name);

    // First sort by priority (GitHub first)
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    // Within same priority, sort alphabetically by name
    return a.name.localeCompare(b.name);
  });
};

/**
 * Parse comma-separated proof URLs
 * Handles Dune URLs specially (no splitting)
 */
export const parseProofUrls = (proof: string | undefined): string[] => {
  if (!proof) return [];
  if (proof.includes("dune.com")) {
    return [proof];
  }
  // Split by comma and trim whitespace
  return proof
    .split(",")
    .map((url) => url.trim())
    .filter((url) => url && urlRegex.test(url));
};
