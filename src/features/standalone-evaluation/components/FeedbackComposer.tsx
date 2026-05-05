"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { FEEDBACK_MAX, sessionFeedbackSchema } from "../schemas/session.schema";

interface FeedbackComposerProps {
  hasSample: boolean;
  isPending: boolean;
  // Awaited so a failed mutation preserves the typed feedback.
  onSubmit: (feedback: string) => void | Promise<void>;
}

const textareaClass =
  "mt-1 w-full min-h-[100px] rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60";

export function FeedbackComposer({ hasSample, isPending, onSubmit }: FeedbackComposerProps) {
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  const handleSubmit = async () => {
    const parsed = sessionFeedbackSchema.safeParse({ feedback });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Invalid feedback");
      return;
    }
    setError(null);
    try {
      await onSubmit(parsed.data.feedback);
      setFeedback("");
    } catch {
      // Parent surfaces the error via the mutation; keep the input.
    }
  };

  if (!hasSample) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
        <p>
          Run an initial evaluation on a sample application above to start iterating with feedback.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold text-foreground">Send feedback</h3>
      <p className="text-xs text-muted-foreground">
        Tell the model what to weight differently. We’ll re-run on the same sample application you
        submitted.
      </p>
      <textarea
        aria-label="Feedback"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={textareaClass}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value.slice(0, FEEDBACK_MAX))}
        placeholder="e.g. Penalise applications without a clear team bio. Reward measurable KPIs."
        disabled={isPending}
      />
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span id={errorId} role="alert" className="text-red-500">
          {error}
        </span>
        <span className="text-muted-foreground">
          {feedback.length}/{FEEDBACK_MAX}
        </span>
      </div>
      <div className="mt-3">
        <Button onClick={handleSubmit} disabled={isPending || feedback.length < 5}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Re-evaluating
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" /> Re-evaluate
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
