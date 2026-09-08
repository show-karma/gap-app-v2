"use client";

import { useEffect } from "react";
import { errorManager } from "@/components/Utilities/errorManager";
import { ErrorState } from "@/src/features/scanner/components/error-state";

interface ScannerSiteErrorProps {
  readonly error: Error;
  readonly reset: () => void;
}

export default function ScannerSiteError({ error, reset }: ScannerSiteErrorProps) {
  useEffect(() => {
    errorManager("Failed to load scanner site report", error);
  }, [error]);
  return (
    <main className="mx-auto w-full max-w-3xl px-4">
      <ErrorState
        title="Something went wrong loading this report"
        message="This is usually a transient issue. Try again, and if it persists please contact support."
        onRetry={reset}
      />
    </main>
  );
}
