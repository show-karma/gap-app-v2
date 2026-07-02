"use client";

import { KeyRound } from "lucide-react";
import { useEffect } from "react";
import { errorManager } from "@/components/Utilities/errorManager";
import { ErrorState } from "@/src/features/scanner/components/error-state";

interface ScannerApiKeysErrorProps {
  readonly error: Error;
  readonly reset: () => void;
}

export default function ScannerApiKeysError({ error, reset }: ScannerApiKeysErrorProps) {
  useEffect(() => {
    errorManager("Failed to load scanner API keys", error);
  }, [error]);
  return (
    <main className="mx-auto w-full max-w-3xl px-4">
      <ErrorState
        title="Something went wrong loading your API keys"
        message="Try again, and if it persists please contact support."
        onRetry={reset}
        icon={KeyRound}
      />
    </main>
  );
}
