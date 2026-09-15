import "./utilities/env";
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Next calls this hook from the server instrumentation file only. It was
// previously exported from instrumentation-client.ts, where Next never reads
// it, so server-render errors (every 500 on an RSC page) never reached Sentry.
export const onRequestError = Sentry.captureRequestError;
