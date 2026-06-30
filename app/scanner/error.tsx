"use client";

import { useEffect } from "react";
import { errorManager } from "@/components/Utilities/errorManager";
import { Button } from "@/components/ui/button";

interface ScannerErrorProps {
  readonly error: Error;
  readonly reset: () => void;
}

export default function ScannerError({ error, reset }: ScannerErrorProps) {
  useEffect(() => {
    errorManager("Failed to load the scanner page", error);
  }, [error]);
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Something went wrong loading the scanner
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        This is usually a transient issue. Try again, and if it persists please contact support.
      </p>
      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
