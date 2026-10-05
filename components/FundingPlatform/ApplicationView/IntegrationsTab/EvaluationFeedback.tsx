"use client";

import { HandThumbDownIcon, HandThumbUpIcon } from "@heroicons/react/24/outline";
import { type FC, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  useSimocracyFeedback,
  useSubmitSimocracyFeedback,
} from "@/hooks/useApplicationIntegrations";
import {
  feedbackMatchesSubject,
  type SimocracyEvaluationFeedback,
  type SimocracyFeedbackSubject,
  type SimocracyFeedbackVerdict,
} from "@/services/fundingApplicationIntegrations.service";
import { shortAddress } from "@/utilities/shortAddress";
import { cn } from "@/utilities/tailwind";

interface EvaluationFeedbackProps {
  referenceNumber: string;
  subject: SimocracyFeedbackSubject;
  simUri: string;
  /** True when the viewer owns this sim or is a program admin. */
  canGiveFeedback: boolean;
  /**
   * The verdict version on screen. Notes left on other versions are listed
   * with their version instead of reading as if they were about this one.
   */
  currentRevision?: number;
}

function ownFeedback(
  all: SimocracyEvaluationFeedback[],
  simUri: string,
  addresses: Set<string>
): SimocracyEvaluationFeedback | undefined {
  return all.find((entry) => entry.simUri === simUri && addresses.has(entry.authorAddress));
}

function onRevision(entry: SimocracyEvaluationFeedback, revision: number | undefined): boolean {
  return revision === undefined || entry.revision == null || entry.revision === revision;
}

export const EvaluationFeedback: FC<EvaluationFeedbackProps & { viewerAddresses: Set<string> }> = ({
  referenceNumber,
  subject,
  simUri,
  canGiveFeedback,
  viewerAddresses,
  currentRevision,
}) => {
  // A run has its own query; verdict comments share the application-wide
  // one so a long comment list costs a single request.
  const { data: feedback } = useSimocracyFeedback(
    referenceNumber,
    "runId" in subject ? subject : "all"
  );
  const submit = useSubmitSimocracyFeedback(referenceNumber, subject);

  const forSim = (feedback ?? []).filter(
    (entry) => entry.simUri === simUri && feedbackMatchesSubject(entry, subject)
  );
  const saved = ownFeedback(forSim, simUri, viewerAddresses);
  // A vote cast on an earlier version is history, not a pre-filled answer.
  const mine = saved && onRevision(saved, currentRevision) ? saved : undefined;

  // Drafts sit on top of the saved entry; null means "not edited yet".
  const [draftVerdict, setDraftVerdict] = useState<SimocracyFeedbackVerdict | null>(null);
  const [draftComment, setDraftComment] = useState<string | null>(null);
  const verdict = draftVerdict ?? mine?.verdict ?? null;
  const comment = draftComment ?? mine?.comment ?? "";

  const othersFeedback = forSim.filter(
    (entry) => !viewerAddresses.has(entry.authorAddress) || entry !== mine
  );

  // A vote without a note tells the Sim nothing, so both go together on Save.
  const canSave = verdict !== null && comment.trim().length > 0 && !submit.isPending;
  const handleSave = () => {
    if (!verdict || !canSave) return;
    submit.mutate({ simUri, verdict, comment: comment.trim(), revision: currentRevision });
  };

  if (!canGiveFeedback && othersFeedback.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 border-t border-gray-100 pt-3 dark:border-zinc-700">
      {canGiveFeedback && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Your feedback
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Represented faithfully"
              aria-pressed={verdict === "up"}
              onClick={() => setDraftVerdict("up")}
              disabled={submit.isPending}
              className={cn(
                "h-7 w-7 shadow-none",
                verdict === "up"
                  ? "border-green-300 bg-green-50 text-green-600 dark:border-green-800/50 dark:bg-green-900/20 dark:text-green-400"
                  : "border-gray-200 text-gray-400 hover:text-gray-600 dark:border-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
              )}
            >
              <HandThumbUpIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Not represented faithfully"
              aria-pressed={verdict === "down"}
              onClick={() => setDraftVerdict("down")}
              disabled={submit.isPending}
              className={cn(
                "h-7 w-7 shadow-none",
                verdict === "down"
                  ? "border-red-300 bg-red-50 text-red-600 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-400"
                  : "border-gray-200 text-gray-400 hover:text-gray-600 dark:border-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
              )}
            >
              <HandThumbDownIcon className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Textarea
              value={comment}
              onChange={(event) => setDraftComment(event.target.value)}
              placeholder="Add a note to improve the Sim's evaluation"
              aria-label="Feedback note"
              rows={2}
              className="min-h-0 resize-y py-1.5 text-xs"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!canSave}
              title={canSave ? undefined : "Pick thumbs up or down and write a note"}
              className="shrink-0 text-xs"
            >
              Save feedback
            </Button>
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
              <span className="min-w-0 whitespace-pre-wrap">
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
                {entry.revision != null && !onRevision(entry, currentRevision) && (
                  <span className="ml-1.5 text-gray-400 dark:text-gray-500">
                    on v{entry.revision}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
