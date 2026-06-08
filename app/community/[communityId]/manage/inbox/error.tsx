"use client";

import { useEffect } from "react";
import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";

export default function ReviewerInboxError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    errorManager("Reviewer Inbox page error", error);
  }, [error]);

  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        Something went wrong loading your inbox
      </h2>
      <p className="max-w-md text-gray-600 dark:text-gray-400">
        We couldn&apos;t load your reviews. Please try again.
      </p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
