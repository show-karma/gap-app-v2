"use client";

import { Loader2, Play } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { APPLICATION_TEXT_MAX, sessionEvaluateSchema } from "../schemas/session.schema";
import { useEvaluationDraftStore } from "../store/evaluationDraftStore";

interface ApplicationInputProps {
  sessionId: string;
  onRun: (applicationText: string) => void;
  isRunning: boolean;
  disabled?: boolean;
}

const textareaClass =
  "mt-1 w-full min-h-[220px] rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60";

export function ApplicationInput({ onRun, isRunning, disabled }: ApplicationInputProps) {
  const applicationText = useEvaluationDraftStore((s) => s.applicationText);
  const setApplicationText = useEvaluationDraftStore((s) => s.setApplicationText);
  const [error, setError] = useState<string | null>(null);

  const length = applicationText.length;

  const handleRun = () => {
    const parsed = sessionEvaluateSchema.safeParse({ applicationText });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Invalid application text");
      return;
    }
    setError(null);
    onRun(parsed.data.applicationText);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Sample application</h2>
          <p className="text-sm text-muted-foreground">
            Paste one application text. We’ll run a single evaluation so you can iterate on the
            prompt before going bulk.
          </p>
        </div>
      </div>
      <textarea
        aria-label="Application text"
        className={textareaClass}
        value={applicationText}
        onChange={(e) => setApplicationText(e.target.value.slice(0, APPLICATION_TEXT_MAX))}
        placeholder="Paste an application — proposal text, application form answers, etc."
        disabled={disabled || isRunning}
      />
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-red-500">{error}</span>
        <span className="text-muted-foreground">
          {length}/{APPLICATION_TEXT_MAX}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button onClick={handleRun} disabled={disabled || isRunning || length < 20}>
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Evaluating
            </>
          ) : (
            <>
              <Play className="h-4 w-4" /> Run evaluation
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
