import { OUTREACH_BODY_LIMITS } from "@/types/diligence";

/**
 * Why an edited outreach body is invalid for sending, mirroring the backend's
 * `OutreachActionBodySchema` (trimmed, 1..10,000 chars). `null` means the body
 * is sendable.
 */
export function getOutreachBodyIssue(body: string): "empty" | "over_limit" | null {
  const trimmedLength = body.trim().length;
  if (trimmedLength === 0) return "empty";
  if (trimmedLength > OUTREACH_BODY_LIMITS.MAX_CHARS) return "over_limit";
  return null;
}
