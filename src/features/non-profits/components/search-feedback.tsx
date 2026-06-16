"use client";

import { Check, MessageSquare, ThumbsDown, ThumbsUp } from "lucide-react";
import { memo, useCallback, useState } from "react";
import { useSubmitFeedback } from "../hooks/use-feedback";

interface SearchFeedbackProps {
  traceId: string;
}

// Buttons live inside the find-funders `.landing` scope, whose global
// `.landing button` reset strips background/color/border. The `!` utilities
// below restore the platform tokens (brand / destructive) over that reset.
const BTN_BASE =
  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-40";

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
      className="mt-4 overflow-hidden rounded-xl border border-border bg-card !py-0"
    >
      <div
        className={`flex gap-3.5 px-4 py-3 ${
          commentOpen && !submitted ? "items-start" : "items-center"
        }`}
      >
        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
            submitted ? "bg-brand text-white" : "bg-brand/10 text-brand-emphasis"
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
            <output className="block text-sm font-medium text-foreground">
              Thanks for the feedback — it helps us improve search quality.
            </output>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">How were these results?</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Your feedback helps us improve the tool.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleThumbsUp}
                  aria-label="Helpful results"
                  aria-pressed={feedback === "up"}
                  disabled={isSending}
                  className={`${BTN_BASE} ${
                    feedback === "up"
                      ? "!border-brand !bg-brand/10 !text-brand-emphasis"
                      : "!border-border !bg-card !text-muted-foreground hover:!border-brand hover:!text-brand-emphasis"
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
                  className={`${BTN_BASE} ${
                    feedback === "down"
                      ? "!border-destructive !bg-destructive/10 !text-destructive"
                      : "!border-border !bg-card !text-muted-foreground hover:!border-destructive hover:!text-destructive"
                  }`}
                >
                  <ThumbsDown className="size-3.5" aria-hidden="true" />
                  Not helpful
                </button>
              </div>
            </div>
          )}

          {commentOpen && !submitted && (
            <div className="mt-3 border-t border-border pt-3">
              <label
                htmlFor={`search-feedback-comment-${traceId}`}
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
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
                className="w-full resize-none rounded-md border border-border bg-background px-2.5 py-1.5 text-sm !text-foreground placeholder:text-muted-foreground focus:!border-brand focus:outline-none"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelComment}
                  className="rounded-md px-3 py-1.5 text-xs font-medium !text-muted-foreground transition-colors hover:!bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitComment}
                  disabled={isSending}
                  className="rounded-md !bg-brand px-3 py-1.5 text-xs font-medium !text-white transition-colors hover:!bg-brand-emphasis disabled:opacity-40"
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
