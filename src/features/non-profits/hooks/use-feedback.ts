import { useMutation } from "@tanstack/react-query";
import { resultToPromise } from "../lib/result-to-promise";
import { philanthropyService } from "../services/philanthropy.service";

interface FeedbackVariables {
  traceId: string;
  value: 1 | -1;
  comment?: string;
}

/**
 * Hook for submitting narrative feedback (thumbs up / thumbs down).
 * Feedback is best-effort and fire-and-forget — no cache invalidation.
 */
export function useSubmitFeedback() {
  return useMutation({
    mutationFn: ({ traceId, value, comment }: FeedbackVariables) =>
      resultToPromise(philanthropyService.submitFeedback(traceId, value, comment)),
  });
}
