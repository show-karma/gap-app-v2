"use client";

import React, { useMemo } from "react";
import type { Hex } from "viem";
import { useAccount } from "wagmi";
import { useDonationHistory } from "@/hooks/donation/useDonationHistory";
import { DonationHistoryList, DonationHistorySkeleton } from "./components/DonationHistoryList";

export default function DonationsPage() {
  const { address } = useAccount();
  const { data: donations, isLoading, error } = useDonationHistory(address as Hex | undefined);

  const completedCount = useMemo(() => {
    if (!donations) return 0;
    return donations.filter((d) => d.status === "completed").length;
  }, [donations]);

  if (!address) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-2xl font-semibold mb-6 dark:text-zinc-100">My Donations</h1>
        <div className="text-center py-12 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-gray-200 dark:border-zinc-700">
          <p className="text-gray-600 dark:text-zinc-400">
            Please connect your wallet to view your donations
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-2xl font-semibold mb-6 dark:text-zinc-100">My Donations</h1>
        <div className="flex gap-3 mb-6">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 rounded-md animate-pulse">
            <div className="h-4 w-16 bg-gray-200 dark:bg-zinc-700 rounded" />
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 rounded-md animate-pulse">
            <div className="h-4 w-16 bg-gray-200 dark:bg-zinc-700 rounded" />
          </div>
        </div>
        <DonationHistorySkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-2xl font-semibold mb-6 dark:text-zinc-100">My Donations</h1>
        <div className="text-center py-12 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400">Error loading donations</p>
        </div>
      </div>
    );
  }

  if (!donations || donations.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-2xl font-semibold mb-6 dark:text-zinc-100">My Donations</h1>
        <div className="text-center py-12 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-gray-200 dark:border-zinc-700">
          <p className="text-gray-600 dark:text-zinc-400 mb-2">No donations yet</p>
          <p className="text-sm text-gray-500 dark:text-zinc-500">
            Start supporting projects to see your donation history here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-6 dark:text-zinc-100">My Donations</h1>

      <div className="flex gap-3 mb-6">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 rounded-md">
          <span className="text-sm font-medium text-gray-900 dark:text-zinc-100">
            {donations.length}
          </span>
          <span className="text-sm text-gray-500 dark:text-zinc-400">donations</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 rounded-md">
          <span className="text-sm font-medium text-gray-900 dark:text-zinc-100">
            {completedCount}
          </span>
          <span className="text-sm text-gray-500 dark:text-zinc-400">completed</span>
        </div>
      </div>

      <DonationHistoryList donations={donations} />
    </div>
  );
}
