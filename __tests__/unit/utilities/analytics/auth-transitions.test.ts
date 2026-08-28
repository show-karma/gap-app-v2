/**
 * @file Tests for the pending-logout record (utilities/analytics/auth-transitions.ts).
 *
 * A recorded reason is a claim about a session that has not ended yet and might
 * never end. Every case here is one of the ways that claim can turn out to be
 * wrong: the logout rejects, two guards fire at once, the session survives, or
 * the transition that finally arrives belongs to somebody else.
 */

import {
  __resetPendingLogoutReasonForTests,
  abandonLogout,
  beginLogout,
  PENDING_TTL_MS,
  takePendingLogoutReason,
} from "@/utilities/analytics/auth-transitions";

const ALICE = "did:privy:alice";
const BOB = "did:privy:bob";

describe("auth-transitions", () => {
  beforeEach(() => {
    __resetPendingLogoutReasonForTests();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("recording a cause", () => {
    it("hands the recorded reason to the matching transition", () => {
      beginLogout("cross_tab", ALICE);

      expect(takePendingLogoutReason(ALICE)).toBe("cross_tab");
    });

    it("defaults to the user when nothing was recorded", () => {
      expect(takePendingLogoutReason(ALICE)).toBe("user");
    });

    it("reads once, so the next transition does not inherit it", () => {
      beginLogout("wallet_disconnect", ALICE);

      expect(takePendingLogoutReason(ALICE)).toBe("wallet_disconnect");
      expect(takePendingLogoutReason(ALICE)).toBe("user");
    });

    it("matches a record made before the identity was known", () => {
      // A guard that fired while Privy was still resolving can only be about
      // the session that was live at the time.
      beginLogout("cross_tab", null);

      expect(takePendingLogoutReason(ALICE)).toBe("cross_tab");
    });
  });

  describe("first live cause wins", () => {
    it("keeps the first reason when two guards fire in the same tick", () => {
      // Two hook instances deciding at once are describing the same session
      // ending. Which effect React happened to run last is not a fact about
      // anything, so last-writer-wins was picking arbitrarily.
      beginLogout("wallet_disconnect", ALICE);
      beginLogout("cross_tab", ALICE);

      expect(takePendingLogoutReason(ALICE)).toBe("wallet_disconnect");
    });

    it("tells the loser it has no claim", () => {
      expect(beginLogout("wallet_disconnect", ALICE)).not.toBeNull();
      expect(beginLogout("cross_tab", ALICE)).toBeNull();
    });

    it("lets the next session record freely once the slot is consumed", () => {
      beginLogout("wallet_disconnect", ALICE);
      takePendingLogoutReason(ALICE);

      beginLogout("cross_tab", BOB);
      expect(takePendingLogoutReason(BOB)).toBe("cross_tab");
    });
  });

  describe("a logout that did not happen", () => {
    it("retracts the reason when the attempt is abandoned", () => {
      const attempt = beginLogout("wallet_reconnect", ALICE);
      abandonLogout(attempt);

      expect(takePendingLogoutReason(ALICE)).toBe("user");
    });

    it("ignores a retraction from an attempt that never held the slot", () => {
      // The losing guard's `logout()` rejecting must not delete the winning
      // guard's still-valid cause.
      beginLogout("wallet_disconnect", ALICE);
      const loser = beginLogout("cross_tab", ALICE);

      abandonLogout(loser);

      expect(takePendingLogoutReason(ALICE)).toBe("wallet_disconnect");
    });

    it("ignores a retraction of a reason a transition already consumed", () => {
      const attempt = beginLogout("wallet_disconnect", ALICE);
      expect(takePendingLogoutReason(ALICE)).toBe("wallet_disconnect");

      abandonLogout(attempt);
      beginLogout("cross_tab", ALICE);

      expect(takePendingLogoutReason(ALICE)).toBe("cross_tab");
    });

    it("does not label a later transition with a cause that expired", () => {
      vi.useFakeTimers();
      beginLogout("wallet_disconnect", ALICE);

      vi.advanceTimersByTime(PENDING_TTL_MS + 1);

      expect(takePendingLogoutReason(ALICE)).toBe("user");
    });

    it("still honours a cause within the window", () => {
      vi.useFakeTimers();
      beginLogout("wallet_disconnect", ALICE);

      vi.advanceTimersByTime(PENDING_TTL_MS - 1);

      expect(takePendingLogoutReason(ALICE)).toBe("wallet_disconnect");
    });

    it("frees the slot once a cause has expired", () => {
      vi.useFakeTimers();
      beginLogout("wallet_disconnect", ALICE);
      vi.advanceTimersByTime(PENDING_TTL_MS + 1);

      expect(beginLogout("cross_tab", ALICE)).not.toBeNull();
      expect(takePendingLogoutReason(ALICE)).toBe("cross_tab");
    });
  });

  describe("a cause belonging to another identity", () => {
    it("is not borrowed by a different user's transition", () => {
      // Alice's guard fired, her logout never landed, and Bob signs out an hour
      // later. Bob's exit is not a cross-tab logout.
      beginLogout("cross_tab", ALICE);

      expect(takePendingLogoutReason(BOB)).toBe("user");
    });

    it("is discarded rather than left for the next transition", () => {
      beginLogout("cross_tab", ALICE);
      takePendingLogoutReason(BOB);

      expect(takePendingLogoutReason(ALICE)).toBe("user");
    });

    it("is not borrowed by a signed-out transition with no identity", () => {
      beginLogout("cross_tab", ALICE);

      expect(takePendingLogoutReason(null)).toBe("user");
    });
  });
});
