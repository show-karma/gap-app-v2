// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { isAttestRetryExhaustedError } from "./utilities/attestWithRetry";
import {
  installChunkRecoveryListeners,
  shouldDropChunkErrorEvent,
} from "./utilities/chunkRecovery";
import { isChunkLoadError } from "./utilities/isChunkLoadError";
import { sentryIgnoreErrors } from "./utilities/sentry/ignoreErrors";
import {
  isTransientHttpError,
  isTransientNetworkError,
  isTransientWalletTimeoutError,
} from "./utilities/sentry/transientErrors";
import { isIndexedDbInternalError } from "./utilities/sentry/walletStorageErrors";

Sentry.init({
  enabled: process.env.NEXT_PUBLIC_VERCEL_ENV === "production",
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  ignoreErrors: sentryIgnoreErrors,
  integrations: [],
  // Defence in depth for transient Axios "Network Error" events that
  // bubble through code paths bypassing `errorManager` (raw React errors,
  // third-party SDK fetches). See DEV-236 / GAP-FRONTEND-13P. Transient
  // upstream gateway timeouts (504 etc.) get the same treatment — see
  // DEV-271 / GAP-FRONTEND-1R1.
  beforeSend(event, hint) {
    const original = hint?.originalException;
    // The exhausted-retry wrapper is actionable and MUST report, even though
    // its `.cause` is a transient wallet timeout that would otherwise be
    // dropped below. Key off the structural flag, not message wording. See
    // GAP-FRONTEND-1Y2 and ./utilities/attestWithRetry.ts
    if (isAttestRetryExhaustedError(original)) {
      return event;
    }
    // Stale-deploy chunk failures: drop while one-time reload recovery is
    // possible/in flight; report only when recovery is exhausted. See
    // GAP-FRONTEND-20T / utilities/chunkRecovery.ts. Deliberately NOT in
    // `sentryIgnoreErrors` — see the note in utilities/sentry/ignoreErrors.ts.
    if (shouldDropChunkErrorEvent(original)) {
      return null;
    }
    if (isChunkLoadError(original)) {
      // Recovery already ran once this session and the chunk still failed —
      // tag as exhausted so surviving events are triage-ready (offline
      // client, blocked chunk, genuine 404 in the new build).
      event.tags = { ...event.tags, chunk_recovery: "exhausted" };
    }
    if (
      isTransientNetworkError(original) ||
      isTransientHttpError(original) ||
      // ethers "could not coalesce error" / "Wallet timeout" surfaced by a
      // transient wallet/bundler blip during attestation. Retried at the send
      // layer, so a recovered timeout never reaches here; this drops the raw
      // signature that leaks through paths bypassing the retry (an un-awaited
      // rejection from an abandoned attempt, a third-party SDK fetch). See
      // GAP-FRONTEND-1Y2 and ./utilities/sentry/transientErrors.ts
      isTransientWalletTimeoutError(original) ||
      // Wallet SDKs (WalletConnect/Coinbase/base-account) leak an un-awaited
      // IndexedDB read rejection on startup when the browser's IDB store is
      // corrupted/unavailable. Environmental and not actionable from our code.
      // See GAP-FRONTEND-WS and ./utilities/sentry/walletStorageErrors.ts
      isIndexedDbInternalError(original)
    ) {
      return null;
    }
    return event;
  },

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 0.01,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});

// Runs as early as possible on the client (before the app's own chunks
// evaluate), so it catches a chunk-load rejection even during initial
// hydration. See GAP-FRONTEND-20T / utilities/chunkRecovery.ts.
installChunkRecoveryListeners();

// Lazy-load Replay after init — keeps ~400KB out of the shared bundle.
// The Replay SDK is fetched on-demand and added to the existing Sentry client.
// The `.catch` below covers any failure in this bootstrap chain — lazy fetch
// (chunk eviction, network blip, ad-blocker, CSP), the factory call, or
// `addIntegration` itself — so optional telemetry never crashes the page.
// The error signature is also filtered via `sentryIgnoreErrors` (defense in
// depth) and we keep a console.warn locally for debugging.
if (typeof window !== "undefined") {
  void Sentry.lazyLoadIntegration("replayIntegration")
    .then((replayIntegration) => {
      if (typeof replayIntegration !== "function") {
        return;
      }

      Sentry.addIntegration(replayIntegration());
    })
    .catch((error) => {
      console.warn("Sentry Replay lazy-load failed:", error);
    });
}

export const onRequestError = Sentry.captureRequestError;
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
