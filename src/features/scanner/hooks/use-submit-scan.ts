"use client";

import { useMutation } from "@tanstack/react-query";
import { submitScan } from "../services/scanner.service";
import type { SubmitScanRequest, SubmitScanResponse } from "../types";

interface UseSubmitScanOptions {
  onSuccess?: (data: SubmitScanResponse) => void;
  onError?: (error: Error & { status?: number }) => void;
}

export function useSubmitScan(options: UseSubmitScanOptions = {}) {
  return useMutation<SubmitScanResponse, Error & { status?: number }, SubmitScanRequest>({
    mutationFn: submitScan,
    onSuccess: options.onSuccess,
    onError: options.onError,
  });
}
