"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fundingApplicationsAPI } from "@/services/fundingPlatformService";

interface UseReEvaluateInternalAIOptions {
  /**
   * Called after the mutation succeeds. Use to refresh local UI state if
   * the parent isn't relying on cache invalidation alone.
   */
  onSuccess?: () => void | Promise<void>;
}

/**
 * Re-run internal AI evaluation for an application. Overwrites any prior
 * internal evaluation with a fresh run against current data + current
 * prompt + current Karma project state (if linked).
 *
 * Invalidates funding-application and applications queries on success so
 * the audit display picks up the new context block automatically.
 */
export function useReEvaluateInternalAI({ onSuccess }: UseReEvaluateInternalAIOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (referenceNumber: string) =>
      fundingApplicationsAPI.runInternalAIEvaluation(referenceNumber),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["funding-application"] });
      await queryClient.invalidateQueries({ queryKey: ["applications"] });
      if (onSuccess) {
        await onSuccess();
      }
    },
  });
}
