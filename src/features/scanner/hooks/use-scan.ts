"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { getScanById } from "../services/scanner.service";
import type { DetailScorecardPayload } from "../types";

const POLL_INTERVAL_MS = 4_000;
// Nothing arrives at the detail report freshly created — submission redirects
// to the public scorecard, and report links only render once a scan record
// exists — so a 404 here is a stale or mistyped link. A couple of retries
// absorb transient blips; beyond that, fail fast into the error state instead
// of showing fabricated generating progress.
const GIVE_UP_MS = 45_000;
const MAX_PENDING_ATTEMPTS = 2;

export function useScan(scanId: string | null) {
  // Wall-clock anchor for the pre-data give-up: attempt-count caps alone
  // stretch with slow upstream requests. Keyed by scanId so navigating to a
  // different scan opens a fresh window instead of inheriting a spent one.
  const anchorRef = useRef({ key: scanId, at: Date.now() });
  if (anchorRef.current.key !== scanId) {
    anchorRef.current = { key: scanId, at: Date.now() };
  }
  const query = useQuery<DetailScorecardPayload, Error & { status?: number }>({
    queryKey: ["scanner", "scan", scanId],
    queryFn: () => {
      if (!scanId) {
        throw new Error("scanId is required");
      }
      return getScanById(scanId);
    },
    enabled: Boolean(scanId),
    // 401/403 are terminal — an expired or missing session won't fix itself
    // by polling, so fail straight into the error state instead of fake
    // "generating" progress. Note there is deliberately NO per-user ownership
    // check on the detail tier: any authenticated viewer may open any scan's
    // report (login works as lead capture, not as an ACL — see PR #1698).
    // Everything else retries through the fresh-scan 404 window, capped by
    // wall clock (attempt counts stretch with upstream latency).
    retry: (failureCount, error) => {
      if (error.status === 401 || error.status === 403) return false;
      if (Date.now() - anchorRef.current.at > GIVE_UP_MS) return false;
      return failureCount < MAX_PENDING_ATTEMPTS;
    },
    retryDelay: POLL_INTERVAL_MS,
    // Once we have the envelope, keep polling in place so the donate-flow
    // walkthrough (Phase C agent tier) refreshes once it lands. Stop on a
    // terminal status.
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
