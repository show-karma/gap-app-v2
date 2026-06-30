"use client";

import { ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useDonorAdvisor } from "@/hooks/useDonorAdvisor";
import { Link } from "@/src/components/navigation/Link";
import { PAGES } from "@/utilities/pages";
import { CriteriaInputPanel } from "../criteria-input/CriteriaInputPanel";
import { ReportListPanel } from "../report-list/ReportListPanel";
import { DonorResearchLoading } from "./DonorResearchLoading";
import { RateLimitCounter } from "./RateLimitCounter";

/**
 * Donor-research index page (U12 + U13).
 *
 * Loading / empty / error states per gap-app-v2 CLAUDE.md three-states
 * rule:
 *   - loading skeleton while `useDonorAdvisor` resolves
 *   - empty: advisor === null → router push to /onboarding
 *   - error: pass through to the route's error boundary via `throw`
 *
 * Once advisor is loaded, renders the criteria-input panel on top
 * (primary action) and the report-list panel below (history).
 */
export function DonorResearchHome() {
  const router = useRouter();
  const advisorQuery = useDonorAdvisor();

  // Effect-only redirect — never call `login()` / `logout()` from a
  // useEffect combined with auth state (Auth Gotchas). Routing within
  // the nonprofit-research section is safe here.
  useEffect(() => {
    if (advisorQuery.isSuccess && advisorQuery.data === null) {
      router.replace(PAGES.DONOR_RESEARCH.ONBOARDING);
    }
  }, [advisorQuery.isSuccess, advisorQuery.data, router]);

  if (advisorQuery.isLoading) {
    return <DonorResearchLoading label="Loading your advisor profile…" />;
  }

  if (advisorQuery.isError) {
    // Let the route-level error.tsx render the standard error UX.
    throw advisorQuery.error;
  }

  const advisor = advisorQuery.data;
  if (!advisor) {
    // Redirect already in flight; render a minimal placeholder so the
    // route doesn't flash empty content.
    return <DonorResearchLoading label="Redirecting to onboarding…" />;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-border/60 pb-6">
        <div className="max-w-xl">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Karma · Nonprofit Research
          </p>
          <h1 className="text-balance text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Find nonprofits worth your client's next gift.
          </h1>
          <p className="mt-2 max-w-lg text-pretty text-sm leading-relaxed text-muted-foreground">
            We surface vetted 501(c)(3)s ranked on freshness, impact recency, donor alignment, and
            compliance — sourced from the IRS Pub 78, recent 990 filings, and live activity signals.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RateLimitCounter advisor={advisor} />
          <Link
            href={PAGES.DONOR_RESEARCH.DILIGENCE_TEMPLATE}
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm transition-colors hover:border-primary/50 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
            Diligence questions
          </Link>
          <Link
            href={PAGES.DONOR_RESEARCH.INDEX}
            className="text-xs font-medium text-muted-foreground underline underline-offset-4 decoration-border hover:text-foreground hover:decoration-current"
          >
            Refresh
          </Link>
        </div>
      </header>

      <section className="mb-10">
        <CriteriaInputPanel />
      </section>

      <section>
        <ReportListPanel />
      </section>
    </div>
  );
}
