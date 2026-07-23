"use client";

import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/Pages/Dashboard/v3/primitives";
import { usePrivyBridge } from "@/contexts/privy-bridge-context";
import { useDonorAdvisor } from "@/hooks/useDonorAdvisor";
import { fetchSharedReport } from "@/services/donor-research.service";
import type { DonorResearchReportStatus, ResearchReportDetail } from "@/types/donor-research";
import { TokenPageShell } from "../common/TokenPageShell";
import { ReportBrief } from "../report-brief/ReportBrief";
import { CommentOverlay } from "./CommentOverlay";
import { SharedTopBar } from "./SharedTopBar";

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
  // Email from a Privy email login, if present. Used to pre-fill + lock
  // the identity-capture email field. Wallet logins expose no email, so
  // this stays null and the donor is asked for one.
  const viewerEmail =
    privy.ready && privy.authenticated ? (privy.user?.email?.address ?? null) : null;

  // Portal target the top bar renders for `CommentOverlay` to mount the
  // `IdentityBadge` into (spec 2.3: "IdentityBadge right"). A ref callback
  // (not a plain ref) so the state update fires on the same commit the DOM
  // node mounts, letting the portal render on the very first paint that has
  // a target to render into.
  const [identitySlot, setIdentitySlot] = useState<HTMLDivElement | null>(null);
  const identitySlotRef = useCallback((el: HTMLDivElement | null) => {
    setIdentitySlot(el);
  }, []);

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
      // Same as stopPolling(), inlined so static analysis can verify the
      // interval is cleared on unmount.
      if (interval !== null) {
        clearInterval(interval);
        interval = null;
      }
    };
  }, [token]);

  if (loading && !payload) {
    return (
      <TokenPageShell>
        <div className="flex flex-col gap-4">
          <div className="h-6 w-1/2 animate-pulse rounded-sf-tile bg-sf-skeleton" />
          <div className="h-4 w-3/4 animate-pulse rounded-sf-tile bg-sf-skeleton" />
          <div className="h-40 animate-pulse rounded-sf-card bg-sf-skeleton" />
        </div>
      </TokenPageShell>
    );
  }

  if (error || !payload) {
    return (
      <TokenPageShell maxWidthClassName="max-w-xl">
        {/* EmptyState's title is an h3 (it's reused inside sectioned pages
         * that supply their own h1/h2) — this route has no other document
         * heading, so give it one here, matching the visible copy. */}
        <h1 className="sr-only">Research not available</h1>
        <EmptyState
          icon="alert"
          title="Research not available"
          body="This research link is no longer available. Please contact your advisor for an updated link."
        />
      </TokenPageShell>
    );
  }

  return (
    <TokenPageShell>
      <SharedTopBar identitySlotRef={identitySlotRef} />
      <ReportBrief report={payload} isTerminal={isTerminal(payload)} variant="shared" />
      <p className="mt-8 text-center text-[12px] text-sf-muted">
        This is a private research link generated by Karma. Comments you leave here are visible to
        your advisor.
      </p>
      <CommentOverlay
        token={token}
        isAdvisor={isAdvisorViewer}
        isAuthenticated={Boolean(privy.ready && privy.authenticated)}
        isAdvisorResolving={Boolean(privy.ready && privy.authenticated) && advisorQuery.isLoading}
        viewerEmail={viewerEmail}
        identityPortalTarget={identitySlot}
      />
    </TokenPageShell>
  );
}
