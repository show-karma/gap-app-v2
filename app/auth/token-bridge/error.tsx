"use client";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Framed and invisible in the common case, so there is nobody to show a rich
 * error to. The embedder sees no `ready` message, times out, and asks as a
 * visitor — which is the designed fallback. This exists for the direct visit.
 */
export default function TokenBridgeError({ reset }: ErrorProps) {
  return (
    <main className="mx-auto max-w-md p-8 text-sm text-gray-600 dark:text-gray-400">
      <p className="mb-3">The session bridge could not start.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-gray-900 dark:border-gray-700 dark:text-white"
      >
        Try again
      </button>
    </main>
  );
}
