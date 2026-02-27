"use client";

import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/20/solid";
import type { CommunityPayoutsSorting } from "@/src/features/payout-disbursement";

export function SortIcon({
  column,
  sortBy,
  sortOrder,
}: {
  column: CommunityPayoutsSorting["sortBy"];
  sortBy?: CommunityPayoutsSorting["sortBy"];
  sortOrder?: "asc" | "desc";
}) {
  if (sortBy === column) {
    return sortOrder === "asc" ? (
      <ChevronUpIcon className="h-4 w-4" />
    ) : (
      <ChevronDownIcon className="h-4 w-4" />
    );
  }
  return <ChevronUpIcon className="h-4 w-4 opacity-50" />;
}
