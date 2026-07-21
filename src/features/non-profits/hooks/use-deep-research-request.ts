import { useMutation } from "@tanstack/react-query";
import type { AppError } from "../lib/errors";
import { resultToPromise } from "../lib/result-to-promise";
import {
  type DeepResearchRequestInput,
  philanthropyService,
} from "../services/philanthropy.service";

/**
 * Human-readable message for a deep-research submission failure.
 */
export function deepResearchErrorMessage(error: AppError): string {
  if (error.type === "ApiError" && error.status === 429) {
    return "You've sent a few requests already. Please try again a little later.";
  }
  if ("message" in error && error.message) {
    return error.message;
  }
  return "We couldn't submit your request. Please try again later.";
}

/**
 * Submits a deep-research request via the philanthropy service (indexer).
 */
export function useDeepResearchRequest() {
  return useMutation<{ success: boolean }, AppError, DeepResearchRequestInput>({
    mutationFn: (input) => resultToPromise(philanthropyService.submitDeepResearchRequest(input)),
  });
}
