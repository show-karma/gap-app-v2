"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { setPostLoginRedirect, useAuth } from "@/hooks/useAuth";
import { PAGES } from "@/utilities/pages";
import { useScorecardBySlug } from "../hooks/use-scorecard-by-slug";
import type { PublicScorecardPayload } from "../types";

interface MembersAreaCtaProps {
  readonly slug: string;
  // SSR scorecard when the server fetch succeeded (null while the scan is still
  // generating). Used as a fallback so an already-complete scan renders the
  // enabled CTA on first paint; otherwise we recover state from the live
  // polling query, which shares React Query's cache with <PublicScorecard>.
  readonly initialData?: PublicScorecardPayload;
}

export function MembersAreaCta({ slug, initialData }: MembersAreaCtaProps) {
  const { push } = useRouter();
  const { ready, authenticated, login } = useAuth();
  const { data } = useScorecardBySlug(slug);
  const scorecard = data ?? initialData ?? null;
  const scanId = scorecard?.scanId ?? null;
  // The detail report only exists once scoring is done, so gate on that — NOT
  // on scanId presence. The slug endpoint returns a scanId in its in-progress
  // envelopes too, which used to enable the button before the report existed.
  const isComplete = scorecard?.status === "complete";

  function openReport() {
    if (!scanId) return;
    const detailHref = PAGES.SCANNER.SCAN_DETAIL(scanId);
    if (authenticated) {
      push(detailHref);
      return;
    }
    // Persist the return target across the Privy modal handoff so the user
    // lands on the detailed report once login completes.
    setPostLoginRedirect(detailHref);
    login();
  }

  return (
    <div className="flex flex-wrap items-center gap-3 pt-1">
      {isComplete ? (
        <button
          type="button"
          onClick={openReport}
          disabled={!ready || !scanId}
          className="inline-flex items-center gap-1 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-950 shadow-primary-button transition-colors hover:bg-brand-subtle disabled:cursor-not-allowed disabled:opacity-50"
        >
          {authenticated ? "Open full report" : "Log in to see the report"}
          <span aria-hidden>→</span>
        </button>
      ) : (
        // Report isn't ready yet — don't offer to open a report that doesn't
        // exist. A muted status stands in for the button until scoring lands.
        <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-muted-foreground">
          <span className="h-2 w-2 animate-pulse rounded-full bg-brand" aria-hidden />
          Full report unlocks when the scan finishes
        </span>
      )}
      <Link
        href={PAGES.SCANNER.ROOT}
        className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-outline-button transition-colors hover:bg-secondary"
      >
        Scan another site
      </Link>
    </div>
  );
}
