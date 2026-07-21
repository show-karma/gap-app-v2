"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect, useRef } from "react";
import { errorManager } from "@/components/Utilities/errorManager";

interface RouteErrorFallbackProps {
  /** The error captured by the Next.js route-level error boundary. */
  error: Error & { digest?: string };
  /** Re-render the route segment from scratch (provided by Next.js). */
  reset: () => void;
  /**
   * Human-readable name of the route segment that failed, e.g. "Grant completion".
   * Used both in the recovery copy and as the Sentry context label.
   */
  sectionName: string;
}

/**
 * Shared recovery UI for App Router `error.tsx` boundaries.
 *
 * Every route-level `error.tsx` should be a thin wrapper around this component
 * so failures stay localized to their segment (keeping surrounding layout
 * chrome intact) and report through the same Sentry path via `errorManager`.
 *
 * Because this sits inside the failing segment's parent layout, it preserves
 * the project header / tab navigation instead of bubbling to the root boundary.
 */
export function RouteErrorFallback({ error, reset, sectionName }: RouteErrorFallbackProps) {
  // Report exactly once per error instance. React 18 strict-mode double-invokes
  // effects in dev, so guard against a duplicate Sentry event.
  const reportedFor = useRef<Error | null>(null);

  useEffect(() => {
    if (reportedFor.current === error) return;
    reportedFor.current = error;
    errorManager(`${sectionName} route error`, error, {
      digest: error.digest,
      section: sectionName,
    });
  }, [error, sectionName]);

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <div
        role="alert"
        className="flex flex-col items-center gap-4 rounded-xl border border-border p-8 text-center"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">
          The {sectionName} section failed to load. This is usually temporary.
        </p>
        {error.digest ? (
          <p className="text-xs text-muted-foreground">Error ID: {error.digest}</p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Try again
        </button>
      </div>
    </div>
  );
}
