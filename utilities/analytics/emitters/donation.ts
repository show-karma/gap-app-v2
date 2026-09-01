/**
 * Donation analytics emitters.
 *
 * The onramp path has no mutation that resolves on success: Stripe settles out
 * of band, and the status poll is where the browser first learns the outcome.
 * So the emit hangs off the fetch that carries that outcome rather than off an
 * effect watching the hook's props — an effect there reads the caller's props
 * to decide a side effect, which is the shape React Doctor's `no-event-handler`
 * objects to, and "move it to the parent" would scatter one emit across every
 * screen that polls a donation.
 *
 * Deduping lives here for the same reason. The query refetches until the status
 * is terminal, so the outcome arrives many times; a funnel that counted every
 * poll would be meaningless. Keyed by donation uid, module-scoped so it holds
 * across the remounts a checkout screen goes through.
 */

import { track } from "@/utilities/analytics/client";

/** Donations whose terminal outcome has already been reported this session. */
const reported = new Set<string>();

/** The subset of a donation response these emitters read. */
interface DonationOutcome {
  status?: string | null;
}

/**
 * Reports a donation that has reached a terminal state, once per uid.
 *
 * `isCompleted` / `isFailed` are passed in rather than compared here: the
 * caller owns the `DonationStatus` enum and its terminal-state predicate, and
 * duplicating that mapping is how the two drift apart.
 */
export function emitDonationOutcomeOnce(input: {
  donationUid: string | null | undefined;
  chainId: number;
  isCompleted: boolean;
  isFailed: boolean;
}): void {
  const { donationUid, chainId, isCompleted, isFailed } = input;
  if (!donationUid || reported.has(donationUid)) return;
  if (!isCompleted && !isFailed) return;
  reported.add(donationUid);

  if (isCompleted) {
    track("donation_completed", {
      project_count: 1,
      currencies: [],
      chain_ids: [chainId],
      used_onramp: true,
    });
    return;
  }
  track("donation_failed", {
    project_count: 1,
    used_onramp: true,
    error_code: "onramp_settlement_failed",
  });
}

/** Test-only: forget the uids a previous case reported. */
export const __resetDonationOutcomesForTests = (): void => {
  reported.clear();
};

export type { DonationOutcome };
