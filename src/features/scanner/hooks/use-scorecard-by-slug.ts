"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { getPublicScorecardBySlug } from "../services/scanner.service";
import type { PublicScorecardPayload } from "../types";

const POLL_INTERVAL_MS = 4_000;
// The public slug endpoint only serves a *fully scored* scorecard, so a
// just-submitted scan makes it 404 for the first tens of seconds. We treat
// that as "still generating" and retry every 4s (via `retry` + fixed
// `retryDelay`, which keeps the query in its pending state and lets the page
// show a progress view) rather than surfacing a not-found error. After
// MAX_PENDING_ATTEMPTS the slug is judged genuinely missing/unpublished, so we
// stop — a bad or revoked link can't poll the backend forever from every tab.
const GIVE_UP_MS = 45_000;
const MAX_PENDING_ATTEMPTS = 10; // just-submitted scans: cover the full scoring window
const COLD_MAX_ATTEMPTS = 2; // stale/mistyped share links: fail fast, no fake progress
// Freshness markers let the retry loop tell "I just submitted this scan" (the
// slug legitimately 404s until scoring lands, keep polling) apart from "I
// followed a stale share link" (error out quickly).
const FRESH_TTL_MS = 3 * 60_000;

function freshKey(slug: string): string {
  return `scanner:fresh-scan:${slug}`;
}

// Called by the submit flow right before redirecting to /s/[slug].
export function markFreshScanSubmit(slug: string): void {
  try {
    sessionStorage.setItem(freshKey(slug), String(Date.now()));
  } catch {
    // Storage unavailable (private browsing) — the cold window still applies.
  }
}

function isFreshScanSubmit(slug: string): boolean {
  try {
    const at = Number(sessionStorage.getItem(freshKey(slug)));
    return Number.isFinite(at) && at > 0 && Date.now() - at < FRESH_TTL_MS;
  } catch {
    return false;
  }
}

export function useScorecardBySlug(slug: string | null) {
  // Wall-clock anchor for the pre-data give-up (see use-scan), keyed by slug
  // so a different scorecard opens a fresh window.
  const anchorRef = useRef({ key: slug, at: Date.now() });
  if (anchorRef.current.key !== slug) {
    anchorRef.current = { key: slug, at: Date.now() };
  }
  const query = useQuery<PublicScorecardPayload, Error & { status?: number }>({
    queryKey: ["scanner", "scorecard", slug],
    queryFn: () => {
      if (!slug) {
        throw new Error("slug is required");
      }
      return getPublicScorecardBySlug(slug);
    },
    enabled: Boolean(slug),
    // Retry the pre-scored 404 window at the poll cadence. A scored scorecard
    // resolves on the first attempt, so shared links stay instant. Only a
    // freshly submitted scan earns the long window; a cold visit to a missing
    // slug errors after a couple of attempts instead of faking progress.
    retry: (failureCount) => {
      if (Date.now() - anchorRef.current.at > GIVE_UP_MS) return false;
      const cap = slug && isFreshScanSubmit(slug) ? MAX_PENDING_ATTEMPTS : COLD_MAX_ATTEMPTS;
      return failureCount < cap;
    },
    retryDelay: POLL_INTERVAL_MS,
    // Once we have data, keep refreshing in place through the non-terminal
    // statuses (config_complete → running_agent) until the scan is terminal.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status) return false; // pre-data: the retry loop above is polling.
      return status === "complete" || status === "failed" ? false : POLL_INTERVAL_MS;
    },
  });

  const { refetch: queryRefetch } = query;
  // A manual retry opens a fresh give-up window — without this, once the
  // wall-clock cap trips the retry button could never re-enter the retry loop.
  const refetch = useCallback(() => {
    anchorRef.current = { ...anchorRef.current, at: Date.now() };
    return queryRefetch();
  }, [queryRefetch]);

  return { ...query, refetch };
}
