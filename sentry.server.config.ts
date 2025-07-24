// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { sentryIgnoreErrors } from "./utilities/sentry/ignoreErrors";

Sentry.init({
  enabled: process.env.NEXT_PUBLIC_VERCEL_ENV === "production",
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  ignoreErrors: sentryIgnoreErrors,
  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 0.01,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
