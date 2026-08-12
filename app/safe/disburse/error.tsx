"use client";

export default function SafeDisburseErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-4xl py-8">
      <div className="mt-8 rounded-lg border border-red-200 bg-red-50 px-6 py-10 text-center dark:border-red-800 dark:bg-red-900/20">
        <h1 className="text-xl font-semibold text-red-700 dark:text-red-300">
          Safe disbursement failed to load
        </h1>
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">
          The disbursement form could not be loaded. Please try again.
        </p>
        {error.digest ? (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">Error ID: {error.digest}</p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
