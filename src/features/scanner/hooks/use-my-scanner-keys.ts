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
  return useMutation<
    void,
    Error & { status?: number },
    string,
    { previous: ScannerApiKey[] | undefined }
  >({
    mutationFn: revokeScannerApiKey,
    onMutate: async (keyId) => {
      // Optimistically remove the key from the cache before the server
      // responds so the UI updates immediately. Snapshot the prior cache so
      // onError can roll back if the request fails.
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<ScannerApiKey[]>(QUERY_KEY);
      queryClient.setQueryData<ScannerApiKey[]>(QUERY_KEY, (prev) =>
        prev ? prev.filter((key) => key.id !== keyId) : prev
      );
      return { previous };
    },
    onError: (error, _keyId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEY, context.previous);
      }
      options.onError?.(error);
    },
    onSuccess: () => {
      options.onSuccess?.();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
