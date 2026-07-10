"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { getScanByUrl } from "../services/scanner.service";
import type { DetailScorecardPayload } from "../types";

const POLL_INTERVAL_MS = 4_000;
// Mirrors use-scan's give-up window. A domain that has never been scanned
// resolves to `null` (a 404 the service maps to "no report yet"), so the only
// thing worth retrying here is a transient upstream blip — not a fabricated
// generating loop. A just-submitted scan for this URL comes back as a live
// envelope, which the refetchInterval below polls until terminal.
const GIVE_UP_MS = 45_000;
const MAX_PENDING_ATTEMPTS = 2;
// Keep a terminal payload fresh for a beat so navigating away and back (or a
// delegated component mounting) reuses the cache instead of refetching.
const STALE_TIME_MS = 30_000;

// Resolve the latest report for a website by URL. `data` is:
//   - undefined while the first request is in flight (isPending),
//   - null when no report exists yet (the service maps 404 → null), so the
//     caller can offer to scan the site, or
//   - the DetailScorecardPayload — detail tier for an authenticated caller,
//     public tier otherwise (the backend decides based on the attached token).
export function useScanByUrl(url: string | null) {
  // Wall-clock anchor for the pre-data give-up, keyed by url so a different
  // site opens a fresh retry window instead of inheriting a spent one.
  const anchorRef = useRef({ key: url, at: Date.now() });
  if (anchorRef.current.key !== url) {
    anchorRef.current = { key: url, at: Date.now() };
  }
  const query = useQuery<DetailScorecardPayload | null, Error & { status?: number }>({
    queryKey: ["scanner", "by-url", url],
    queryFn: () => {
      if (!url) {
        throw new Error("url is required");
      }
      return getScanByUrl(url);
    },
    enabled: Boolean(url),
    staleTime: STALE_TIME_MS,
    // 401/403 are terminal — an expired or missing session won't resolve by
    // polling. Everything else retries briefly, capped by wall clock (attempt
    // counts stretch with upstream latency).
    retry: (failureCount, error) => {
      if (error.status === 401 || error.status === 403) return false;
      if (Date.now() - anchorRef.current.at > GIVE_UP_MS) return false;
      return failureCount < MAX_PENDING_ATTEMPTS;
    },
    retryDelay: POLL_INTERVAL_MS,
    // Once we have a live envelope, keep polling in place until the scan
    // reaches a terminal status. `null` (no report) and terminal statuses stop.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status) return false;
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
