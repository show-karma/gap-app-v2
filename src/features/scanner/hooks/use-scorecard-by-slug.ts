"use client";

import { useQuery } from "@tanstack/react-query";
import { getPublicScorecardBySlug } from "../services/scanner.service";
import type { PublicScorecardPayload } from "../types";

const POLL_INTERVAL_MS = 4_000;

export function useScorecardBySlug(slug: string | null) {
  return useQuery<PublicScorecardPayload, Error & { status?: number }>({
    queryKey: ["scanner", "scorecard", slug],
    queryFn: () => {
      if (!slug) {
        throw new Error("slug is required");
      }
      return getPublicScorecardBySlug(slug);
    },
    enabled: Boolean(slug),
    refetchInterval: (query) => {
      // Stop the 4s poll once the request errors. Without this guard a
      // permanently failing slug endpoint (404 unpublished, 5xx) has no
      // successful `data`, so `status` stays undefined and the public —
      // and most-trafficked — scorecard page would re-hit the backend
      // every 4s forever from every open tab. Mirrors use-scan.ts.
      if (query.state.status === "error") return false;
      const status = query.state.data?.status;
      return status === "complete" || status === "failed" ? false : POLL_INTERVAL_MS;
    },
  });
}
