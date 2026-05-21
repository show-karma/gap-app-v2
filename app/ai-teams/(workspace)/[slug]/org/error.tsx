"use client";

import { humanizeApiError } from "@/lib/ai-agent-error";

export default function OrgErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Couldn&apos;t load Org Brain</h1>
      <p className="mt-3 text-sm text-red-600">{humanizeApiError(error)}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded border dark:border-zinc-700 px-4 py-2 dark:text-zinc-300"
      >
        Try again
      </button>
    </main>
  );
}
