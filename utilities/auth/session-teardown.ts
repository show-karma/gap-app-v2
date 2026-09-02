/**
 * Ending a Privy session, and the guard that keeps one user switch to one action.
 *
 * Extracted from `useAuth`, which mounts at ~100 call sites. That fan-out is
 * the whole reason this machinery exists — every mounted instance observes the
 * same transition, so anything that reacts to one has to be deduplicated in
 * module state rather than in a ref — and it is also why the logic does not
 * belong inside the hook body, where it is re-created per instance and buries
 * the hook's actual job.
 *
 * Nothing here touches React. The hook supplies Privy's `logout` and a way to
 * ask for a re-render; everything else is plain state and sequencing.
 */

import {
  abandonLogout,
  beginLogout,
  cancelQueuedLogoutReason,
  type LogoutAttempt,
  queueLogoutReason,
} from "@/utilities/analytics/auth-transitions";
import type { LogoutReason } from "@/utilities/analytics/events";

/**
 * How long a resolved `logout()` is given to actually end the session.
 *
 * Privy resolves the promise and flips `authenticated` in a render after it, so
 * the two are not simultaneous. Long enough for that render to commit under
 * load; short enough that a cause which ended nothing cannot still be sitting
 * there when the user does something else.
 */
const LOGOUT_TRANSITION_GRACE_MS = 250;

/**
 * How many times the forced teardown is attempted before giving up.
 *
 * Bounded because the failure mode being retried is Privy refusing to end the
 * session: if it refuses twice it will keep refusing, and an unbounded retry
 * turns one bad switch into a loop that calls logout() forever. Two attempts
 * covers the transient case and nothing else.
 */
const MAX_USER_SWITCH_LOGOUT_ATTEMPTS = 2;

/**
 * The guards cannot await their own logout — they run inside effects and
 * timers. `runLogout` has already retracted the recorded cause by the time this
 * runs, so there is nothing further to do or report here.
 */
// SUPPRESSED: handled inside runLogout; a failed internal logout is not
// separately actionable at the guard.
export const ignoreLogoutFailure = (): void => undefined;

interface RunLogoutOptions {
  /**
   * Called when the attempt turns out to have ended nothing — `logout()`
   * rejected, or resolved and left the session standing.
   */
  onInert?: () => void;
  /**
   * Whether a failed attempt retracts the cause it recorded. True everywhere
   * except the user switch, where the cause describes a session Privy had
   * already ended before the attempt began.
   */
  retractOnFailure?: boolean;
}

type RunLogout = (
  reason: LogoutReason,
  userId: string | null,
  options?: RunLogoutOptions
) => Promise<void>;

/**
 * Records the cause, ends the session, and retracts the cause if the session
 * turns out to have survived.
 *
 * `AnalyticsProvider` emits the single `logout` event on the transition —
 * `useAuth` has ~100 call sites, and emitting there produced one event per
 * mounted instance.
 *
 * `isStillAuthenticated` is read AFTER the grace period rather than captured,
 * so it must be a live read of the bridge and not a snapshot.
 */
export function createRunLogout(
  logout: () => Promise<void>,
  isStillAuthenticated: () => boolean
): RunLogout {
  return async (reason, userId, options = {}) => {
    const { onInert, retractOnFailure = true } = options;
    const attempt = beginLogout(reason, userId);

    const inert = () => {
      if (retractOnFailure) abandonLogout(attempt);
      onInert?.();
    };

    try {
      await logout();
    } catch (error) {
      inert();
      throw error;
    }
    setTimeout(() => {
      if (isStillAuthenticated()) inert();
    }, LOGOUT_TRANSITION_GRACE_MS);
  };
}

/**
 * The switch this process is currently tearing down, if any.
 *
 * Without one shared record, each mounted `useAuth` calls logout() for the same
 * swap — and each records its own cause, leaving stale duplicates behind that
 * outlive the transition they described. One switch is one action.
 *
 * It also survives the attempt, because a teardown can fail: `attempts` is what
 * lets a failure be retried without letting it be retried forever, and
 * `inFlight` is what stops an unrelated re-render from firing a second logout
 * while the first is still outstanding.
 */
interface PendingUserSwitch {
  /** `<from>-><to>`. Identifies the switch across re-renders. */
  key: string;
  /** The session that ended. `user.id` has already advanced past it. */
  departing: string;
  /** The session Privy handed over, and the one being torn down. */
  arriving: string;
  attempts: number;
  inFlight: boolean;
}

// Client-only: only ever written inside an effect or its continuation, so there
// is no SSR request bleed.
let pendingUserSwitch: PendingUserSwitch | null = null;

/** The teardown landed, or the session ended some other way — nothing to retry. */
export const clearPendingUserSwitch = (): void => {
  pendingUserSwitch = null;
};

/**
 * Notes a switch so the teardown below can find it, and reports whether this
 * call is the one that noted it.
 *
 * DETECTION is separate from the ATTEMPT because a retry cannot re-detect:
 * `prevUserIdRef` advances to B at the end of the caller's effect, so by the
 * time a failed teardown asks to be tried again the switch no longer looks like
 * one. The record remembers it instead.
 *
 * Returns true only for the first sighting, so the caller can do its once-per-
 * switch cache clearing without repeating it on every retry.
 */
export function recordUserSwitch(departing: string, arriving: string): boolean {
  const key = `${departing}->${arriving}`;
  if (pendingUserSwitch?.key === key) return false;
  pendingUserSwitch = { key, departing, arriving, attempts: 0, inFlight: false };
  return true;
}

/**
 * Takes the pending switch if it is this user's, is not already being torn
 * down, and has attempts left. Marks it in flight; the caller must hand the
 * result to {@link runUserSwitchTeardown}.
 */
export function claimUserSwitchTeardown(
  currentUserId: string | undefined
): PendingUserSwitch | null {
  const active = pendingUserSwitch;
  if (
    !active ||
    currentUserId !== active.arriving ||
    active.inFlight ||
    active.attempts >= MAX_USER_SWITCH_LOGOUT_ATTEMPTS
  ) {
    return null;
  }
  active.attempts += 1;
  active.inFlight = true;
  return active;
}

/**
 * Tears down the session Privy handed over, so the app re-initialises for
 * whoever is now signed in.
 *
 * A switch ends TWO sessions, and both are the same event to a reader.
 *
 * The first is A's, and it ended at the swap: Privy had already moved `user` on
 * to B, so the cause is bound to the departing id the record kept. Recording
 * the current one would attribute A's exit to B. It is recorded by the FIRST
 * attempt only — recording it again on a retry leaves a second, stale cause for
 * a session that is long gone, and B's teardown then reads that instead of its
 * own.
 *
 * The second is B's. Privy hands B over and this tears that session down so the
 * app can re-initialise, which the provider would otherwise report as an
 * ordinary `"user"` sign-out that B never performed. So the teardown is
 * labelled too — queued rather than recorded outright, because whether this
 * continuation runs before or after the provider consumes A's cause depends on
 * how React batches the commit, and a queued successor is promoted either way.
 *
 * The teardown may not happen: `logout()` can reject, or resolve and leave B
 * signed in. B is then authenticated with A's caches already cleared, so the
 * attempt is released for another try via `requestRetry`, and the successor
 * cause is dropped — it described a teardown that did not occur. A's cause is
 * NOT retracted: Privy ended A's session before any of this ran, and no failure
 * of ours can un-end it.
 */
export function runUserSwitchTeardown(
  active: PendingUserSwitch,
  runLogout: RunLogout,
  requestRetry: () => void
): void {
  let successor: LogoutAttempt = null;

  const releaseAttempt = () => {
    cancelQueuedLogoutReason(successor);
    successor = null;
    if (pendingUserSwitch !== active) return;
    active.inFlight = false;
    requestRetry();
  };

  void runLogout("user_switch", active.attempts === 1 ? active.departing : null, {
    onInert: releaseAttempt,
    retractOnFailure: false,
  })
    .then(() => {
      successor = queueLogoutReason("user_switch", active.arriving);
    })
    .catch(ignoreLogoutFailure);
}

/**
 * Test-only: forget a switch a previous case acted on.
 *
 * Module state outlives a test, so without this the second case to drive a
 * `user-1 -> user-2` switch finds the guard already holding it and silently
 * does nothing — the test then passes or fails on what ran before it. The
 * counterpart to `__resetPendingLogoutReasonForTests` in `auth-transitions`,
 * which exists for the same reason.
 */
export const __resetUserSwitchGuardForTests = (): void => {
  pendingUserSwitch = null;
};
