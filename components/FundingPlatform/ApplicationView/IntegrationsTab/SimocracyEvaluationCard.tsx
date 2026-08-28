"use client";

import { ChevronRightIcon, CpuChipIcon } from "@heroicons/react/24/outline";
import { type FC, memo, useState } from "react";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import type { SimocracyEvaluationRow } from "@/services/fundingApplicationIntegrations.service";
import { cn } from "@/utilities/tailwind";
import { MarginalValueCurve } from "./MarginalValueCurve";

export interface SimocracyEvaluationCardProps {
  evaluation: SimocracyEvaluationRow;
  fundedAmount?: number | null;
}

function simDisplayName(evaluation: SimocracyEvaluationRow): string {
  if (evaluation.sim.simName) return evaluation.sim.simName;
  const uri = evaluation.sim.simUri;
  return uri.length > 40 ? `…${uri.slice(-24)}` : uri;
}

const SimocracyEvaluationCardComponent: FC<SimocracyEvaluationCardProps> = ({
  evaluation,
  fundedAmount,
}) => {
  const [showConstitution, setShowConstitution] = useState(false);
  const [showFullReasoning, setShowFullReasoning] = useState(false);
  const name = simDisplayName(evaluation);

  return (
    <article className="flex flex-col rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-zinc-800">
      <header className="flex items-center justify-between gap-3 px-4 pt-4">
        <div className="flex min-w-0 items-center gap-2.5">
          {evaluation.sim.avatar ? (
            <ProfilePicture
              imageURL={evaluation.sim.avatar}
              name={name}
              size="32"
              className="h-8 w-8 rounded-md [image-rendering:pixelated]"
              alt=""
            />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 text-gray-500 dark:bg-zinc-700 dark:text-gray-400">
              <CpuChipIcon className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0">
            <h4 className="truncate text-sm font-semibold text-gray-900 dark:text-white">{name}</h4>
            <p className="truncate font-mono text-[11px] text-gray-500 dark:text-gray-400">
              {evaluation.model ?? "model not recorded"}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-3 px-4 py-3.5">
        {evaluation.mvf.length > 0 && (
          <MarginalValueCurve points={evaluation.mvf} funded={fundedAmount} />
        )}

        <div>
          <p className="mb-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
            Sim evaluation
          </p>
          <p
            className={cn(
              "whitespace-pre-line text-sm leading-relaxed text-gray-700 dark:text-gray-300",
              !showFullReasoning && "line-clamp-5"
            )}
          >
            {evaluation.reasoning}
          </p>
          <button
            type="button"
            onClick={() => setShowFullReasoning((open) => !open)}
            className="mt-1 text-xs font-medium text-gray-500 transition-colors duration-150 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            {showFullReasoning ? "Show less" : "Show more"}
          </button>
        </div>
      </div>

      {evaluation.prompt !== null && (
        <footer className="border-t border-gray-100 px-4 py-2 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setShowConstitution((open) => !open)}
            aria-expanded={showConstitution}
            className="flex items-center gap-1 text-xs font-medium text-gray-600 transition-colors duration-150 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ChevronRightIcon
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-150 motion-reduce:transition-none",
                showConstitution && "rotate-90"
              )}
            />
            Constitution
          </button>
          {showConstitution && (
            <p className="mt-2 max-w-prose whitespace-pre-line pb-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {evaluation.prompt}
            </p>
          )}
        </footer>
      )}
    </article>
  );
};

export const SimocracyEvaluationCard = memo(SimocracyEvaluationCardComponent);
