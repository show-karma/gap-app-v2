"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { errorManager } from "@/components/Utilities/errorManager";
import { PAGES } from "@/utilities/pages";

interface BlogErrorProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

export default function BlogError({ error, reset }: BlogErrorProps) {
  useEffect(() => {
    errorManager("Failed to load blog index", error);
  }, [error]);

  return (
    <main className="container mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
        <AlertTriangle className="h-7 w-7" aria-hidden />
      </div>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        We couldn&apos;t load the blog
      </h1>
      <p className="max-w-md text-sm text-gray-600 dark:text-gray-400">
        Something went wrong while fetching posts. This is usually temporary.
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
        >
          Try again
        </button>
        <Link
          href={PAGES.HOME}
          className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
