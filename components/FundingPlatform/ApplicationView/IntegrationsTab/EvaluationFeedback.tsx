"use client";

import { HandThumbDownIcon, HandThumbUpIcon } from "@heroicons/react/24/outline";
import { type FC, useEffect, useState } from "react";
import {
  useSimocracyFeedback,
  useSubmitSimocracyFeedback,
} from "@/hooks/useApplicationIntegrations";
import type {
  SimocracyEvaluationFeedback,
  SimocracyFeedbackVerdict,
} from "@/services/fundingApplicationIntegrations.service";
import { shortAddress } from "@/utilities/shortAddress";
import { cn } from "@/utilities/tailwind";

export interface EvaluationFeedbackProps {
  referenceNumber: string;
  runId: string;
  simUri: string;
  /** True when the viewer owns this sim or is a program admin. */
  canGiveFeedback: boolean;
}

function ownFeedback(
  all: SimocracyEvaluationFeedback[],
  simUri: string,
  addresses: Set<string>
): SimocracyEvaluationFeedback | undefined {
  return all.find((entry) => entry.simUri === simUri && addresses.has(entry.authorAddress));
}

export const EvaluationFeedback: FC<EvaluationFeedbackProps & { viewerAddresses: Set<string> }> = ({
  referenceNumber,
  runId,
  simUri,
  canGiveFeedback,
  viewerAddresses,
}) => {
  const { data: feedback } = useSimocracyFeedback(referenceNumber, runId);
  const submit = useSubmitSimocracyFeedback(referenceNumber, runId);

  const forSim = (feedback ?? []).filter((entry) => entry.simUri === simUri);
  const mine = ownFeedback(feedback ?? [], simUri, viewerAddresses);

  const [verdict, setVerdict] = useState<SimocracyFeedbackVerdict | null>(null);
  const [comment, setComment] = useState("");

  useEffect(() => {
    setVerdict(mine?.verdict ?? null);
    setComment(mine?.comment ?? "");
  }, [mine?.verdict, mine?.comment]);

  const othersFeedback = forSim.filter((entry) => !viewerAddresses.has(entry.authorAddress));

  const handleSubmit = (nextVerdict: SimocracyFeedbackVerdict) => {
    setVerdict(nextVerdict);
    submit.mutate({
      simUri,
      verdict: nextVerdict,
      comment: comment.trim() || undefined,
    });
  };

  if (!canGiveFeedback && othersFeedback.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 border-t border-gray-100 pt-3 dark:border-zinc-700">
      {canGiveFeedback && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
              Your feedback
            </span>
            <button
              type="button"
              aria-label="Represented faithfully"
              aria-pressed={verdict === "up"}
              onClick={() => handleSubmit("up")}
              disabled={submit.isPending}
              className={cn(
                "rounded-md border p-1.5 transition-colors disabled:opacity-50",
                verdict === "up"
                  ? "border-green-300 bg-green-50 text-green-600 dark:border-green-800/50 dark:bg-green-900/20 dark:text-green-400"
                  : "border-gray-200 text-gray-400 hover:text-gray-600 dark:border-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
              )}
            >
              <HandThumbUpIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Not represented faithfully"
              aria-pressed={verdict === "down"}
              onClick={() => handleSubmit("down")}
              disabled={submit.isPending}
              className={cn(
                "rounded-md border p-1.5 transition-colors disabled:opacity-50",
                verdict === "down"
                  ? "border-red-300 bg-red-50 text-red-600 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-400"
                  : "border-gray-200 text-gray-400 hover:text-gray-600 dark:border-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
              )}
            >
              <HandThumbDownIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Add a note (optional)"
              className="block w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-gray-700 dark:bg-zinc-900 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
            <button
              type="button"
              onClick={() => verdict && handleSubmit(verdict)}
              disabled={!verdict || submit.isPending}
              className="shrink-0 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              Save note
            </button>
          </div>
        </div>
      )}

      {othersFeedback.length > 0 && (
        <div className={cn("space-y-1.5", canGiveFeedback && "mt-3")}>
          {othersFeedback.map((entry) => (
            <div
              key={entry.authorAddress}
              className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300"
            >
              {entry.verdict === "up" ? (
                <HandThumbUpIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
              ) : (
                <HandThumbDownIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400" />
              )}
              <span className="min-w-0">
                {entry.authorName ? (
                  <span className="font-medium text-gray-700 dark:text-gray-200">
                    {entry.authorName}
                  </span>
                ) : (
                  <span className="font-mono text-gray-500 dark:text-gray-400">
                    {shortAddress(entry.authorAddress)}
                  </span>
                )}
                {entry.comment ? ` — ${entry.comment}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
