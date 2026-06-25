"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PAGES } from "@/utilities/pages";

interface ScorecardErrorProps {
  readonly error: Error;
  readonly reset: () => void;
}

export default function ScorecardError({ reset }: ScorecardErrorProps) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        We could not load this scorecard
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        The scorecard may have been unpublished by the organization, or this URL may be wrong.
      </p>
      <div className="flex gap-3">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Link
          href={PAGES.SCANNER.ROOT}
          className="inline-flex items-center justify-center rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Scan another URL
        </Link>
      </div>
    </main>
  );
}
