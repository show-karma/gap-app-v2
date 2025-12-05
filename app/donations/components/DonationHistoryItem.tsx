"use client";

import Link from "next/link";
import React, { useMemo } from "react";
import { getNetworkConfig } from "@/constants/supportedTokens";
import type { DonationHistoryItemProps } from "../types";

export const DonationHistoryItem = React.memo<DonationHistoryItemProps>(({ donation }) => {
  const explorerUrl = useMemo(() => {
    const networkConfig = getNetworkConfig(donation.chainID);
    const baseUrl = networkConfig?.blockExplorer || "https://etherscan.io";
    return `${baseUrl}/tx/${donation.transactionHash}`;
  }, [donation.chainID, donation.transactionHash]);

  const formattedDate = useMemo(() => {
    return new Date(donation.createdAt).toLocaleString();
  }, [donation.createdAt]);

  const statusColor = useMemo(() => {
    switch (donation.status) {
      case "completed":
        return "text-green-600";
      case "pending":
        return "text-yellow-600";
      case "failed":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  }, [donation.status]);

  return (
    <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Link href={`/project/${donation.projectUID}`} className="font-medium hover:underline">
            Project {donation.projectUID.slice(0, 8)}...
          </Link>
          <div className="text-sm text-gray-600 mt-1">
            {donation.amount} {donation.tokenSymbol}
            {donation.fiatAmount && (
              <span className="ml-2">
                (${donation.fiatAmount.toFixed(2)} {donation.fiatCurrency})
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className={`text-sm font-medium ${statusColor}`}>{donation.status}</div>
          <div className="text-xs text-gray-500 mt-1">{formattedDate}</div>
        </div>
      </div>

      <div className="mt-2 flex gap-2">
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline"
        >
          View Transaction
        </a>
        <span className="text-xs text-gray-400">
          {donation.donationType === "fiat" ? "Card Payment" : "Crypto"}
        </span>
      </div>
    </div>
  );
});

DonationHistoryItem.displayName = "DonationHistoryItem";
