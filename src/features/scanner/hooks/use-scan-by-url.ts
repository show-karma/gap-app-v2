"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { getScanByUrl } from "../services/scanner.service";
import type { DetailScorecardPayload } from "../types";

const POLL_INTERVAL_MS = 4_000;
const GIVE_UP_MS = 45_000;
const MAX_PENDING_ATTEMPTS = 2;
const STALE_TIME_MS = 30_000;

export function useScanByUrl(url: string | null) {
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
    retry: (failureCount, error) => {
      if (error.status === 401 || error.status === 403) return false;
      if (Date.now() - anchorRef.current.at > GIVE_UP_MS) return false;
      return failureCount < MAX_PENDING_ATTEMPTS;
    },
    retryDelay: POLL_INTERVAL_MS,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status) return false;
      return status === "complete" || status === "failed" ? false : POLL_INTERVAL_MS;
    },
  });

  const { refetch: queryRefetch } = query;
  const refetch = useCallback(() => {
    anchorRef.current = { ...anchorRef.current, at: Date.now() };
    return queryRefetch();
  }, [queryRefetch]);

  return { ...query, refetch };
}
