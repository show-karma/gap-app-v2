"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  issueScannerApiKey,
  listScannerApiKeys,
  revokeScannerApiKey,
} from "../services/scanner.service";
import type { IssuedScannerApiKey, IssueScannerApiKeyRequest, ScannerApiKey } from "../types";

const QUERY_KEY = ["scanner", "my-api-keys"] as const;

export function useMyScannerKeys() {
  return useQuery<ScannerApiKey[], Error & { status?: number }>({
    queryKey: QUERY_KEY,
    queryFn: listScannerApiKeys,
  });
}

interface UseIssueOptions {
  onSuccess?: (issued: IssuedScannerApiKey) => void;
  onError?: (error: Error & { status?: number }) => void;
}

export function useIssueScannerKey(options: UseIssueOptions = {}) {
  const queryClient = useQueryClient();
  return useMutation<IssuedScannerApiKey, Error & { status?: number }, IssueScannerApiKeyRequest>({
    mutationFn: issueScannerApiKey,
    onSuccess: (issued) => {
      // Optimistic insert so the new key appears in the list before refetch.
      queryClient.setQueryData<ScannerApiKey[]>(QUERY_KEY, (prev) =>
        prev ? [issued.record, ...prev] : [issued.record]
      );
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      options.onSuccess?.(issued);
    },
    onError: options.onError,
  });
}

interface UseRevokeOptions {
  onSuccess?: () => void;
  onError?: (error: Error & { status?: number }) => void;
}

export function useRevokeScannerKey(options: UseRevokeOptions = {}) {
  const queryClient = useQueryClient();
  return useMutation<void, Error & { status?: number }, string>({
    mutationFn: revokeScannerApiKey,
    onSuccess: (_, keyId) => {
      // Optimistic removal so the key disappears before the refetch lands.
      queryClient.setQueryData<ScannerApiKey[]>(QUERY_KEY, (prev) =>
        prev ? prev.filter((key) => key.id !== keyId) : prev
      );
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      options.onSuccess?.();
    },
    onError: options.onError,
  });
}
