"use client";

import { useQuery } from "@tanstack/react-query";
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
const MAX_PENDING_ATTEMPTS = 30; // ~2 min at 4s

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
    // Retry the pre-scored 404 window at the poll cadence. A scored scorecard
    // resolves on the first attempt, so shared links stay instant.
    retry: (failureCount) => failureCount < MAX_PENDING_ATTEMPTS,
    retryDelay: POLL_INTERVAL_MS,
    // Once we have data, keep refreshing in place through the non-terminal
    // statuses (config_complete → running_agent) until the scan is terminal.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status) return false; // pre-data: the retry loop above is polling.
      return status === "complete" || status === "failed" ? false : POLL_INTERVAL_MS;
    },
  });
}
