"use client";

import type { FC, ReactNode } from "react";
import { Spinner } from "@/components/Utilities/Spinner";
import { cn } from "@/utilities/tailwind";

export interface TabPanelProps {
  children: ReactNode;
  className?: string;
  isLoading?: boolean;
  /** Whether to add default padding */
  padded?: boolean;
  /** Whether to show skeleton loader instead of spinner */
  showSkeleton?: boolean;
}

/** Skeleton loader component for content placeholders */
const SkeletonLoader: FC<{ className?: string }> = ({ className }) => (
  <output className={cn("animate-pulse", className)} aria-label="Loading content">
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-6 bg-gray-200 dark:bg-zinc-700 rounded w-1/3" />
        <div className="h-8 bg-gray-200 dark:bg-zinc-700 rounded w-24" />
      </div>
      {/* Content blocks skeleton */}
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-full" />
        <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-5/6" />
        <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-4/6" />
      </div>
      {/* Card skeleton */}
      <div className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 mt-6">
        <div className="h-5 bg-gray-200 dark:bg-zinc-700 rounded w-1/4 mb-3" />
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 dark:bg-zinc-700 rounded w-full" />
          <div className="h-3 bg-gray-200 dark:bg-zinc-700 rounded w-5/6" />
        </div>
      </div>
      <div className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4">
        <div className="h-5 bg-gray-200 dark:bg-zinc-700 rounded w-1/3 mb-3" />
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 dark:bg-zinc-700 rounded w-full" />
          <div className="h-3 bg-gray-200 dark:bg-zinc-700 rounded w-4/6" />
        </div>
      </div>
    </div>
    <span className="sr-only">Loading...</span>
  </output>
);

export const TabPanel: FC<TabPanelProps> = ({
  children,
  className,
  isLoading = false,
  padded = true,
  showSkeleton = false,
}) => {
  if (isLoading) {
    return (
      <div className={cn(padded && "p-6", className)}>
        {showSkeleton ? (
          <SkeletonLoader />
        ) : (
          <div className="flex items-center justify-center py-12">
            <Spinner />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn(padded && "p-6", "transition-opacity duration-200 ease-in-out", className)}>
      {children}
    </div>
  );
};

export default TabPanel;
