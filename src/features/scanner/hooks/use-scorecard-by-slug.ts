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
      const status = query.state.data?.status;
      return status === "complete" || status === "failed" ? false : POLL_INTERVAL_MS;
    },
  });
}
