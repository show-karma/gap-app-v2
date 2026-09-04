"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "@/src/components/navigation/Link";
import { attemptChunkReload, isChunkLoadError } from "@/utilities/isChunkLoadError";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Stale-deploy recovery: a ChunkLoadError means the user is on an old build
  // whose hashed chunks were purged. `reset()` would re-request the same
  // missing chunk and fail again, so instead force a one-time hard reload to
  // pull the fresh build manifest. The guard inside `attemptChunkReload`
  // prevents an infinite loop when the chunk is genuinely unreachable — when
  // it returns false (reload already attempted this session) we fall through
  // to the normal error UI instead of getting stuck on the updating state.
  const isChunkError = isChunkLoadError(error);
  const [recovering, setRecovering] = useState(isChunkError);
  useEffect(() => {
    if (isChunkError) {
      setRecovering(attemptChunkReload());
    }
  }, [isChunkError]);

  if (recovering) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border p-8 text-center">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Updating to the latest version…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          We encountered an error loading this page. Please try again.
        </p>
        {error.digest ? (
          <p className="text-xs text-muted-foreground">Error ID: {error.digest}</p>
        ) : null}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
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
