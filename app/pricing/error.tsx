"use client";

export default function PricingErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold text-black dark:text-white">Something went wrong</h1>
      <p className="mt-4 text-base text-zinc-700 dark:text-zinc-300">
        The Pricing page failed to load. This is usually temporary.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      >
        Try again
      </button>
    </main>
  );
}
