"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import React, { useMemo } from "react";
import { getNetworkConfig } from "@/constants/supportedTokens";
import { formatDayMonth } from "@/utilities/formatDate";
import type { DonationHistoryItemProps } from "../types";

export const DonationHistoryItem = React.memo<DonationHistoryItemProps>(({ donation }) => {
  const explorerUrl = useMemo(() => {
    const networkConfig = getNetworkConfig(donation.chainID);
    if (!networkConfig?.blockExplorer) {
      return null;
    }
    return `${networkConfig.blockExplorer}/tx/${donation.transactionHash}`;
  }, [donation.chainID, donation.transactionHash]);

  const formattedDate = useMemo(() => {
    return formatDayMonth(new Date(donation.createdAt));
  }, [donation.createdAt]);

  const chainName = useMemo(() => {
    const networkConfig = getNetworkConfig(donation.chainID);
    return networkConfig?.chainName || `Chain ${donation.chainID}`;
  }, [donation.chainID]);

  const statusConfig = useMemo(() => {
    switch (donation.status) {
      case "completed":
        return {
          label: "Completed",
          bgColor: "bg-green-100 dark:bg-green-900/30",
          textColor: "text-green-700 dark:text-green-400",
        };
      case "pending":
        return {
          label: "Pending",
          bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
          textColor: "text-yellow-700 dark:text-yellow-400",
        };
      case "failed":
        return {
          label: "Failed",
          bgColor: "bg-red-100 dark:bg-red-900/30",
          textColor: "text-red-700 dark:text-red-400",
        };
      default:
        return {
          label: donation.status,
          bgColor: "bg-gray-100 dark:bg-zinc-800",
          textColor: "text-gray-600 dark:text-zinc-400",
        };
    }
  }, [donation.status]);

  // Use projectName if available, otherwise fallback to truncated UID
  const projectDisplayName =
    donation.projectName || `Project ${donation.projectUID.slice(0, 8)}...`;

  // Use projectSlug for link if available, otherwise use projectUID
  const projectLink = `/project/${donation.projectSlug || donation.projectUID}`;

  return (
    <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg hover:border-gray-300 dark:hover:border-zinc-700 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={projectLink}
            className="font-medium text-gray-900 dark:text-zinc-100 hover:text-brand-blue dark:hover:text-blue-400 truncate"
          >
            {projectDisplayName}
          </Link>
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}
          >
            {statusConfig.label}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-zinc-400">
          <span>
            {donation.amount} {donation.tokenSymbol}
          </span>
          <span className="text-gray-300 dark:text-zinc-600">·</span>
          <span>{chainName}</span>
          <span className="text-gray-300 dark:text-zinc-600">·</span>
          <span>{formattedDate}</span>
          {typeof donation.fiatAmount === "number" &&
            donation.fiatAmount > 0 &&
            donation.fiatCurrency && (
              <>
                <span className="text-gray-300 dark:text-zinc-600">·</span>
                <span>
                  ${donation.fiatAmount.toFixed(2)} {donation.fiatCurrency}
                </span>
              </>
            )}
        </div>
      </div>

      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
          title="View transaction"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      )}
    </div>
  );
});

DonationHistoryItem.displayName = "DonationHistoryItem";

// Skeleton component for loading state
export const DonationHistoryItemSkeleton = React.memo(() => (
  <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg">
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <div className="h-5 w-40 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" />
        <div className="h-5 w-16 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" />
      </div>
      <div className="flex items-center gap-2 mt-1">
        <div className="h-4 w-24 bg-gray-100 dark:bg-zinc-800 rounded animate-pulse" />
        <div className="h-4 w-16 bg-gray-100 dark:bg-zinc-800 rounded animate-pulse" />
      </div>
    </div>
    <div className="w-8 h-8 bg-gray-100 dark:bg-zinc-800 rounded animate-pulse" />
  </div>
));

DonationHistoryItemSkeleton.displayName = "DonationHistoryItemSkeleton";
