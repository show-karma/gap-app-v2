import axios from "axios";

/**
 * Narrows an unknown caught value to the most informative human-readable
 * message available, preferring the backend's domain message.
 *
 * Resolution order:
 *   1. Axios error -> `response.data.message` (the API's domain-specific copy),
 *      falling back to the axios `message` (e.g. "Network Error").
 *   2. Any other `Error` -> its `message`.
 *   3. Anything else (string, null, undefined, plain object) -> `fallback`.
 *
 * Used by the funding-application evaluation buttons so every trigger surfaces
 * the same backend error copy instead of re-implementing axios narrowing inline.
 */
export function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message ?? fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

/**
 * Thrown when an eligibility check finds a conflict with an existing enrollment
 * (HTTP 409 from the eligibility API).
 */
export class EligibilityConflictError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message = "Eligibility conflict: the address is already enrolled in a conflicting program",
    code = "ELIGIBILITY_CONFLICT"
  ) {
    super(message);
    this.name = "EligibilityConflictError";
    this.status = 409;
    this.code = code;
  }
}
