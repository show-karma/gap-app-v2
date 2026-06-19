"use client";

import { useEffect, useState } from "react";
import { usePrivyBridge } from "@/contexts/privy-bridge-context";
import { useDonorAdvisor } from "@/hooks/useDonorAdvisor";
import { fetchSharedReport } from "@/services/donor-research.service";
import type { DonorResearchReportStatus, ResearchReportDetail } from "@/types/donor-research";
import { ReportBrief } from "../report-brief/ReportBrief";
import { CommentOverlay } from "./CommentOverlay";

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

const isTerminal = (payload: ResearchReportDetail | null): boolean =>
  payload !== null && TERMINAL_STATUSES.has(payload.status);

/**
 * Donor-facing share view (U14).
 *
 * Unauthenticated — the token IS the capability. The view polls every
 * 30 seconds while the report is still enriching so donors see Deep-mode
 * updates as they land, then stops polling once the report reaches a
 * terminal status to avoid hammering the public endpoint from open tabs.
 *
 * Renders the SAME {@link ReportBrief} component as the authenticated advisor
 * report (`variant="shared"` hides advisor-only controls), so the donor view
 * is visually identical to what the advisor sees. The backend share endpoint
 * returns the same payload shape with advisor identifiers redacted.
 *
 * Standalone fetcher (no React Query) — keeps the unauthenticated entry
 * point free of cookie-bound query state.
 */
export function SharedReportView({ token }: SharedReportViewProps) {
  const [payload, setPayload] = useState<ResearchReportDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // KTD14 advisor identity wiring (v1 best-effort).
  //
  // The shared-report payload omits `advisorId` (PII-redacted on the
  // backend per KTD12), so we can't compare it directly to the Privy
  // session. We use the inherited root Privy bridge to detect that a
  // session exists, and the existing `useDonorAdvisor` hook to confirm
  // the session is an onboarded advisor account. The indexer remains
  // the source of truth: comments are stamped `is_advisor` at write
  // time when the Privy JWT resolves to the report's advisor (see
  // KTD14). The FE flag below only governs the IdentityBadge text and
  // gates the IdentityCaptureDialog — the persisted advisor flag on
  // each comment row is authoritative for the row badge.
  const privy = usePrivyBridge();
  const advisorQuery = useDonorAdvisor({
    enabled: privy.ready && privy.authenticated,
  });
  const isAdvisorViewer = Boolean(privy.ready && privy.authenticated && advisorQuery.data);

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

  return (
    <>
      <ReportBrief report={payload} isTerminal={isTerminal(payload)} variant="shared" />
      <CommentOverlay token={token} isAdvisor={isAdvisorViewer} />
    </>
  );
}
