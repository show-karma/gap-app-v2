"use client";
import { Card } from "@tremor/react";
import Image from "next/image";
import { cn } from "@/utilities/tailwind";

export const SegmentSkeleton = ({
  segmentType,
  segmentName,
  segmentDescription,
  indicatorCount,
}: {
  segmentType: "output" | "outcome";
  segmentName: string;
  segmentDescription: string;
  indicatorCount: number;
}) => {
  return (
    <div className="flex flex-col w-full bg-[#F9FAFB] dark:bg-zinc-800 rounded mb-4">
      <div className="px-6 pb-6 flex flex-col gap-y-4">
        <div className="pt-3 flex flex-col gap-3">
          <div
            className={cn(
              "p-3 flex flex-row gap-3 justify-between items-start rounded",
              segmentType === "outcome"
                ? "bg-green-100 dark:bg-green-900"
                : "bg-indigo-100 dark:bg-indigo-900"
            )}
          >
            <div className="flex flex-row gap-3 items-center">
              <Image
                src={segmentType === "outcome" ? "/icons/outcome.svg" : "/icons/activity.svg"}
                alt={segmentType}
                width={32}
                height={32}
              />
              <div className="flex flex-col gap-0">
                <p className="text-black dark:text-white text-lg font-semibold">{segmentName}</p>
                <p className="text-black dark:text-white text-base font-normal">
                  {segmentDescription}
                </p>
              </div>
            </div>
            <p className="text-center text-slate-600 dark:text-gray-200 text-sm font-semibold px-3 py-1 bg-white dark:bg-zinc-700 rounded justify-start items-center">
              {indicatorCount} {indicatorCount === 1 ? "metric" : "metrics"}
            </p>
          </div>

          {/* Chart Skeleton */}
          <Card className="bg-white dark:bg-zinc-700">
            <div className="mb-4">
              {/* Title skeleton */}
              <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-48 mb-2 animate-pulse" />

              {/* Tags skeleton */}
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: Math.min(indicatorCount, 3) }).map((_, index) => (
                  <div
                    key={index}
                    className="h-6 bg-gray-200 dark:bg-gray-600 rounded-full w-32 animate-pulse"
                  />
                ))}
              </div>
            </div>

            {/* Chart area skeleton */}
            <div className="h-72 bg-gray-100 dark:bg-gray-600 rounded animate-pulse flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 bg-gray-300 dark:bg-gray-500 rounded-full mx-auto mb-2 animate-pulse" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading chart data...</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
