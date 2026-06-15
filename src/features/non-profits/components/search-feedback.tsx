"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
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
      className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      {submitted ? (
        <output className="flex items-center gap-2 text-sm font-medium text-brand dark:text-brand-subtle">
          <ThumbsUp className="size-4" aria-hidden="true" />
          Thanks for the feedback, it helps us improve search quality.
        </output>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              How were these results?
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
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
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 ${
                feedback === "up"
                  ? "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-900/40 dark:text-emerald-200"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-emerald-700/60 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-200"
              }`}
            >
              <ThumbsUp className="size-4" aria-hidden="true" />
              Helpful
            </button>
            <button
              type="button"
              onClick={handleThumbsDown}
              aria-label="Not helpful results"
              aria-pressed={feedback === "down"}
              disabled={isSending}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 ${
                feedback === "down"
                  ? "border-red-300 bg-red-100 text-red-800 dark:border-red-700/60 dark:bg-red-900/40 dark:text-red-200"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-red-700/60 dark:hover:bg-red-900/30 dark:hover:text-red-200"
              }`}
            >
              <ThumbsDown className="size-4" aria-hidden="true" />
              Not helpful
            </button>
          </div>
        </div>
      )}
      {commentOpen && !submitted && (
        <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
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
            className="w-full resize-none rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-brand focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
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
    </section>
  );
});
