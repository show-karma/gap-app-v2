"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { findOrCreateScan } from "../services/scanner.service";
import type { ScanEntryResult, SubmitScanRequest } from "../types";

interface UseSubmitScanOptions {
  onSuccess?: (data: ScanEntryResult) => void;
  onError?: (error: Error & { status?: number }) => void;
}

// View-first entry mutation. Looks up an existing report for the URL (free)
// and only generates a new scan (spending a credit) when none exists — the
// ora.ai shared-report model. `data.created` tells the caller whether a scan
// was generated or an existing report was surfaced.
export function useSubmitScan(options: UseSubmitScanOptions = {}) {
  const queryClient = useQueryClient();
  return useMutation<ScanEntryResult, Error & { status?: number }, SubmitScanRequest>({
    mutationFn: findOrCreateScan,
    onSuccess: (data) => {
      // A newly generated scan invalidates any cached scan/scorecard state so a
      // stale prior report for this URL is refetched.
      if (data.created) {
        queryClient.invalidateQueries({ queryKey: ["scanner"] });
      }
      options.onSuccess?.(data);
    },
    onError: options.onError,
  });
}
