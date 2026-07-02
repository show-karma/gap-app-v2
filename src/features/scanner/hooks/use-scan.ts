"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { getScanById } from "../services/scanner.service";
import type { DetailScorecardPayload } from "../types";

const POLL_INTERVAL_MS = 4_000;
// A freshly-created scan can 404 for a moment before the record is queryable.
// Retry that window at the poll cadence (which keeps the query pending so the
// detail view can show a progress state) instead of hard-failing into a
// "could not load" error. Give up after MAX_PENDING_ATTEMPTS so a genuinely
// missing scan or a permission denial doesn't poll forever.
const GIVE_UP_MS = 45_000;
const MAX_PENDING_ATTEMPTS = 10; // ~40s at 4s — the fresh-scan 404 race lasts seconds, so a genuinely missing id errors quickly

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
    // 401/403 are terminal — the viewer won't gain access by waiting, so fail
    // straight into the error state instead of fake "generating" progress.
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
