"use client";

import { useEffect } from "react";
import { errorManager } from "@/components/Utilities/errorManager";
import { ErrorState } from "@/src/features/scanner/components/error-state";

interface ScannerErrorProps {
  readonly error: Error;
  readonly reset: () => void;
}

export default function ScannerError({ error, reset }: ScannerErrorProps) {
  useEffect(() => {
    errorManager("Failed to load the scanner page", error);
  }, [error]);
  return (
    <main className="mx-auto w-full max-w-3xl px-4">
      <ErrorState
        title="Something went wrong loading the scanner"
        message="This is usually a transient issue. Try again, and if it persists please contact support."
        onRetry={reset}
      />
    </main>
  );
}
