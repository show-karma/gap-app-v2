"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fundingApplicationsAPI } from "@/services/fundingPlatformService";

interface UseRunAIEvaluationOptions {
  /**
   * When true, runs the internal (reviewer-only) evaluation instead of the
   * applicant-facing one. Mirrors the `isInternal` prop on AIEvaluationButton.
   */
  isInternal?: boolean;
  /**
   * Called after the mutation succeeds AND the funding-application/applications
   * caches have been invalidated. Use to refresh local UI state if the parent
   * isn't relying on cache invalidation alone.
   */
  onSuccess?: () => void | Promise<void>;
}

/**
 * First-run trigger for an application's AI evaluation. Dispatches to the
 * internal or applicant-facing endpoint based on `isInternal`. This is the
 * fourth member of the evaluation-mutation family (alongside
 * `useReEvaluateKarmaProfileAI` and `useReEvaluateInternalAI`); used when no
 * evaluation record exists yet and the destructive-overwrite confirmation
 * dialog isn't needed.
 *
 * Invalidates funding-application and applications queries on success so the
 * Insights/Internal tabs pick up the new verdict through the cache rather than
 * relying solely on the optional callback.
 */
export function useRunAIEvaluation({
  isInternal = false,
  onSuccess,
}: UseRunAIEvaluationOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (referenceNumber: string) =>
      isInternal
        ? fundingApplicationsAPI.runInternalAIEvaluation(referenceNumber)
        : fundingApplicationsAPI.runAIEvaluation(referenceNumber),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["funding-application"] });
      await queryClient.invalidateQueries({ queryKey: ["applications"] });
      if (onSuccess) {
        await onSuccess();
      }
    },
  });
}
