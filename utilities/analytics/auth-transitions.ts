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
 * — of which exactly one is mounted — emits the event on the authenticated
 * true→false transition. The reason is read once and cleared, so a later
 * unrelated logout cannot inherit it.
 *
 * Module-level rather than context: it is written from effects and from the
 * returned `logout` callback, both of which run outside React's render, and it
 * only ever holds a value for the few milliseconds between the decision and the
 * transition landing.
 */

let pendingReason: LogoutReason | null = null;

/**
 * Records why the session that is about to end is ending. Last writer wins:
 * when two guards fire in the same tick the more specific one runs later, and
 * either way only one event is emitted.
 */
export const setPendingLogoutReason = (reason: LogoutReason): void => {
  pendingReason = reason;
};

/**
 * Reads and clears the reason. Defaults to `"user"` — a session ending with no
 * recorded cause is one the user ended themselves, which is the only path that
 * does not go through an internal guard.
 */
export const takePendingLogoutReason = (): LogoutReason => {
  const reason = pendingReason ?? "user";
  pendingReason = null;
  return reason;
};

/** Test-only: forget a reason recorded by a previous case. */
export const __resetPendingLogoutReasonForTests = (): void => {
  pendingReason = null;
};
