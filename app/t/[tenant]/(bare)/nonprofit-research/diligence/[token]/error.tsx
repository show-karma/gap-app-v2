"use client";

import { AlertTriangle } from "lucide-react";

/**
 * Nonprofit-facing error boundary. Intentionally minimal — the responder
 * never sees Karma branding, advisor identity, or internal navigation. They
 * get a clean instruction that the link is no longer usable.
 */
export default function Error({
  error: _error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">This link is no longer valid</h1>
        <p className="text-sm text-muted-foreground">
          This research request link is no longer available. If you still need to respond, please
          ask whoever sent it for an updated link.
        </p>
      </div>
    </div>
  );
}
