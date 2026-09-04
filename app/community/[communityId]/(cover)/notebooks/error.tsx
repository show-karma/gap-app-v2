"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/src/components/navigation/Link";

export default function NotebooksError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl py-12">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          Couldn&apos;t load this page&apos;s configuration
        </h1>
        {/* Name what actually failed. Saying "community not found" when the
            community plainly exists sends people to look at community data
            instead of at the configuration service — it misdirected debugging
            twice already. */}
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t load this community&apos;s notebook list. The community itself is fine —
          it&apos;s the notebook configuration service that didn&apos;t respond. Please try again.
        </p>
        {error.digest ? (
          <p className="text-xs text-muted-foreground">Error ID: {error.digest}</p>
        ) : null}
        <div className="flex gap-3">
          <Button type="button" onClick={reset} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
