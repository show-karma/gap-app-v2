"use client";

import pluralize from "pluralize";
import { Button } from "@/components/Utilities/Button";
import type { IndicatorDistribution, ProjectDiscoveryResult } from "@/services/projectDiscovery";
import { DiscoveryResultCard } from "./DiscoveryResultCard";

interface DiscoveryResultsProps {
  isError: boolean;
  results: ProjectDiscoveryResult[] | undefined;
  indicatorDistribution: IndicatorDistribution;
  activeCalculation: string | null;
  onRetry: () => void;
  onScoreClick: (projectUID: string) => void;
  onCloseCalculation: () => void;
}

export const DiscoveryResults = ({
  isError,
  results,
  indicatorDistribution,
  activeCalculation,
  onRetry,
  onScoreClick,
  onCloseCalculation,
}: DiscoveryResultsProps) => {
  if (isError) {
    return (
      <div className="flex w-full flex-col items-start justify-center h-[400px] gap-3 pl-12 border-l border-l-zinc-400 ml-10">
        <p className="text-lg font-medium text-gray-900 dark:text-zinc-100">
          We couldn&apos;t run the discovery search.
        </p>
        <p className="text-sm text-gray-600 dark:text-zinc-400">
          Something went wrong while discovering projects. Please try again.
        </p>
        <Button onClick={onRetry} className="px-6">
          Retry
        </Button>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex w-full flex-col items-start justify-center h-[400px] text-gray-500 pl-12 border-l border-l-zinc-400 ml-10">
        <p className="text-lg">Select a category and program, then discover projects</p>
        <p className="text-sm">Use the filters on the left to discover projects</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex w-full flex-col items-start justify-center h-[400px] text-gray-500 pl-12 border-l border-l-zinc-400 ml-10">
        <p className="text-lg">No projects matched these filters</p>
        <p className="text-sm">Try a different category, program, or fewer endorsers.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-zinc-100">
          Discovery Results
        </h3>
        <span className="text-sm text-gray-600 dark:text-zinc-400">
          {results.length} {pluralize("project", results.length)} found
        </span>
      </div>
      <div className="grid grid-cols-1 gap-6">
        {results.map((result) => (
          <DiscoveryResultCard
            key={result.project.projectUID}
            result={result}
            indicatorDistribution={indicatorDistribution}
            isCalculationOpen={activeCalculation === result.project.projectUID}
            onScoreClick={onScoreClick}
            onCloseCalculation={onCloseCalculation}
          />
        ))}
      </div>
    </div>
  );
};
