"use client";

import { useQuery } from "@tanstack/react-query";
import { getScanById } from "../services/scanner.service";
import type { DetailScorecardPayload } from "../types";

const POLL_INTERVAL_MS = 4_000;
// A freshly-created scan can 404 for a moment before the record is queryable.
// Retry that window at the poll cadence (which keeps the query pending so the
// detail view can show a progress state) instead of hard-failing into a
// "could not load" error. Give up after MAX_PENDING_ATTEMPTS so a genuinely
// missing scan or a permission denial doesn't poll forever.
const MAX_PENDING_ATTEMPTS = 30; // ~2 min at 4s

export function useScan(scanId: string | null) {
  return useQuery<DetailScorecardPayload, Error & { status?: number }>({
    queryKey: ["scanner", "scan", scanId],
    queryFn: () => {
      if (!scanId) {
        throw new Error("scanId is required");
      }
      return getScanById(scanId);
    },
    enabled: Boolean(scanId),
    retry: (failureCount) => failureCount < MAX_PENDING_ATTEMPTS,
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
}
