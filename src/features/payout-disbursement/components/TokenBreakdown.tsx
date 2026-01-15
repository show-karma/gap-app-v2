"use client";

import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { cn } from "@/utilities/tailwind";
import { getChainNameById } from "@/utilities/network";
import { formatTokenAmount } from "../utils/format-token-amount";
import type { TokenTotal } from "../types/payout-disbursement";

/**
 * Get display name for token, including chain if there are duplicates
 */
function getTokenDisplayName(tokenTotal: TokenTotal, allTokens: TokenTotal[]): string {
  const sameSymbolTokens = allTokens.filter(t => t.token === tokenTotal.token);
  if (sameSymbolTokens.length > 1) {
    // Multiple tokens with same symbol - show chain name
    const chainName = getChainNameById(tokenTotal.chainID);
    return `${tokenTotal.token} (${chainName})`;
  }
  return tokenTotal.token;
}

interface TokenBreakdownProps {
  /** Array of token totals - if empty or single item, shows simple display */
  totalsByToken: TokenTotal[];
  /** Optional class name for the container */
  className?: string;
  /** Size variant */
  size?: "sm" | "md";
}

/**
 * TokenBreakdown - Displays disbursement totals with multi-currency support
 *
 * - Single currency: Shows simple amount (e.g., "1,000 USDC")
 * - Multiple currencies: Shows expandable dropdown with breakdown
 *
 * @example
 * // Single currency
 * <TokenBreakdown totalsByToken={[{ token: "USDC", tokenDecimals: 6, tokenAddress: "0x...", totalAmount: "1000000" }]} />
 * // Shows: "1 USDC"
 *
 * @example
 * // Multiple currencies
 * <TokenBreakdown totalsByToken={[
 *   { token: "USDC", tokenDecimals: 6, tokenAddress: "0x...", totalAmount: "1000000" },
 *   { token: "OP", tokenDecimals: 18, tokenAddress: "0x...", totalAmount: "2000000000000000000" }
 * ]} />
 * // Shows: "1 USDC + 1 more" with expandable dropdown
 */
export function TokenBreakdown({
  totalsByToken,
  className,
  size = "md",
}: TokenBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Handle empty array
  if (!totalsByToken || totalsByToken.length === 0) {
    return (
      <span className={cn("text-sm font-medium", className)}>0</span>
    );
  }

  // Single token - simple display
  if (totalsByToken.length === 1) {
    const { tokenDecimals, totalAmount } = totalsByToken[0];
    const formatted = formatTokenAmount(totalAmount, tokenDecimals);
    const displayName = getTokenDisplayName(totalsByToken[0], totalsByToken);
    return (
      <span className={cn("text-sm font-medium", className)}>
        {formatted} {displayName}
      </span>
    );
  }

  // Multiple tokens - expandable dropdown
  const primaryToken = totalsByToken[0];
  const additionalCount = totalsByToken.length - 1;

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center gap-1 text-sm font-medium",
          "hover:text-blue-600 dark:hover:text-blue-400 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
        )}
      >
        <span>
          {formatTokenAmount(primaryToken.totalAmount, primaryToken.tokenDecimals)}{" "}
          {getTokenDisplayName(primaryToken, totalsByToken)}
        </span>
        <span className="text-gray-500 dark:text-gray-400">
          + {additionalCount} more
        </span>
        {isExpanded ? (
          <ChevronUpIcon className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDownIcon className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {isExpanded && (
        <div
          className={cn(
            "absolute z-10 mt-1 left-0",
            "bg-white dark:bg-zinc-800 rounded-lg shadow-lg",
            "border border-gray-200 dark:border-zinc-700",
            "py-2 px-3 min-w-[160px]",
            size === "sm" ? "text-xs" : "text-sm"
          )}
        >
          <div className="space-y-1.5">
            {totalsByToken.map((tokenTotal, index) => (
              <div
                key={`${tokenTotal.tokenAddress}-${tokenTotal.chainID}`}
                className={cn(
                  "flex justify-between items-center gap-4",
                  index === 0 && "font-medium"
                )}
              >
                <span className="text-gray-600 dark:text-gray-400">
                  {getTokenDisplayName(tokenTotal, totalsByToken)}
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatTokenAmount(tokenTotal.totalAmount, tokenTotal.tokenDecimals)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Inline version for table cells - shows all tokens separated by comma
 */
export function TokenBreakdownInline({
  totalsByToken,
  className,
}: Omit<TokenBreakdownProps, "size">) {
  if (!totalsByToken || totalsByToken.length === 0) {
    return <span className={cn("text-sm", className)}>0</span>;
  }

  return (
    <span className={cn("text-sm", className)}>
      {totalsByToken.map((t, i) => (
        <span key={`${t.tokenAddress}-${t.chainID}`}>
          {i > 0 && ", "}
          {formatTokenAmount(t.totalAmount, t.tokenDecimals)} {getTokenDisplayName(t, totalsByToken)}
        </span>
      ))}
    </span>
  );
}
