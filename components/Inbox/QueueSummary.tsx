"use client";

import { ArrowPathIcon, SparklesIcon } from "@heroicons/react/24/outline";
import React, { type FC, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActionItemTarget } from "@/hooks/useActionItems";
import { useQueueSummary } from "@/hooks/useQueueSummary";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";

interface QueueSummaryProps {
  communityId: string;
  target: ActionItemTarget;
  /** Gate the fetch — the endpoint is community-admin only. */
  enabled?: boolean;
  className?: string;
}

/**
 * Two sentences on why the item is where it is, above the full timeline and
 * follow-up log, for the admin who does not have time to read either.
 *
 * Nothing is written until the admin asks: the model call costs money and
 * most items are opened without needing it.
 */
const QueueSummaryComponent: FC<QueueSummaryProps> = ({
  communityId,
  target,
  enabled = true,
  className,
}) => {
  const [requested, setRequested] = useState(false);
  const { summary, isLoading, error, refetch, refresh, isRefreshing } = useQueueSummary(
    communityId,
    target,
    { enabled: enabled && requested }
  );

  return (
    <section
      aria-label="AI summary"
      className={cn(
        "rounded-lg border border-purple-200 bg-purple-50/60 px-4 py-3 dark:border-purple-900/50 dark:bg-purple-900/10",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <SparklesIcon
          className="mt-0.5 h-4 w-4 shrink-0 text-purple-600 dark:text-purple-300"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          {isLoading ? (
            <div className="space-y-2" aria-busy="true">
              <Skeleton className="h-3.5 w-11/12" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
          ) : error ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Couldn&apos;t generate the summary.
              </p>
              <Button variant="link" size="sm" className="h-auto p-0" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : summary ? (
            <>
              <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-100">
                {summary.summary}
              </p>
              <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                AI summary from the timeline and notes · {formatDate(summary.generatedAt)}
              </p>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                See what is blocking this and who owes the next step.
              </p>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-purple-700 dark:text-purple-300"
                onClick={() => setRequested(true)}
              >
                Summarize
              </Button>
            </div>
          )}
        </div>
        {summary && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Regenerate summary"
            title="Regenerate from the current facts"
            onClick={() => refresh()}
            disabled={isLoading || isRefreshing}
            className="shrink-0 text-gray-400 hover:text-purple-700 dark:text-zinc-500 dark:hover:text-purple-300"
          >
            <ArrowPathIcon
              className={cn("h-4 w-4", isRefreshing && "animate-spin motion-reduce:animate-none")}
              aria-hidden="true"
            />
          </Button>
        )}
      </div>
    </section>
  );
};

export const QueueSummary = React.memo(QueueSummaryComponent);
QueueSummary.displayName = "QueueSummary";
