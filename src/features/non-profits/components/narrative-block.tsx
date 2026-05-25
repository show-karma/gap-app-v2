"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { MessageResponse } from "@/src/components/ai-elements/message-response";
import { useSubmitFeedback } from "../hooks/use-feedback";
import { linkifyNarrative } from "../lib/linkify-narrative";
import type { ChatTurn } from "../store/philanthropy";
import type { RankedEntity } from "../types/philanthropy";

interface NarrativeBlockProps {
  narrative: string;
  entities: RankedEntity[];
  traceId: string | null;
  status: ChatTurn["status"];
}

export const NarrativeBlock = memo(function NarrativeBlock({
  narrative,
  entities,
  traceId,
  status,
}: NarrativeBlockProps) {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { mutate: submitFeedback, isPending: isSending } = useSubmitFeedback();

  // Reset feedback UI whenever the traceId changes (new search).
  useEffect(() => {
    setFeedback(null);
    setCommentOpen(false);
    setComment("");
    setSubmitted(false);
  }, [traceId]);

  const linked = useMemo(
    () => (entities.length > 0 ? linkifyNarrative(narrative, entities) : narrative),
    [narrative, entities]
  );

  const showFeedback = Boolean(traceId) && status === "done";

  const handleThumbsUp = useCallback(() => {
    if (!traceId || isSending || feedback === "up") return;
    setFeedback("up");
    setCommentOpen(false);
    submitFeedback(
      { traceId, value: 1 },
      {
        onSuccess: () => setSubmitted(true),
      }
    );
  }, [traceId, isSending, feedback, submitFeedback]);

  const handleThumbsDown = useCallback(() => {
    if (!traceId || isSending) return;
    if (feedback === "down") {
      setCommentOpen((v) => !v);
      return;
    }
    setFeedback("down");
    setCommentOpen(true);
    setSubmitted(false);
  }, [traceId, isSending, feedback]);

  const handleSubmitComment = useCallback(() => {
    if (!traceId || isSending) return;
    submitFeedback(
      { traceId, value: -1, comment },
      {
        onSuccess: () => {
          setSubmitted(true);
          setCommentOpen(false);
          setComment("");
        },
      }
    );
  }, [traceId, isSending, submitFeedback, comment]);

  const handleCancelComment = useCallback(() => {
    setCommentOpen(false);
    setComment("");
    if (!submitted) setFeedback(null);
  }, [submitted]);

  return (
    <div>
      <MessageResponse>{linked}</MessageResponse>
      {showFeedback && (
        <div className="mt-2">
          {submitted && (
            <output className="mb-2 block text-xs text-brand dark:text-brand-subtle">
              Thanks for your feedback!
            </output>
          )}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleThumbsUp}
              aria-label="Helpful"
              aria-pressed={feedback === "up"}
              disabled={isSending}
              className={`rounded-lg p-1.5 transition-colors ${
                feedback === "up"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              }`}
            >
              <ThumbsUp className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={handleThumbsDown}
              aria-label="Not helpful"
              aria-pressed={feedback === "down"}
              disabled={isSending}
              className={`rounded-lg p-1.5 transition-colors ${
                feedback === "down"
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                  : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              }`}
            >
              <ThumbsDown className="size-3.5" />
            </button>
          </div>
          {commentOpen && traceId && (
            <div className="mt-2 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <label
                htmlFor={`feedback-comment-${traceId}`}
                className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-300"
              >
                What went wrong? (optional)
              </label>
              <textarea
                id={`feedback-comment-${traceId}`}
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 2000))}
                rows={2}
                maxLength={2000}
                placeholder="Tell us what was missing or inaccurate..."
                className="w-full resize-none rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-brand focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelComment}
                  className="rounded-md px-2.5 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitComment}
                  disabled={isSending}
                  className="rounded-md bg-brand px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-brand-emphasis disabled:opacity-40"
                >
                  {isSending ? "Sending..." : "Submit"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
