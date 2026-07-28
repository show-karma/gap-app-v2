/**
 * Who is operating the per-candidate diligence actions.
 *
 * - `"owner"` — the report's advisor, acting for themselves.
 * - `"staff"` — a super-admin acting AS the report's owner. Every report-scoped
 *   diligence endpoint resolves to the owner's advisor row, so the buttons and
 *   the outreach they send are identical; the nonprofit only ever sees the
 *   owner's identity.
 *
 * The one place the two diverge is the Connect email-capture recovery: it
 * persists a reply-to address onto the advisor's shared contributor profile
 * (global Karma identity, not report data), so only the owner may run it.
 */
export type DiligenceViewer = "owner" | "staff";
