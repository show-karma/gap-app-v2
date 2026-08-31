/**
 * Collision-free stable id for a *newly added* diligence question. Existing
 * questions keep their server-issued id untouched, so collected answers stay
 * keyed correctly across edits. Never index-based, and avoids the
 * Math.random/Date.now patterns flagged by the anti-pattern rules.
 */
let fallbackIdCounter = 0;

export function makeQuestionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  fallbackIdCounter += 1;
  return `dq-${fallbackIdCounter.toString(36)}`;
}
