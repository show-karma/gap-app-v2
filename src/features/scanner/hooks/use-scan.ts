"use client";

import { useQuery } from "@tanstack/react-query";
import { getScanById } from "../services/scanner.service";
import type { DetailScorecardPayload } from "../types";

// Polls every 4s while the scan is in flight so the donate-flow walkthrough
// (Phase C agent tier) refreshes in place once it lands. Stops polling on
// complete or failed.
const POLL_INTERVAL_MS = 4_000;

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
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "complete" || status === "failed" ? false : POLL_INTERVAL_MS;
    },
  });
}
