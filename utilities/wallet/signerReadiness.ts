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

/**
 * Signing readiness for UI gating — the single source of truth for the union
 * that `useZeroDevSigner`/`useSetupChainAndWallet` expose as `signerStatus` and
 * that the attestation submit controls gate on. Import this instead of
 * re-declaring the literal union per file.
 */
export type SignerStatus = "initializing" | "ready" | "no-wallet";

type SignerUnavailableReason =
  /** `walletsReady` from Privy's `useWallets()` is still false after the wait. */
  | "wallets-hydrating"
  /** Email/social login user whose embedded wallet hasn't been created yet. */
  | "embedded-wallet-provisioning"
  /** Wallets are hydrated and the user simply has no usable wallet connected. */
  | "no-wallet-connected"
  /**
   * The wallet extension has not authorized the signing account for this site
   * (EIP-1193 code 4100): it is locked, or the account linked to the login is
   * not among the accounts connected to this origin.
   */
  | "account-not-authorized";

const REASON_MESSAGES: Record<SignerUnavailableReason, string> = {
  "wallets-hydrating": "Your wallet is still being prepared. Please try again in a moment.",
  "embedded-wallet-provisioning":
    "Your wallet is still being prepared. Please try again in a moment.",
  "no-wallet-connected": "No wallet is connected. Please connect your wallet and try again.",
  "account-not-authorized":
    "Your wallet hasn't authorized this site to use the account you signed in with. Unlock your wallet, connect or switch to that account, and try again.",
};

function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

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

  constructor(
    public readonly reason: SignerUnavailableReason,
    /** The account the wallet must expose, when known — named in the message. */
    address?: string | null
  ) {
    super(
      reason === "account-not-authorized" && address
        ? `Your wallet hasn't authorized this site to use the account you signed in with (${shortAddress(address)}). Unlock your wallet, connect or switch to that account, and try again.`
        : REASON_MESSAGES[reason]
    );
    this.name = "SignerUnavailableError";
  }
}

export const isSignerUnavailableError = (error: unknown): error is SignerUnavailableError =>
  error instanceof SignerUnavailableError;

/**
 * True when an error is a user-initiated wallet rejection (they cancelled the
 * signature). `errorManager` already stays silent for these — it early-returns
 * on `errorContains(error, "reject")` — so a centralized attestation error
 * handler must skip its "Failed to …" toast too, otherwise a user who
 * deliberately cancelled sees a failure they caused on purpose. Mirrors
 * errorManager's substring check (plus the common wagmi/viem `ACTION_REJECTED`
 * code and MetaMask "user denied" phrasing).
 */
export const isUserRejectionError = (error: unknown): boolean => {
  const e = error as
    | {
        code?: string | number;
        message?: string;
        originalError?: { code?: string | number; message?: string };
      }
    | null
    | undefined;
  const haystack = [e?.code, e?.message, e?.originalError?.code, e?.originalError?.message]
    .map((v) => (v == null ? "" : String(v)))
    .join(" ")
    .toLowerCase();
  return (
    haystack.includes("reject") ||
    haystack.includes("user denied") ||
    haystack.includes("action_rejected") ||
    haystack.includes("4001")
  );
};
