/**
 * Window-level complement to the React error-boundary recovery in
 * `isChunkLoadError.ts`.
 *
 * Context: GAP-FRONTEND-20T kept firing after the boundary-based recovery
 * (`app/error.tsx`, `app/global-error.tsx`, `components/ErrorBoundary.tsx`)
 * shipped, because the live event's `mechanism` is `onunhandledrejection` —
 * the Turbopack runtime chunk loader rejects a `Promise.all` (router
 * prefetch, deferred module preloads) outside of any React render, so it
 * never reaches a boundary. This module listens at the `window` level and
 * applies the same one-time-reload recovery, plus gates Sentry reporting so
 * only a *genuinely exhausted* recovery (chunk still fails after the reload)
 * is reported.
 */
import {
  attemptChunkReload,
  hasChunkReloadBeenAttempted,
  isChunkLoadError,
} from "./isChunkLoadError";

// True from the moment THIS pageload triggered the recovery reload until the
// navigation completes. Module-scoped on purpose: it must reset on reload.
let reloadInFlight = false;

/**
 * Handles a chunk failure observed outside React (an unhandled rejection or
 * a window `error` event). Returns `true` when recovery is in flight
 * (reload triggered by this call, or already triggered earlier this
 * pageload) so the caller can suppress default browser logging.
 */
export function handleWindowChunkFailure(reason: unknown): boolean {
  if (!isChunkLoadError(reason)) return false;
  if (attemptChunkReload()) {
    reloadInFlight = true;
  }
  return reloadInFlight;
}

/**
 * Wires the window-level listeners. Call once, as early as possible on the
 * client (see `instrumentation-client.ts`). SSR-safe: no-ops without
 * `window`.
 */
export function installChunkRecoveryListeners(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("unhandledrejection", (event) => {
    if (handleWindowChunkFailure(event.reason)) {
      // Cosmetic only (silences the default "Uncaught (in promise)" console
      // logging); Sentry suppression is authoritative in
      // `shouldDropChunkErrorEvent` below, independent of event ordering.
      event.preventDefault();
    }
  });

  // Belt-and-braces for the `mechanism: onerror` variant of the same error
  // class (siblings GAP-FRONTEND-1XX / 12C): synchronous throws from the
  // chunk runtime that bubble to `window.onerror` instead of a rejection.
  window.addEventListener("error", (event) => {
    handleWindowChunkFailure(event.error ?? event.message);
  });
}

/**
 * Sentry `beforeSend` gate. Drop a chunk-load event iff recovery is still
 * possible or already in flight; keep it when recovery is exhausted (a
 * reload was already attempted this session and the chunk STILL failed) —
 * that is the genuinely-broken case we must see.
 *
 * State-based (not signature-based like `ignoreErrors`) so it distinguishes
 * first-failure (drop, recover) from post-reload failure (report), and is
 * race-free regardless of whether Sentry's own `GlobalHandlers` integration
 * or our `window` listener runs first on the same event:
 * - Sentry first: guard flag not yet set → dropped; our listener then reloads.
 * - Our listener first: `reloadInFlight` set → dropped.
 * - Post-reload repeat failure: guard flag persisted (within TTL),
 *   `attemptChunkReload()` returns `false`, `reloadInFlight` stays `false`
 *   → reported.
 */
export function shouldDropChunkErrorEvent(error: unknown): boolean {
  if (!isChunkLoadError(error)) return false;
  if (reloadInFlight) return true;
  return !hasChunkReloadBeenAttempted();
}

/** Test-only reset of the in-flight flag between test cases. */
export function __resetChunkRecoveryStateForTests(): void {
  reloadInFlight = false;
}
