"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiKeyService } from "../services/api-key.service";
import type { CreateApiKeyResponse } from "../types/api-key";

export const apiKeyKeys = {
  all: ["apiKeys"] as const,
  user: (address: string) => [...apiKeyKeys.all, address] as const,
} as const;

export function useApiKey(address: string | undefined) {
  return useQuery({
    queryKey: apiKeyKeys.user(address ?? ""),
    queryFn: () => apiKeyService.get(),
    enabled: !!address,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateApiKey(options?: {
  onSuccess?: (data: CreateApiKeyResponse) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name?: string) => apiKeyService.create(name),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.all });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

export function useRevokeApiKey(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiKeyService.revoke(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.all });
      options?.onSuccess?.();
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}
