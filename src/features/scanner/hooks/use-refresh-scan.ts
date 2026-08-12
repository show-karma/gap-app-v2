"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { refreshScan } from "../services/scanner.service";
import type { SubmitScanResponse } from "../types";

interface UseRefreshScanOptions {
  onSuccess?: (data: SubmitScanResponse) => void;
  onError?: (error: Error & { status?: number }) => void;
}

// Regenerate a site's report. Any logged-in user may regen any site; it spends
// one of their lifetime credits and the fresh scan becomes the new latest
// report. 401 = not logged in (prompt login); 429 = credit cap reached.
export function useRefreshScan(options: UseRefreshScanOptions = {}) {
  const queryClient = useQueryClient();
  return useMutation<SubmitScanResponse, Error & { status?: number }, string>({
    mutationFn: refreshScan,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["scanner"] });
      options.onSuccess?.(data);
    },
    onError: options.onError,
  });
}
