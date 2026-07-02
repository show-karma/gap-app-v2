"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { submitScan } from "../services/scanner.service";
import type { SubmitScanRequest, SubmitScanResponse } from "../types";

interface UseSubmitScanOptions {
  onSuccess?: (data: SubmitScanResponse) => void;
  onError?: (error: Error & { status?: number }) => void;
}

export function useSubmitScan(options: UseSubmitScanOptions = {}) {
  const queryClient = useQueryClient();
  return useMutation<SubmitScanResponse, Error & { status?: number }, SubmitScanRequest>({
    mutationFn: submitScan,
    onSuccess: (data) => {
      // A new scan invalidates any cached scan/scorecard state (e.g. a re-scan
      // of a URL whose previous report is in the cache).
      queryClient.invalidateQueries({ queryKey: ["scanner"] });
      options.onSuccess?.(data);
    },
    onError: options.onError,
  });
}
