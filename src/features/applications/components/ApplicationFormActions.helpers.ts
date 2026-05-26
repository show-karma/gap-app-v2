export type ApplicationFormActionsMode =
  | { kind: "login" }
  | {
      kind: "evaluate-or-submit";
      scoringPending: boolean;
      submitting: boolean;
      hasScored: boolean;
    }
  | { kind: "submit"; submitting: boolean }
  | { kind: "hidden" };

export function deriveApplicationFormActionsMode({
  authenticated,
  hasEvalConfig,
  hasScored,
  isDisabled,
  isSubmitting,
  scoringPending,
}: {
  authenticated: boolean;
  hasEvalConfig: boolean;
  hasScored: boolean;
  isDisabled: boolean;
  isSubmitting: boolean;
  scoringPending: boolean;
}): ApplicationFormActionsMode {
  if (!authenticated) return { kind: "login" };
  if (isDisabled) return { kind: "hidden" };
  if (hasEvalConfig) {
    return {
      kind: "evaluate-or-submit",
      scoringPending,
      submitting: isSubmitting,
      hasScored,
    };
  }
  return { kind: "submit", submitting: isSubmitting };
}
