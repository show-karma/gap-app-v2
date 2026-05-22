// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { sentryIgnoreErrors } from "./utilities/sentry/ignoreErrors";
import { isTransientHttpError, isTransientNetworkError } from "./utilities/sentry/transientErrors";

Sentry.init({
  enabled: process.env.NEXT_PUBLIC_VERCEL_ENV === "production",
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  ignoreErrors: sentryIgnoreErrors,
  // Drop transient indexer outages that crash SSR. A 504 (and the rest of
  // the 5xx gateway family) from `NEXT_PUBLIC_GAP_INDEXER_URL` during a
  // server render bubbles up here as a minified `Request failed with status
  // code 504` with no actionable first-party frame. The page still throws to
  // its `error.tsx` retry boundary for the user — we just keep the unfixable
  // (frontend-side) noise out of Sentry. Mirrors the client-side filter in
  // `instrumentation-client.ts`. See DEV-271 / GAP-FRONTEND-1R1.
  beforeSend(event, hint) {
    const original = hint?.originalException;
    if (isTransientNetworkError(original) || isTransientHttpError(original)) {
      return null;
    }
    return event;
  },
  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 0.01,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
