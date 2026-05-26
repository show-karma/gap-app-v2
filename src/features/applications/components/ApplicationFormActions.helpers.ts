export type ApplicationFormActionsMode =
  | { kind: "login" }
  | { kind: "score-prompt"; busy: boolean }
  | { kind: "scored"; busy: boolean; submitting: boolean }
  | { kind: "submit"; submitting: boolean }
  | { kind: "hidden" };

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
}): ApplicationFormActionsMode {
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
