"use client";

import Image from "next/image";

interface FinancialsEmptyStateProps {
  hasPrograms: boolean;
}

export function FinancialsEmptyState({ hasPrograms }: FinancialsEmptyStateProps) {
  if (!hasPrograms) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 p-8"
        data-testid="financials-no-programs"
      >
        <Image
          src="/images/comments.png"
          alt="No programs illustration"
          width={438}
          height={185}
          className="h-32 w-auto object-contain opacity-60"
          loading="lazy"
        />
        <p className="text-center text-lg font-semibold text-gray-900 dark:text-white">
          No programs available
        </p>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400 max-w-md">
          This community doesn&apos;t have any funding programs yet. Check back later for updates.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center gap-4 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 p-8"
      data-testid="financials-select-program"
    >
      <Image
        src="/images/comments.png"
        alt="Select a program illustration"
        width={438}
        height={185}
        className="h-32 w-auto object-contain opacity-60"
        loading="lazy"
      />
      <p className="text-center text-lg font-semibold text-gray-900 dark:text-white">
        Select a program
      </p>
      <p className="text-center text-sm text-gray-600 dark:text-gray-400 max-w-md">
        Choose a funding program above to view its financial overview and project-level disbursement
        status.
      </p>
    </div>
  );
}
