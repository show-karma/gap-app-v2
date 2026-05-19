"use client";

import { useEffect } from "react";
import { errorManager } from "@/components/Utilities/errorManager";
import { Button } from "@/components/ui/button";

interface AskKarmaErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  /**
   * Label used as the first arg to errorManager — distinguishes the root
   * route from the community route in Sentry so each path's errors can be
   * filtered separately. Kept short and stable.
   */
  errorLabel: string;
}

/**
 * Shared error boundary content for both ask-karma route entries. The route
 * `error.tsx` files thin-wrap this so they each get a stable Sentry label.
 */
export function AskKarmaError({ error, reset, errorLabel }: AskKarmaErrorProps) {
  useEffect(() => {
    errorManager(errorLabel, error);
  }, [error, errorLabel]);

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
