"use client";

import { Button } from "@/components/ui/button";
import type { ApplicationFormActionsMode } from "./ApplicationFormActions.helpers";

interface ApplicationFormActionsProps {
  mode: ApplicationFormActionsMode;
  onCancel?: () => void;
  onLogin: () => void;
  onScore: () => void;
  onRescore: () => void;
  onSaveDraft?: () => void;
  savingDraft?: boolean;
}

export function ApplicationFormActions({
  mode,
  onCancel,
  onLogin,
  onScore,
  onRescore,
  onSaveDraft,
  savingDraft = false,
}: ApplicationFormActionsProps) {
  const canSubmit = mode.kind === "submit" || mode.kind === "evaluate-or-submit";
  const showSaveDraft = onSaveDraft !== undefined && canSubmit;
  const submitting = canSubmit && mode.submitting;

  return (
    <div className="mt-6 rounded-lg border bg-card p-4">
      <div className="flex justify-between items-center">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {showSaveDraft && (
            <Button
              type="button"
              variant="outline"
              onClick={onSaveDraft}
              isLoading={savingDraft}
              disabled={savingDraft || submitting}
              data-testid="save-draft-btn"
            >
              Save draft
            </Button>
          )}

          {mode.kind === "login" && (
            <Button type="button" onClick={onLogin}>
              Login to submit
            </Button>
          )}

          {mode.kind === "evaluate-or-submit" && (
            <div className="flex flex-row gap-2 items-center">
              <Button
                type="button"
                variant={mode.hasScored ? "outline" : "default"}
                onClick={mode.hasScored ? onRescore : onScore}
                isLoading={mode.scoringPending}
                disabled={mode.scoringPending || mode.submitting}
                data-testid={mode.hasScored ? "rescore-btn" : "get-ai-feedback-btn"}
              >
                {mode.hasScored
                  ? mode.scoringPending
                    ? "Evaluating…"
                    : "Re-evaluate my application"
                  : "Get AI Feedback"}
              </Button>
              <button
                type="button"
                aria-label="You'll see feedback and can make changes before submitting."
                title="You'll see feedback and can make changes before submitting."
                className="flex items-center font-bold justify-center w-5 h-5 rounded-full border border-gray-400 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-xs cursor-help focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              >
                ?
              </button>
              <Button
                type="submit"
                disabled={mode.submitting || mode.scoringPending || savingDraft}
                isLoading={mode.submitting}
                data-testid="submit-application-btn"
              >
                Submit My Application
              </Button>
            </div>
          )}

          {mode.kind === "submit" && (
            <Button
              type="submit"
              disabled={mode.submitting || savingDraft}
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
