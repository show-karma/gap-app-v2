"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { runKarmaProfileEvaluation } from "@/services/karmaProfileEvaluationService";

interface UseReEvaluateKarmaProfileAIOptions {
  onSuccess?: () => void | Promise<void>;
}

/**
 * Re-run Karma Profile (track-record) AI evaluation for an application.
 * Overwrites the prior verdict with a fresh run against the latest
 * aggregator output + latest Langfuse prompt. The backend short-circuits
 * (no LLM call, just an `evaluatedAt` bump) when the content fingerprint
 * matches the prior completed evaluation.
 *
 * Invalidates funding-application + applications queries on success so the
 * Insights tab picks up the new verdict automatically.
 */
export function useReEvaluateKarmaProfileAI({
  onSuccess,
}: UseReEvaluateKarmaProfileAIOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (referenceNumber: string) =>
      runKarmaProfileEvaluation(referenceNumber),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["funding-application"] });
      await queryClient.invalidateQueries({ queryKey: ["applications"] });
      if (onSuccess) {
        await onSuccess();
      }
    },
  });
}
