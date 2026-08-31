/**
 * Detects the "duelling wallet extensions" failure mode.
 *
 * When two extensions both want `window.ethereum`, each wraps the other's
 * `request` in a `Proxy` and the two wrappers delegate to each other forever.
 * A single ordinary dapp call then detonates the JS stack:
 *
 *   injectLeap.js (eG.request) -> inject.chrome.<id>.js (Object.apply)
 *     -> injectLeap.js (eG.request) -> ... -> RangeError
 *
 * That `RangeError` is what reaches us, and its most important property is
 * what it LACKS: a `RangeError` has no `code`. Privy's connector normaliser
 * keeps an error's RPC `code` when there is one and otherwise returns a bare
 * `ConnectorError("Unknown connector error")`, dropping the original. ethers
 * then has nothing to switch on and produces `could not coalesce error`
 * (`code: "UNKNOWN_ERROR"`), and the SDK wraps that into a constant
 * `ATTEST_ERROR` message. By the time the failure surfaces, every layer has
 * discarded the one fact that identified it.
 *
 * Two consequences this module exists to fix:
 *
 *  1. The failure is DETERMINISTIC, not transient. The user in
 *     GAP-FRONTEND-23J retried by hand and failed identically 45s later.
 *     Retrying, and telling the user to "try again", cannot work — the
 *     browser is broken, not the network.
 *  2. It is recoverable by a route that never touches the poisoned global:
 *     WalletConnect or an embedded wallet.
 *
 * Sentry's `beforeSend` separately drops the extensions' OWN crashes (stacks
 * with zero first-party frames) — see `utilities/sentry/browserExtensionErrors.ts`
 * / GAP-FRONTEND-26Q. That filter is correct, but it means the failure we DO
 * see (the attestation error) is now the only signal left, so it has to carry
 * the classification itself.
 *
 * See GAP-FRONTEND-23J, and 26K / 26N / 26Q for the underlying recursion.
 */

/**
 * The engine's own words for a blown stack. Matched only in combination with
 * the wallet-call context (see `isProviderConflictError`'s doc comment) —
 * never as a standalone "this is noise" signal, because a genuine runaway
 * recursion in our own code reads identically and must stay visible.
 */
const CALL_STACK_FRAGMENT = "maximum call stack size exceeded";

/** How far to walk a wrapped error's cause chain. */
const MAX_CAUSE_DEPTH = 5;

function getMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "";
}

function getName(error: unknown): string {
  if (error && typeof error === "object" && "name" in error) {
    const name = (error as { name?: unknown }).name;
    if (typeof name === "string") return name;
  }
  return "";
}

/**
 * Wrapped errors in this codebase nest through two different properties:
 * `cause` (native / `AttestRetryExhaustedError`) and `originalError`
 * (karma-gap-sdk's `SchemaError`). Walk both.
 */
function getNested(error: unknown): unknown[] {
  if (!error || typeof error !== "object") return [];
  const nested: unknown[] = [];
  const {
    cause,
    originalError,
    error: inner,
  } = error as {
    cause?: unknown;
    originalError?: unknown;
    error?: unknown;
  };
  if (cause) nested.push(cause);
  if (originalError) nested.push(originalError);
  // ethers stashes the provider's original throw on `.error` inside its
  // "could not coalesce" wrapper.
  if (inner) nested.push(inner);
  return nested;
}

function isStackOverflow(error: unknown): boolean {
  if (typeof RangeError === "function" && error instanceof RangeError) return true;
  if (getName(error) === "RangeError") return true;
  return getMessage(error).toLowerCase().includes(CALL_STACK_FRAGMENT);
}

/**
 * True when this error (or anything it wraps) is a blown JS stack.
 *
 * Intended for errors thrown OUT OF A WALLET PROVIDER CALL — the attestation
 * send path. In that context a stack overflow has exactly one plausible
 * source: mutually-recursive injected providers. Do not reuse this as a
 * general-purpose Sentry filter; a runaway recursion in application code
 * produces the same `RangeError` and must keep reporting.
 */
export function isProviderConflictError(error: unknown): boolean {
  let frontier = [error];
  for (let depth = 0; depth <= MAX_CAUSE_DEPTH && frontier.length; depth += 1) {
    if (frontier.some(isStackOverflow)) return true;
    frontier = frontier.flatMap(getNested);
  }
  return false;
}

export interface InjectedProviderConflict {
  /** How many distinct injected providers announced themselves. */
  count: number;
  /** Human-readable wallet names, best-effort, for the recovery message. */
  names: string[];
}

/**
 * Names announced via EIP-6963. Extensions dispatch these synchronously in
 * response to `eip6963:requestProvider`, so a listener installed once and left
 * in place accumulates every wallet on the page.
 */
const announcedWallets = new Map<string, string>();
let discoveryStarted = false;

interface Eip6963AnnounceEvent extends Event {
  detail?: { info?: { uuid?: string; name?: string } };
}

/**
 * Installs the EIP-6963 listener and asks any injected wallet to announce
 * itself. Safe to call repeatedly and on every render path — the listener is
 * installed at most once, and the request event is cheap.
 *
 * Call this early (wallet connect surfaces, attestation forms) so the names
 * are already collected by the time an error needs to explain itself.
 */
export function startInjectedProviderDiscovery(): void {
  if (discoveryStarted || typeof window === "undefined") return;
  discoveryStarted = true;

  window.addEventListener("eip6963:announceProvider", (event: Event) => {
    const info = (event as Eip6963AnnounceEvent).detail?.info;
    if (info?.uuid && info.name) {
      announcedWallets.set(info.uuid, info.name);
    }
  });

  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

/**
 * Legacy multi-injection tell: when several extensions race for
 * `window.ethereum`, some of them expose the losers on `.providers`. Read the
 * well-known `isX` flags off each entry for a usable name.
 */
const LEGACY_PROVIDER_FLAGS: ReadonlyArray<[string, string]> = [
  ["isMetaMask", "MetaMask"],
  ["isBackpack", "Backpack"],
  ["isLeap", "Leap"],
  ["isRabby", "Rabby"],
  ["isPhantom", "Phantom"],
  ["isBraveWallet", "Brave Wallet"],
  ["isCoinbaseWallet", "Coinbase Wallet"],
  ["isTrust", "Trust Wallet"],
  ["isOkxWallet", "OKX Wallet"],
];

function legacyProviderNames(): string[] {
  if (typeof window === "undefined") return [];
  const ethereum = (window as { ethereum?: { providers?: unknown } }).ethereum;
  const providers = ethereum?.providers;
  if (!Array.isArray(providers)) return [];

  return providers.map((provider) => {
    const match = LEGACY_PROVIDER_FLAGS.find(
      ([flag]) => !!(provider as Record<string, unknown>)?.[flag]
    );
    return match ? match[1] : "an unidentified wallet extension";
  });
}

/**
 * Returns conflict details when more than one injected wallet is present, and
 * `null` otherwise. Never throws: a page with no wallet, a sandboxed iframe,
 * or a browser that blocks the globals all read as "no conflict".
 *
 * A conflict here is a RISK, not a diagnosis — plenty of people run two
 * wallets without incident. Use it to make the recovery message concrete
 * ("conflicting with Leap"), not to decide that something failed.
 */
export function detectInjectedProviderConflict(): InjectedProviderConflict | null {
  if (typeof window === "undefined") return null;

  try {
    startInjectedProviderDiscovery();

    const names = new Set<string>([...announcedWallets.values(), ...legacyProviderNames()]);
    if (names.size < 2) return null;

    return { count: names.size, names: [...names].sort() };
  } catch {
    // SUPPRESSED: provider globals are attacker-adjacent territory — a wallet
    // extension can define `window.ethereum` as a throwing getter. Detection
    // is a nice-to-have on an error path; never let it mask the real failure.
    return null;
  }
}

/**
 * The user-facing recovery message for a detected conflict. Names the wallets
 * when we know them, because "a conflict" is not something anyone can act on.
 */
export function describeProviderConflict(conflict: InjectedProviderConflict | null): string {
  const suffix =
    "Disable the extra wallet extensions and reload, or connect with WalletConnect instead.";

  if (!conflict) {
    return `Your wallet extension crashed before the transaction could be signed. Nothing was submitted. ${suffix}`;
  }

  return `Your wallet extensions are conflicting with each other (${conflict.names.join(
    ", "
  )}), which crashed the request before it could be signed. Nothing was submitted. ${suffix}`;
}
