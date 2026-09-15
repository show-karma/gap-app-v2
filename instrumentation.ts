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
// it, so the errors Next reports through this hook (a server render that ends
// in a 500, with no client boundary left to report it) never reached Sentry.
export const onRequestError = Sentry.captureRequestError;
