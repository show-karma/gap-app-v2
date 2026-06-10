/**
 * Decides what ChatView's seeding effect should do when it observes a
 * `searchId` from the route. Extracted as a pure function because the
 * surrounding effect mixes three sources of truth (a per-instance ref,
 * the global philanthropy store, and the route param) and the stale
 * combinations are easy to regress — see the fixed bug where a previous
 * session's thread survived client-side navigation and silently swallowed
 * the new session's query.
 */
export type ThreadSeedDecision =
  /** This component instance already seeded this searchId — do nothing. */
  | "already-seeded"
  /** The in-memory thread belongs to this searchId (remount/back-nav) — keep it. */
  | "adopt-existing-thread"
  /** A different session's thread is in the global store — reset it, then seed. */
  | "reset-then-seed"
  /** Store is empty — seed the session's query. */
  | "seed";

export function decideThreadSeed(args: {
  searchId: string;
  /** searchId this component instance last seeded (per-instance ref). */
  seededSearchId: string | null;
  /** Number of turns currently in the global philanthropy store. */
  messageCount: number;
  /** searchId the global store's thread belongs to (null = never seeded). */
  threadId: string | null;
}): ThreadSeedDecision {
  if (args.seededSearchId === args.searchId) return "already-seeded";
  if (args.messageCount > 0) {
    return args.threadId === args.searchId ? "adopt-existing-thread" : "reset-then-seed";
  }
  return "seed";
}
