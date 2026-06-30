"use client";

import { useEffect } from "react";
import { errorManager } from "@/components/Utilities/errorManager";
import { Button } from "@/components/ui/button";

interface ScannerApiKeysErrorProps {
  readonly error: Error;
  readonly reset: () => void;
}

export default function ScannerApiKeysError({ error, reset }: ScannerApiKeysErrorProps) {
  useEffect(() => {
    errorManager("Failed to load scanner API keys", error);
  }, [error]);
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Something went wrong loading your API keys
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Try again, and if it persists please contact support.
      </p>
      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
