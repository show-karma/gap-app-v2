"use client";

import { Button } from "@/components/ui/button";

interface ApplicationFormActionsProps {
  authenticated: boolean;
  hasEvalConfig: boolean;
  hasScored: boolean;
  isDisabled: boolean;
  isSubmitting: boolean;
  isScoring: boolean;
  isEvaluating: boolean;
  onCancel?: () => void;
  onLogin: () => void;
  onScore: () => void;
  onRescore: () => void;
}

export function ApplicationFormActions({
  authenticated,
  hasEvalConfig,
  hasScored,
  isDisabled,
  isSubmitting,
  isScoring,
  isEvaluating,
  onCancel,
  onLogin,
  onScore,
  onRescore,
}: ApplicationFormActionsProps) {
  const showAIPrompt = hasEvalConfig && !hasScored && !isDisabled;
  const showScoredActions = hasEvalConfig && hasScored && !isDisabled;
  const showPlainSubmit = !hasEvalConfig && !isDisabled;

  return (
    <div className="mt-6 rounded-lg border bg-card p-4">
      <div className="flex justify-between items-center">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {!authenticated ? (
            <Button type="button" onClick={onLogin}>
              Login to submit
            </Button>
          ) : showAIPrompt ? (
            <div className="flex flex-row gap-2 items-center">
              <Button
                type="button"
                onClick={onScore}
                isLoading={isScoring || isEvaluating}
                disabled={isScoring || isEvaluating}
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
          ) : showScoredActions ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onRescore}
                disabled={isSubmitting || isScoring || isEvaluating}
                isLoading={isScoring || isEvaluating}
                data-testid="rescore-btn"
              >
                {isScoring || isEvaluating ? "Evaluating…" : "Re-evaluate my application"}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isScoring || isEvaluating}
                isLoading={isSubmitting}
                data-testid="submit-application-btn"
              >
                Submit My Application
              </Button>
            </>
          ) : showPlainSubmit ? (
            <Button
              type="submit"
              disabled={isSubmitting}
              isLoading={isSubmitting}
              data-testid="submit-application-btn"
            >
              Submit My Application
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
