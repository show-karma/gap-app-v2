"use client";

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
  // the donor-research section is safe here.
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
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Donor Research</h1>
          <p className="text-sm text-muted-foreground">
            Research current, ranked nonprofit recommendations for your donor clients.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RateLimitCounter advisor={advisor} />
          <Link
            href={PAGES.DONOR_RESEARCH.INDEX}
            className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Refresh
          </Link>
        </div>
      </header>

      <section className="mb-8">
        <CriteriaInputPanel />
      </section>

      <section>
        <ReportListPanel />
      </section>
    </div>
  );
}
