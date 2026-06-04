"use client";

import { useEffect, useState } from "react";
import { fetchSharedReport } from "@/services/donor-research.service";
import type { SharedReportPayload } from "@/types/donor-research";
import { ScoringLegend } from "./ScoringLegend";
import { SharedCandidateCard } from "./SharedCandidateCard";
import { SharedHeader } from "./SharedHeader";

interface SharedReportViewProps {
  token: string;
}

const POLL_INTERVAL_MS = 30_000;

/**
 * Donor-facing share view (U14).
 *
 * Unauthenticated — the token IS the capability. The view polls every
 * 30 seconds while the report is still enriching so donors see Deep-mode
 * updates as they land.
 *
 * Donor-friendly framing throughout:
 *  - No Karma branding or support links
 *  - Advisor identity surfaced via `shareDisplayName` only
 *  - Compliance verdicts translated to donor-readable phrasing
 *  - No action buttons (regenerate, edit, share again)
 *
 * Standalone fetcher (no React Query) — keeps the unauthenticated entry
 * point free of cookie-bound query state.
 */
export function SharedReportView({ token }: SharedReportViewProps) {
  const [payload, setPayload] = useState<SharedReportPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await fetchSharedReport(token);
        if (cancelled) return;
        setPayload(data);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError((e as Error)?.message || "Couldn't load this research.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    // Live token poll: only while the report is still in flight.
    const interval = setInterval(async () => {
      if (cancelled) return;
      try {
        const data = await fetchSharedReport(token);
        if (cancelled) return;
        setPayload(data);
      } catch {
        // Transient error: keep showing the previously-loaded payload.
      }
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token]);

  if (loading && !payload) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="flex flex-col gap-4">
          <div className="h-6 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <div className="rounded-xl border border-border p-6 text-center">
          <h1 className="mb-2 text-xl font-semibold">Research not available</h1>
          <p className="text-sm text-muted-foreground">
            This research link is no longer available. Please contact your advisor for an updated
            link.
          </p>
        </div>
      </div>
    );
  }

  const { report, candidates } = payload;
  const topThree = candidates.filter((c) => c.topThreeFlag);
  const remaining = candidates.filter((c) => !c.topThreeFlag);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <SharedHeader
        displayName={report.shareDisplayName}
        introText={report.shareIntroText}
        reportFinalizedAt={report.reportFinalizedAt}
      />

      {report.status === "enriching" || report.status === "re_enriching" ? (
        <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Enrichment in progress — this research updates over the next 1–3 days as more information
          arrives.
        </div>
      ) : null}

      <ScoringLegend />

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Top recommendations</h2>
        {topThree.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No top recommendations available yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {topThree.map((candidate) => (
              <SharedCandidateCard
                key={candidate.fundingOrganizationId}
                candidate={candidate}
                variant="one-pager"
              />
            ))}
          </div>
        )}
      </section>

      {remaining.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Other candidates</h2>
          <div className="flex flex-col gap-3">
            {remaining.map((candidate) => (
              <SharedCandidateCard
                key={candidate.fundingOrganizationId}
                candidate={candidate}
                variant="detail"
              />
            ))}
          </div>
        </section>
      ) : null}

      <footer className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        Questions about this research? Contact your advisor.
      </footer>
    </div>
  );
}
