"use client";

import { useEffect, useState } from "react";
import { fetchSharedReport } from "@/services/donor-research.service";
import type { DonorResearchReportStatus, SharedReportPayload } from "@/types/donor-research";
import { ScoringLegend } from "./ScoringLegend";
import { SharedCandidateCard } from "./SharedCandidateCard";
import { SharedHeader } from "./SharedHeader";

interface SharedReportViewProps {
  token: string;
}

const POLL_INTERVAL_MS = 30_000;

/**
 * Cap on recovery polls when the report never loaded at all (e.g. a
 * revoked or invalid token). Bounds how long we keep retrying an
 * unauthenticated endpoint that will never succeed. Once a payload has
 * loaded once, in-flight polling is governed by terminal status instead.
 */
const MAX_RECOVERY_POLLS = 5;

/**
 * Terminal statuses stop the live poll. `fast_complete` is treated as
 * terminal for this MVP because Deep enrichment isn't produced yet, so
 * there are no further updates to wait for.
 */
const TERMINAL_STATUSES: ReadonlySet<DonorResearchReportStatus> = new Set([
  "fast_complete",
  "complete",
  "failed",
]);

const isTerminal = (payload: SharedReportPayload | null): boolean =>
  payload !== null && TERMINAL_STATUSES.has(payload.report.status);

/**
 * Donor-facing share view (U14).
 *
 * Unauthenticated — the token IS the capability. The view polls every
 * 30 seconds while the report is still enriching so donors see Deep-mode
 * updates as they land, then stops polling once the report reaches a
 * terminal status to avoid hammering the public endpoint from open tabs.
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
    let interval: ReturnType<typeof setInterval> | null = null;
    // Tracks whether we've ever loaded a payload. Until we have, repeated
    // poll failures are bounded by MAX_RECOVERY_POLLS so an invalid token
    // can't hammer the public endpoint forever.
    let hasLoaded = false;
    let recoveryAttempts = 0;

    const stopPolling = () => {
      if (interval !== null) {
        clearInterval(interval);
        interval = null;
      }
    };

    // A transient poll error keeps the prior payload on screen. But if we
    // never loaded anything (e.g. a revoked token), stop after a few
    // attempts instead of polling the public endpoint forever.
    const noteRecoveryFailure = () => {
      if (hasLoaded) return;
      recoveryAttempts += 1;
      if (recoveryAttempts >= MAX_RECOVERY_POLLS) stopPolling();
    };

    const pollTick = async () => {
      if (cancelled) return;
      try {
        const data = await fetchSharedReport(token);
        if (cancelled) return;
        hasLoaded = true;
        recoveryAttempts = 0;
        setPayload(data);
        // Stop once the report reaches a terminal status — no further
        // updates will land on this unauthenticated endpoint.
        if (isTerminal(data)) stopPolling();
      } catch {
        noteRecoveryFailure();
      }
    };

    const startPolling = () => {
      if (interval !== null) return;
      // Live token poll: only while the report is still in flight.
      interval = setInterval(() => void pollTick(), POLL_INTERVAL_MS);
    };

    const load = async () => {
      try {
        const data = await fetchSharedReport(token);
        if (cancelled) return;
        hasLoaded = true;
        setPayload(data);
        setError(null);
        // Only begin polling if the report is still in flight.
        if (!isTerminal(data)) startPolling();
      } catch (e) {
        if (cancelled) return;
        setError((e as Error)?.message || "Couldn't load this research.");
        // Initial load failed without a payload — keep retrying via poll.
        startPolling();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();

    return () => {
      cancelled = true;
      stopPolling();
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
