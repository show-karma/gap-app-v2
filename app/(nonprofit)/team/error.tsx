"use client";

export default function TeamError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-3 text-sm text-red-600">{error.message}</p>
      <button type="button" onClick={reset} className="mt-6 rounded border px-4 py-2">
        Try again
      </button>
    </main>
  );
}
