"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";
import { attemptChunkReload, isChunkLoadError } from "@/utilities/isChunkLoadError";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  const recovering = isChunkLoadError(error);

  useEffect(() => {
    // Stale-deploy chunk failures are recoverable via a one-time hard reload
    // that pulls the fresh build manifest. Attempt that first; only report to
    // Sentry when recovery is not applicable (or already exhausted) so the
    // dashboard reflects non-recoverable failures.
    if (recovering && attemptChunkReload()) {
      return;
    }
    Sentry.captureException(error);
  }, [error, recovering]);

  return (
    <html lang="en">
      <body>
        {/* `NextError` is the default Next.js error page component. Its type
        definition requires a `statusCode` prop. However, since the App Router
        does not expose status codes for errors, we simply pass 0 to render a
        generic error message. */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
