import type { LogoutReason } from "./events";

/**
 * Carries *why* a session ended from wherever it was decided to the one place
 * that reports it.
 *
 * `useAuth` has around a hundred call sites, so a hundred instances of the hook
 * mount at once and every one of them runs the same effects. When each ended a
 * session by emitting `logout` itself, one sign-out produced one event per
 * mounted instance — the reason was right, the count was nonsense.
 *
 * So the sites that *decide* only record the reason here, and `AnalyticsProvider`
 * — of which exactly one is mounted — emits the event on the transition.
 *
 * A bare "last writer wins" module variable was not enough, because a recorded
 * reason is a claim about a session that has not ended yet and might never end:
 *
 *   - `logout()` can reject. The session survives, and the cause stays behind
 *     to mislabel whichever transition happens next.
 *   - `logout()` can RESOLVE and still end nothing — Privy ignores the call, or
 *     the session is already gone. Same leak, without an error to notice.
 *   - Two guards can fire in the same tick from different hook instances. Under
 *     last-writer-wins the surviving reason is whichever effect React happened
 *     to run last, which is not a fact about anything.
 *
 * So a record is bound to the identity it is about and to one attempt, the
 * FIRST live cause wins, only the attempt that made a record may retract it,
 * the caller retracts as soon as it can see the session survived, and anything
 * still unclaimed after {@link PENDING_TTL_MS} is treated as never having
 * happened.
 *
 * Module-level rather than context: it is written from effects and from the
 * returned `logout` callback, both of which run outside React's render.
 */

/**
 * Backstop for a record nobody ever claims or retracts.
 *
 * The caller retracts a resolved-but-inert logout itself (see `useAuth`), so
 * reaching this means the attempt neither ended a session nor came back at all
 * — a tab closed mid-flight, a promise that never settles. Short enough that
 * such a cause cannot still be sitting there when the user signs out by hand.
 */
export const PENDING_TTL_MS = 10_000;

interface PendingLogout {
  reason: LogoutReason;
  /** The Privy user id of the session being ended. Never null — see below. */
  userId: string;
  token: number;
  expiresAt: number;
}

/**
 * A claim on the pending slot. Handed back by {@link beginLogout} to the caller
 * that actually made the record; a caller that lost the race, or that had no
 * identity to record against, gets `null` and has nothing to retract.
 */
export type LogoutAttempt = { token: number } | null;

let pending: PendingLogout | null = null;
let nextToken = 1;

const now = (): number => Date.now();

/** Drops a record nothing claimed in time, so a stale cause cannot be read. */
const live = (): PendingLogout | null => {
  if (pending && pending.expiresAt <= now()) pending = null;
  return pending;
};

/**
 * Records why the session belonging to `userId` is ending, and claims the
 * pending slot for this attempt.
 *
 * First live cause wins. When two guards fire in the same tick they are
 * describing the same session ending, and the second one arriving later says
 * nothing about which is the real cause — so the one that got there first is
 * kept rather than overwritten.
 *
 * A `null` userId records NOTHING. A cause with no identity attached cannot be
 * matched to the session it describes, and treating it as matching everybody
 * is how it ends up labelling a stranger's sign-out an hour later. A guard that
 * fires before Privy has resolved the user therefore lets the event fall back
 * to `"user"`, which is the honest answer: nobody can say whose session it was.
 *
 * Returns the attempt when this call made the record, `null` otherwise.
 */
export const beginLogout = (reason: LogoutReason, userId: string | null): LogoutAttempt => {
  if (!userId) return null;
  if (live()) return null;
  const token = nextToken++;
  pending = { reason, userId, token, expiresAt: now() + PENDING_TTL_MS };
  return { token };
};

/**
 * Retracts a record because the logout it described did not happen — `logout()`
 * rejected, or it resolved and left the session standing.
 *
 * Only the attempt that made the record can retract it, so a losing caller's
 * failure cannot delete the winning caller's still-valid cause, and a retraction
 * that arrives after some transition already consumed the slot cannot delete
 * whatever has been recorded since.
 */
export const abandonLogout = (attempt: LogoutAttempt): void => {
  if (!attempt) return;
  if (pending?.token === attempt.token) pending = null;
};

/**
 * Reads and clears the reason for the session that just ended.
 *
 * `departingUserId` is the identity the provider had settled on before the
 * transition. The match is exact: a record for anyone else is not about this
 * transition — it belongs to a session that never ended — so it is discarded
 * rather than borrowed.
 *
 * Defaults to `"user"`: a session ending with no recorded cause is one the user
 * ended themselves, which is the only path that does not go through an internal
 * guard.
 */
export const takePendingLogoutReason = (departingUserId: string | null): LogoutReason => {
  const record = live();
  pending = null;
  if (!record) return "user";
  if (record.userId !== departingUserId) return "user";
  return record.reason;
};

/** Test-only: forget a reason recorded by a previous case. */
export const __resetPendingLogoutReasonForTests = (): void => {
  pending = null;
};
