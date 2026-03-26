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
