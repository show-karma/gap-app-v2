/**
 * Typed "no signer yet" states for `useZeroDevSigner`.
 *
 * `wallets === []` for an authenticated user is an expected, usually
 * transient lifecycle state (Privy hasn't hydrated wallets yet, or an
 * embedded wallet is still being provisioned) — not a defect. Signing code
 * used to throw a bare `Error("No wallet available for signing")` the
 * instant it observed this, which `errorManager` reported to Sentry as a
 * bug (GAP-FRONTEND-24N). `SignerUnavailableError` lets callers recognise
 * the state, show actionable guidance, and skip Sentry reporting.
 */

type SignerUnavailableReason =
  /** `walletsReady` from Privy's `useWallets()` is still false after the wait. */
  | "wallets-hydrating"
  /** Email/social login user whose embedded wallet hasn't been created yet. */
  | "embedded-wallet-provisioning"
  /** Wallets are hydrated and the user simply has no usable wallet connected. */
  | "no-wallet-connected";

const REASON_MESSAGES: Record<SignerUnavailableReason, string> = {
  "wallets-hydrating": "Your wallet is still being prepared. Please try again in a moment.",
  "embedded-wallet-provisioning":
    "Your wallet is still being prepared. Please try again in a moment.",
  "no-wallet-connected": "No wallet is connected. Please connect your wallet and try again.",
};

/**
 * Thrown by `getAttestationSigner` when no usable wallet exists after the
 * bounded wait. This is an expected user/lifecycle state, not a defect —
 * callers must show the message as guidance and must NOT report it to
 * Sentry via `errorManager` (which treats `expected === true` as a signal
 * to skip `Sentry.captureException`).
 */
export class SignerUnavailableError extends Error {
  /** Marks this as an expected user/lifecycle state — never report to Sentry. */
  public readonly expected = true as const;

  constructor(public readonly reason: SignerUnavailableReason) {
    super(REASON_MESSAGES[reason]);
    this.name = "SignerUnavailableError";
  }
}

export const isSignerUnavailableError = (error: unknown): error is SignerUnavailableError =>
  error instanceof SignerUnavailableError;
