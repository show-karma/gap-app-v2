"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { errorManager } from "@/components/Utilities/errorManager";

export default function UpdatesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    errorManager("Community updates page error", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl py-12">
      <div
        role="alert"
        className="flex flex-col items-center gap-4 rounded-xl border border-border p-8 text-center"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t load the community updates. Please try again.
        </p>
        {error.digest ? (
          <p className="text-xs text-muted-foreground">Error ID: {error.digest}</p>
        ) : null}
        <button
          type="button"
          onClick={() => reset()}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      </div>
    </div>
  );
}
