/**
 * Helper for detecting the IndexedDB "UnknownError: Internal error." that wallet
 * SDKs leak as an unhandled promise rejection during startup — unactionable
 * third-party noise that should not reach Sentry.
 *
 * Context: Sentry issue GAP-FRONTEND-WS ran at 65 events / 4 users with the
 * signature `UnknownError: Internal error.` (DOMException.code 0, mechanism
 * `onunhandledrejection`, handled:no, no stacktrace). It fires on page load,
 * before any user interaction, across tenants and routes.
 *
 * Root cause: our wallet stack persists connection state to IndexedDB via
 * `idb-keyval` (WalletConnect's `keyvaluestorage`, `@coinbase/wallet-sdk`,
 * `@base-org/account`). The clearest culprit is
 * `@walletconnect/keyvaluestorage`, whose `KeyValueStorage` constructor fires
 * an async localStorage→IndexedDB migration that is neither awaited nor
 * `.catch()`-ed (the surrounding try/catch only guards synchronous throws).
 * When the browser's IndexedDB store is corrupted or unavailable (unclean
 * shutdown, disk I/O error, storage eviction, multi-tab/extension contention)
 * the read rejects with a `DOMException` whose name is `UnknownError` and whose
 * message is "Internal error.", and that rejection escapes to
 * `window.onunhandledrejection`.
 *
 * This is environmental — the user's IndexedDB is degraded — and not actionable
 * from our code (we have no first-party IndexedDB usage; wagmi uses
 * localStorage and React Query has no IDB persister). Filtering it keeps the
 * Sentry feed actionable.
 * See https://karma-crypto-inc.sentry.io/issues/GAP-FRONTEND-WS
 */

function getErrorName(error: unknown): string {
  if (error && typeof error === "object" && "name" in error) {
    const name = (error as { name?: unknown }).name;
    if (typeof name === "string") return name;
  }
  return "";
}

function getErrorMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  return "";
}

/**
 * True when the error is the environmental IndexedDB failure that wallet SDKs
 * leak during startup. Scoped tightly to the observed signature — a
 * `UnknownError` DOMException whose message is "Internal error." — so it never
 * swallows actionable application errors.
 */
export function isIndexedDbInternalError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if (getErrorName(error) !== "UnknownError") return false;
  return getErrorMessage(error).toLowerCase().includes("internal error");
}
