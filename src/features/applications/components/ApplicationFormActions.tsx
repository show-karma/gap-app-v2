"use client";

import { Button } from "@/components/ui/button";

type ActionsMode =
  | { kind: "login" }
  | { kind: "score-prompt"; busy: boolean }
  | { kind: "scored"; busy: boolean; submitting: boolean }
  | { kind: "submit"; submitting: boolean }
  | { kind: "hidden" };

interface ApplicationFormActionsProps {
  mode: ActionsMode;
  onCancel?: () => void;
  onLogin: () => void;
  onScore: () => void;
  onRescore: () => void;
}

export function ApplicationFormActions({
  mode,
  onCancel,
  onLogin,
  onScore,
  onRescore,
}: ApplicationFormActionsProps) {
  return (
    <div className="mt-6 rounded-lg border bg-card p-4">
      <div className="flex justify-between items-center">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {mode.kind === "login" && (
            <Button type="button" onClick={onLogin}>
              Login to submit
            </Button>
          )}

          {mode.kind === "score-prompt" && (
            <div className="flex flex-row gap-2 items-center">
              <Button
                type="button"
                onClick={onScore}
                isLoading={mode.busy}
                disabled={mode.busy}
                data-testid="get-ai-feedback-btn"
              >
                Get AI Feedback
              </Button>
              <span
                className="flex items-center font-bold justify-center w-5 h-5 rounded-full border border-gray-400 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-xs cursor-help"
                title="You'll see feedback and can make changes before submitting."
              >
                ?
              </span>
            </div>
          )}

          {mode.kind === "scored" && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onRescore}
                disabled={mode.submitting || mode.busy}
                isLoading={mode.busy}
                data-testid="rescore-btn"
              >
                {mode.busy ? "Evaluating…" : "Re-evaluate my application"}
              </Button>
              <Button
                type="submit"
                disabled={mode.submitting || mode.busy}
                isLoading={mode.submitting}
                data-testid="submit-application-btn"
              >
                Submit My Application
              </Button>
            </>
          )}

          {mode.kind === "submit" && (
            <Button
              type="submit"
              disabled={mode.submitting}
              isLoading={mode.submitting}
              data-testid="submit-application-btn"
            >
              Submit My Application
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function deriveApplicationFormActionsMode({
  authenticated,
  hasEvalConfig,
  hasScored,
  isDisabled,
  isSubmitting,
  isScoring,
  isEvaluating,
}: {
  authenticated: boolean;
  hasEvalConfig: boolean;
  hasScored: boolean;
  isDisabled: boolean;
  isSubmitting: boolean;
  isScoring: boolean;
  isEvaluating: boolean;
}): ActionsMode {
  if (!authenticated) return { kind: "login" };
  if (hasEvalConfig && !hasScored && !isDisabled) {
    return { kind: "score-prompt", busy: isScoring || isEvaluating };
  }
  if (hasEvalConfig && hasScored && !isDisabled) {
    return { kind: "scored", busy: isScoring || isEvaluating, submitting: isSubmitting };
  }
  if (!isDisabled) return { kind: "submit", submitting: isSubmitting };
  return { kind: "hidden" };
}
