"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { track } from "@/utilities/analytics/client";
import { toErrorCode } from "@/utilities/analytics/error-code";
import type { EntryPoint } from "@/utilities/analytics/events";
import { findOrCreateScan } from "../services/scanner.service";
import type { ScanEntryResult, SubmitScanRequest } from "../types";

interface UseSubmitScanOptions {
  /** Stable id of the surface the scan was started from, for the funnel. */
  entryPoint: EntryPoint;
  onSuccess?: (data: ScanEntryResult) => void;
  onError?: (error: Error & { status?: number }) => void;
}

// View-first entry mutation. Looks up an existing report for the URL (free)
// and only generates a new scan (spending a credit) when none exists — the
// ora.ai shared-report model. `data.created` tells the caller whether a scan
// was generated or an existing report was surfaced.
export function useSubmitScan(options: UseSubmitScanOptions) {
  const queryClient = useQueryClient();
  return useMutation<ScanEntryResult, Error & { status?: number }, SubmitScanRequest>({
    mutationFn: (request) => {
      track("scanner_scan_submitted", { entry_point: options.entryPoint });
      return findOrCreateScan(request);
    },
    onSuccess: (data) => {
      // The scan itself finishes server-side; what completes here is the entry
      // that resolves to a scorecard. The grade and score arrive with the
      // scorecard view (`scanner_scorecard_viewed`), not with this response.
      track("scanner_scan_completed", {
        scan_id: data.slug,
        grade: null,
        total_score: null,
      });
      // A newly generated scan invalidates any cached scan/scorecard state so a
      // stale prior report for this URL is refetched.
      if (data.created) {
        queryClient.invalidateQueries({ queryKey: ["scanner"] });
      }
      options.onSuccess?.(data);
    },
    onError: (error) => {
      track("scanner_scan_failed", { error_code: toErrorCode(error) });
      options.onError?.(error);
    },
  });
}
