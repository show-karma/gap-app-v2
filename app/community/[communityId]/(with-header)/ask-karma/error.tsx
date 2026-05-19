"use client";

import { useEffect } from "react";
import { errorManager } from "@/components/Utilities/errorManager";
import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function CommunityAskKarmaError({ error, reset }: ErrorProps) {
  useEffect(() => {
    errorManager("Community ask-karma page error", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-16 text-center">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Something went wrong loading the assistant.
      </h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        Please try again. If the issue persists, refresh the page.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
