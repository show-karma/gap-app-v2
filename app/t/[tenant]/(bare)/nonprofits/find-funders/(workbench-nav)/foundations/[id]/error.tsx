"use client";

/**
 * Foundation detail route error boundary.
 * Required by gap-app-v2 convention: every app/ route needs page + loading + error.
 */
import Link from "next/link";
import { useEffect } from "react";
import { NON_PROFITS_PAGES } from "@/utilities/pages";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function FoundationError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to error tracking in production
    console.error("[Foundation detail error]", error);
  }, [error]);

  return (
    <main className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Something went wrong
      </h1>
      <p className="max-w-md text-sm text-zinc-500">
        We couldn&apos;t load this foundation. Please try again or go back to the search.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Try again
        </button>
        <Link
          href={NON_PROFITS_PAGES.HOME}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Back to Non-Profits
        </Link>
      </div>
    </main>
  );
}
