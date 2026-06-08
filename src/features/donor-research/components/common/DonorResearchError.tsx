"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Link } from "@/src/components/navigation/Link";
import { PAGES } from "@/utilities/pages";

interface DonorResearchErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Authenticated-side error boundary for the donor-research section.
 * Renders the failure plainly with a retry CTA and a fallback link back
 * to the section's index. Donor-facing pages have their own minimal
 * error UI under `app/donor-research/shared/[token]/error.tsx`.
 */
export function DonorResearchError({ error, reset }: DonorResearchErrorProps) {
  // Never surface raw backend/runtime error text (e.g. "Authorization
  // header with JWT is required") to advisors — map to curated copy, and
  // special-case the signed-out path so it reads as an auth prompt.
  const isAuthError = /authoriz|jwt|unauthenticated|not authenticated|\b401\b/i.test(
    error.message ?? ""
  );
  const heading = isAuthError ? "Please sign in" : "Something went wrong";
  const message = isAuthError
    ? "Your session has expired or you're signed out. Sign in to view donor research, then try again."
    : "We couldn't load this part of donor research. Please try again.";

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">{heading}</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        {error.digest ? (
          <p className="text-xs text-muted-foreground">Reference: {error.digest}</p>
        ) : null}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <Link
            href={PAGES.DONOR_RESEARCH.INDEX}
            className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Back to donor research
          </Link>
        </div>
      </div>
    </div>
  );
}
