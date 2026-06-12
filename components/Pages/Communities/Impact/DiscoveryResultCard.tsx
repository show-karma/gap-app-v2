"use client";

import { memo } from "react";
import type { IndicatorDistribution, ProjectDiscoveryResult } from "@/services/projectDiscovery";
import { Link } from "@/src/components/navigation/Link";
import formatCurrency from "@/utilities/formatCurrency";
import { PAGES } from "@/utilities/pages";

interface DiscoveryResultCardProps {
  result: ProjectDiscoveryResult;
  indicatorDistribution: IndicatorDistribution;
  isCalculationOpen: boolean;
  onScoreClick: (projectUID: string) => void;
  onCloseCalculation: () => void;
}

export const DiscoveryResultCard = memo(
  ({
    result,
    indicatorDistribution,
    isCalculationOpen,
    onScoreClick,
    onCloseCalculation,
  }: DiscoveryResultCardProps) => (
    <div className="rounded-xl flex flex-col gap-4 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm hover:shadow-md transition-shadow relative">
      <div className="flex justify-between items-start gap-4">
        <div className="flex flex-col gap-2">
          <Link
            href={PAGES.PROJECT.OVERVIEW(result.project.projectSlug)}
            className="text-2xl font-bold text-gray-900 dark:text-zinc-100 line-clamp-2"
          >
            {result.project.projectTitle}
          </Link>
          <div className="space-y-2">
            <Link
              href={PAGES.PROJECT.GRANT(result.project.projectSlug, result.project.grantUID)}
              className="text-md text-gray-600 dark:text-zinc-400"
            >
              {result.project.grantTitle}
            </Link>
          </div>
        </div>
        <div className="flex flex-col items-end justify-center">
          <button
            type="button"
            onClick={() => onScoreClick(result.project.projectUID)}
            className="text-2xl text-primary font-bold hover:opacity-80 transition-opacity underline decoration-dotted cursor-pointer"
            aria-label="Show impact score calculation"
          >
            {formatCurrency(result.impactScore)}
          </button>
          <span className="text-sm font-medium text-gray-600 dark:text-zinc-400">Impact Score</span>
        </div>
      </div>

      {isCalculationOpen && (
        <div className="absolute right-0 top-16 z-10 w-80 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-gray-200 dark:border-zinc-700 p-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-zinc-300">
              Impact Score Calculation
            </h4>
            <button
              type="button"
              onClick={onCloseCalculation}
              className="text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              aria-label="Close calculation"
            >
              ×
            </button>
          </div>
          <div className="space-y-2">
            {result.impact.map((impact) => (
              <div
                key={impact.impactIndicatorId}
                className="flex justify-between items-center text-sm"
              >
                <span className="text-gray-600 dark:text-zinc-400">{impact.indicatorName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-zinc-400">
                    {formatCurrency(impact.avgValue)}
                  </span>
                  <span className="text-gray-400 dark:text-zinc-500">×</span>
                  <span className="text-primary">
                    {Math.round((indicatorDistribution[impact.impactIndicatorId] ?? 0) * 100)}%
                  </span>
                  <span className="text-gray-400 dark:text-zinc-500">=</span>
                  <span className="font-medium text-gray-900 dark:text-zinc-100">
                    {formatCurrency(
                      impact.avgValue * (indicatorDistribution[impact.impactIndicatorId] ?? 0)
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
);

DiscoveryResultCard.displayName = "DiscoveryResultCard";
