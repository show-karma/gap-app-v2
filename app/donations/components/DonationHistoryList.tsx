"use client";

import React, { useMemo } from "react";
import type { DonationApiResponse } from "@/hooks/donation/types";
import { formatMonthYear } from "@/utilities/formatDate";
import type { DonationGroupProps, DonationHistoryListProps } from "../types";
import { DonationHistoryItem, DonationHistoryItemSkeleton } from "./DonationHistoryItem";

/**
 * Get a sortable key for month grouping (YYYY-MM format)
 */
function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const DonationGroup = React.memo<DonationGroupProps>(({ date, donations }) => (
  <div className="space-y-2">
    <h3 className="text-sm font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wide">
      {date}
    </h3>
    <div className="space-y-2">
      {donations.map((donation) => (
        <DonationHistoryItem key={donation.uid} donation={donation} />
      ))}
    </div>
  </div>
));

DonationGroup.displayName = "DonationGroup";

export const DonationHistoryList = React.memo<DonationHistoryListProps>(({ donations }) => {
  const groupedDonations = useMemo(() => {
    // Group by month-year
    const groups: Record<string, { label: string; donations: DonationApiResponse[] }> = {};

    donations.forEach((donation) => {
      const date = new Date(donation.createdAt);
      const key = getMonthKey(date);

      if (!groups[key]) {
        groups[key] = {
          label: formatMonthYear(date),
          donations: [],
        };
      }
      groups[key].donations.push(donation);
    });

    // Sort by key (newest first) and return as array
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, group]) => ({
        key,
        label: group.label,
        donations: group.donations,
      }));
  }, [donations]);

  return (
    <div className="space-y-6">
      {groupedDonations.map((group) => (
        <DonationGroup key={group.key} date={group.label} donations={group.donations} />
      ))}
    </div>
  );
});

DonationHistoryList.displayName = "DonationHistoryList";

// Skeleton component for loading state
export const DonationHistorySkeleton = React.memo(() => (
  <div className="space-y-6">
    <div className="space-y-2">
      <div className="h-4 w-32 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" />
      <div className="space-y-2">
        <DonationHistoryItemSkeleton />
        <DonationHistoryItemSkeleton />
        <DonationHistoryItemSkeleton />
      </div>
    </div>
  </div>
));

DonationHistorySkeleton.displayName = "DonationHistorySkeleton";
