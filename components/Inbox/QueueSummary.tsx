"use client";

import {
  ArrowPathIcon,
  ClipboardDocumentIcon,
  PencilSquareIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import React, { type FC, useState } from "react";
import { requestNoteDraft } from "@/components/Inbox/noteNavigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { ActionItemTarget } from "@/hooks/useActionItems";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useQueueSummary } from "@/hooks/useQueueSummary";
import type { IQueueFollowUpSuggestion } from "@/types/funding-platform";
import { calendarDayToIso } from "@/utilities/calendarDay";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";

interface QueueSummaryProps {
  communityId: string;
  target: ActionItemTarget;
  /** Gate the fetch — the endpoint is community-admin only. */
  enabled?: boolean;
  className?: string;
}

const FollowUpDraft: FC<{ followUp: IQueueFollowUpSuggestion }> = ({ followUp }) => {
  const [message, setMessage] = useState(followUp.message);
  const [, copy] = useCopyToClipboard();
  return (
    <div className="mt-3 border-t border-purple-200/70 pt-3 dark:border-purple-900/50">
      <p className="text-xs font-medium text-gray-700 dark:text-gray-200">
        Suggested follow-up
        <span className="font-normal text-gray-500 dark:text-gray-400">
          {" "}
          · to {followUp.to} · check again{" "}
          {formatDate(calendarDayToIso(followUp.followUpAt), "UTC")}
        </span>
      </p>
      <Textarea
        aria-label="Suggested message"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={4}
        className="mt-1.5 min-h-0 resize-y bg-white leading-relaxed text-gray-800 dark:bg-zinc-900 dark:text-gray-100"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!message.trim()}
          onClick={() => void copy(message, "Message copied")}
        >
          <ClipboardDocumentIcon className="h-4 w-4" aria-hidden="true" />
          Copy message
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            requestNoteDraft({ content: followUp.note, followUpAt: followUp.followUpAt })
          }
        >
          <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
          Use as note
        </Button>
      </div>
    </div>
  );
};

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
  const followUp = summary?.followUp ?? null;

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
                AI summary from the timeline, notes and comments · {formatDate(summary.generatedAt)}
              </p>
              {followUp && <FollowUpDraft key={summary.generatedAt} followUp={followUp} />}
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Get a quick read on where this stands.
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
