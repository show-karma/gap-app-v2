"use client";

import { Globe } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { errorManager } from "@/components/Utilities/errorManager";
import { ErrorState } from "@/src/features/scanner/components/error-state";
import { PAGES } from "@/utilities/pages";

interface ScorecardErrorProps {
  readonly error: Error;
  readonly reset: () => void;
}

export default function ScorecardError({ error, reset }: ScorecardErrorProps) {
  useEffect(() => {
    errorManager("Failed to load public scorecard", error);
  }, [error]);
  return (
    <main className="mx-auto w-full max-w-3xl px-4">
      <ErrorState
        title="We couldn't load this scorecard"
        message="The scorecard may have been unpublished by the organization, or this URL may be wrong."
        onRetry={reset}
        icon={Globe}
      />
      <div className="flex justify-center pb-8">
        <Link
          href={PAGES.SCANNER.ROOT}
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Scan another URL
        </Link>
      </div>
    </main>
  );
}
