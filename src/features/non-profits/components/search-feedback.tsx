"use client";

import { Check, MessageSquare, ThumbsDown, ThumbsUp } from "lucide-react";
import { memo, useCallback, useState } from "react";
import { useSubmitFeedback } from "../hooks/use-feedback";

interface SearchFeedbackProps {
  traceId: string;
}

export const SearchFeedback = memo(function SearchFeedback({ traceId }: SearchFeedbackProps) {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { mutate: submitFeedback, isPending: isSending } = useSubmitFeedback();

  const handleThumbsUp = useCallback(() => {
    if (isSending || feedback === "up") return;
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
    if (isSending) return;
    if (feedback === "down") {
      setCommentOpen((v) => !v);
      return;
    }
    setFeedback("down");
    setCommentOpen(true);
    setSubmitted(false);
  }, [isSending, feedback]);

  const handleSubmitComment = useCallback(() => {
    if (isSending) return;
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
    <section
      aria-label="Rate these results"
      className="mt-4 overflow-hidden rounded-xl border border-brand/20 bg-gradient-to-br from-brand-faint via-white to-white dark:border-brand-emphasis/25 dark:from-brand-emphasis/10 dark:via-zinc-900 dark:to-zinc-900"
    >
      <div className="flex items-start gap-3.5 p-4">
        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
            submitted
              ? "bg-brand text-white"
              : "bg-brand/10 text-brand-emphasis dark:bg-brand/15 dark:text-brand-subtle"
          }`}
        >
          {submitted ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <MessageSquare className="size-4" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {submitted ? (
            <output className="block pt-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Thanks for the feedback — it helps us improve search quality.
            </output>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  How were these results?
                </p>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Your rating tunes the prospecting agent.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleThumbsUp}
                  aria-label="Helpful results"
                  aria-pressed={feedback === "up"}
                  disabled={isSending}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                    feedback === "up"
                      ? "border-brand bg-brand/10 text-brand-emphasis dark:border-brand/60 dark:bg-brand/15 dark:text-brand-subtle"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-brand/50 hover:text-brand-emphasis dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-brand/50 dark:hover:text-brand-subtle"
                  }`}
                >
                  <ThumbsUp className="size-3.5" aria-hidden="true" />
                  Helpful
                </button>
                <button
                  type="button"
                  onClick={handleThumbsDown}
                  aria-label="Not helpful results"
                  aria-pressed={feedback === "down"}
                  disabled={isSending}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                    feedback === "down"
                      ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700/60 dark:bg-rose-900/30 dark:text-rose-200"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-rose-300 hover:text-rose-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-rose-700/60 dark:hover:text-rose-200"
                  }`}
                >
                  <ThumbsDown className="size-3.5" aria-hidden="true" />
                  Not helpful
                </button>
              </div>
            </div>
          )}

          {commentOpen && !submitted && (
            <div className="mt-3 border-t border-brand/15 pt-3 dark:border-brand-emphasis/20">
              <label
                htmlFor={`search-feedback-comment-${traceId}`}
                className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-300"
              >
                What was missing or inaccurate? (optional)
              </label>
              <textarea
                id={`search-feedback-comment-${traceId}`}
                aria-label="What was missing or inaccurate?"
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 2000))}
                rows={3}
                maxLength={2000}
                placeholder="Tell us what would have made this better..."
                className="w-full resize-none rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelComment}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitComment}
                  disabled={isSending}
                  className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-emphasis disabled:opacity-40"
                >
                  {isSending ? "Sending..." : "Submit feedback"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
});
