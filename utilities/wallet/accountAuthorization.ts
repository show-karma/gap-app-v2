/**
 * EIP-1193 `4100 Unauthorized` handling for external (injected) wallets.
 *
 * Privy keeps an external wallet in `useWallets()` from its own persisted
 * connection state, so the linked wallet can be listed while the extension
 * itself refuses to sign for it: MetaMask is locked, or the user disconnected
 * that account from the site (or connected a different one). The signer is
 * built with an explicit `account`, so nothing ever calls `eth_requestAccounts`
 * and the extension never gets a chance to prompt. `eth_estimateGas` still
 * succeeds (it needs no permission), and only `eth_sendTransaction` fails:
 *
 *   MetaMask - RPC Error: The requested account and/or method has not been
 *   authorized by the user. { code: 4100 }
 *
 * ethers wraps that as `could not coalesce error` (code UNKNOWN_ERROR), which
 * `isRetryableChainError` used to read as a transient blip — so the send was
 * retried three times and the user was told to "try again in a moment",
 * advice that cannot work.
 */

import { isUserRejectionError, SignerUnavailableError } from "@/utilities/wallet/signerReadiness";

/** EIP-1193 provider error code: the account/method is not authorized. */
export const EIP1193_UNAUTHORIZED = 4100;

const UNAUTHORIZED_MESSAGE = "has not been authorized by the user";

/** How far to walk a wrapped error's cause chain. */
const MAX_DEPTH = 6;

type Eip1193Requester = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function nestedErrors(error: unknown): unknown[] {
  if (!error || typeof error !== "object") return [];
  const {
    cause,
    originalError,
    error: inner,
    info,
  } = error as {
    cause?: unknown;
    originalError?: unknown;
    error?: unknown;
    info?: { error?: unknown };
  };
  // `cause` (native), `originalError` (karma-gap-sdk SchemaError), `error`
  // (ethers' coalesce wrapper and viem RPC errors) and `info.error` (ethers v6
  // stashes the provider's payload there).
  return [cause, originalError, inner, info?.error].filter(Boolean);
}

function isUnauthorizedNode(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return typeof error === "string" && error.toLowerCase().includes(UNAUTHORIZED_MESSAGE);
  }
  const { code, message } = error as { code?: unknown; message?: unknown };
  if (code === EIP1193_UNAUTHORIZED) return true;
  return typeof message === "string" && message.toLowerCase().includes(UNAUTHORIZED_MESSAGE);
}

/**
 * True when the error (or anything it wraps) is the wallet refusing the
 * account/method — EIP-1193 code 4100, or our typed `account-not-authorized`.
 * Deterministic: resending cannot fix it until the user acts in the wallet.
 */
export function isWalletUnauthorizedError(error: unknown): boolean {
  let frontier = [error];
  for (let depth = 0; depth <= MAX_DEPTH && frontier.length; depth += 1) {
    if (
      frontier.some(
        (node) =>
          (node instanceof SignerUnavailableError && node.reason === "account-not-authorized") ||
          isUnauthorizedNode(node)
      )
    ) {
      return true;
    }
    frontier = frontier.flatMap(nestedErrors);
  }
  return false;
}

function includesAddress(accounts: unknown, address: string): boolean {
  if (!Array.isArray(accounts)) return false;
  const target = address.toLowerCase();
  return accounts.some(
    (account) => typeof account === "string" && account.toLowerCase() === target
  );
}

/**
 * Makes sure the wallet will sign for `address` on this site before we build a
 * signer for it.
 *
 * 1. `eth_accounts` already lists it → nothing to do (no prompt).
 * 2. Otherwise `eth_requestAccounts`, which makes the extension prompt the
 *    user to unlock and/or connect accounts.
 * 3. Still not listed (they connected a different account) → a typed,
 *    expected `SignerUnavailableError("account-not-authorized")` naming the
 *    account, instead of a 4100 at send time.
 *
 * A user cancelling the prompt rethrows the rejection as-is, so callers stay
 * silent the way they do for any other cancelled signature. A provider that
 * cannot answer `eth_accounts` at all is not blocked here — the send itself
 * will surface whatever is actually wrong.
 */
export async function ensureAccountAuthorized(
  provider: Eip1193Requester,
  address: string
): Promise<void> {
  let accounts: unknown;
  try {
    accounts = await provider.request({ method: "eth_accounts" });
  } catch {
    return;
  }
  if (includesAddress(accounts, address)) return;

  let requested: unknown;
  try {
    requested = await provider.request({ method: "eth_requestAccounts" });
  } catch (error) {
    if (isUserRejectionError(error)) throw error;
    throw new SignerUnavailableError("account-not-authorized", address);
  }
  if (includesAddress(requested, address)) return;

  throw new SignerUnavailableError("account-not-authorized", address);
}

/**
 * Maps a failed attestation to the wallet-guidance error the user should see,
 * or `null` when it is not a wallet-authorization state. A typed
 * `SignerUnavailableError` passes through; a raw 4100 from the send itself
 * (the wallet locked between signer setup and `eth_sendTransaction`) becomes
 * `account-not-authorized` naming `address`. The result is `expected`, so
 * `errorManager` keeps it out of Sentry.
 */
export function toWalletGuidanceError(
  error: unknown,
  address?: string | null
): SignerUnavailableError | null {
  if (error instanceof SignerUnavailableError) return error;
  if (isWalletUnauthorizedError(error)) {
    return new SignerUnavailableError("account-not-authorized", address);
  }
  return null;
}
