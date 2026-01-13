"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as payoutService from "../services/payout-disbursement.service";
import type {
  CreateDisbursementsRequest,
  PaginatedDisbursementsResponse,
  PayoutDisbursement,
  RecordSafeTransactionRequest,
  UpdateStatusRequest,
} from "../types/payout-disbursement";

/**
 * Query key factory for payout disbursement queries
 * Provides consistent, type-safe query keys for cache management
 */
export const payoutDisbursementKeys = {
  all: ["payoutDisbursement"] as const,
  grantHistory: (grantUID: string, page?: number, limit?: number) =>
    [...payoutDisbursementKeys.all, "grantHistory", grantUID, { page, limit }] as const,
  grantTotal: (grantUID: string) =>
    [...payoutDisbursementKeys.all, "grantTotal", grantUID] as const,
  communityPending: (communityUID: string, page?: number, limit?: number) =>
    [...payoutDisbursementKeys.all, "communityPending", communityUID, { page, limit }] as const,
  safeAwaiting: (safeAddress: string, page?: number, limit?: number) =>
    [...payoutDisbursementKeys.all, "safeAwaiting", safeAddress, { page, limit }] as const,
} as const;

/**
 * Hook for fetching payout history for a grant
 */
export function usePayoutHistory(
  grantUID: string,
  page?: number,
  limit?: number,
  options?: { enabled?: boolean }
) {
  return useQuery<PaginatedDisbursementsResponse, Error>({
    queryKey: payoutDisbursementKeys.grantHistory(grantUID, page, limit),
    queryFn: () => payoutService.getPayoutHistory(grantUID, page, limit),
    enabled: options?.enabled ?? !!grantUID,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook for fetching total disbursed amount for a grant
 */
export function useTotalDisbursed(grantUID: string, options?: { enabled?: boolean }) {
  return useQuery<string, Error>({
    queryKey: payoutDisbursementKeys.grantTotal(grantUID),
    queryFn: () => payoutService.getTotalDisbursed(grantUID),
    enabled: options?.enabled ?? !!grantUID,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook for fetching pending disbursements for a community
 */
export function usePendingDisbursements(
  communityUID: string,
  page?: number,
  limit?: number,
  options?: { enabled?: boolean }
) {
  return useQuery<PaginatedDisbursementsResponse, Error>({
    queryKey: payoutDisbursementKeys.communityPending(communityUID, page, limit),
    queryFn: () => payoutService.getPendingDisbursements(communityUID, page, limit),
    enabled: options?.enabled ?? !!communityUID,
    staleTime: 1000 * 60 * 1, // 1 minute
  });
}

/**
 * Hook for fetching disbursements awaiting signatures for a Safe
 */
export function useAwaitingSignaturesDisbursements(
  safeAddress: string,
  page?: number,
  limit?: number,
  options?: { enabled?: boolean }
) {
  return useQuery<PaginatedDisbursementsResponse, Error>({
    queryKey: payoutDisbursementKeys.safeAwaiting(safeAddress, page, limit),
    queryFn: () => payoutService.getAwaitingSignaturesDisbursements(safeAddress, page, limit),
    enabled: options?.enabled ?? !!safeAddress,
    staleTime: 1000 * 60 * 1, // 1 minute
  });
}

/**
 * Hook for creating disbursements
 */
export function useCreateDisbursements(options?: {
  onSuccess?: (data: PayoutDisbursement[]) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation<PayoutDisbursement[], Error, CreateDisbursementsRequest>({
    mutationFn: (request) => payoutService.createDisbursements(request),
    onSuccess: (data, variables) => {
      // Invalidate pending disbursements for the community
      queryClient.invalidateQueries({
        queryKey: [...payoutDisbursementKeys.all, "communityPending", variables.communityUID],
      });
      // Invalidate grant history and totals for all affected grants
      for (const grant of variables.grants) {
        queryClient.invalidateQueries({
          queryKey: payoutDisbursementKeys.grantHistory(grant.grantUID),
        });
        queryClient.invalidateQueries({
          queryKey: payoutDisbursementKeys.grantTotal(grant.grantUID),
        });
      }
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
}

/**
 * Hook for recording a Safe transaction for a disbursement
 */
export function useRecordSafeTransaction(options?: {
  onSuccess?: (data: PayoutDisbursement) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation<
    PayoutDisbursement,
    Error,
    { disbursementId: string; request: RecordSafeTransactionRequest }
  >({
    mutationFn: ({ disbursementId, request }) =>
      payoutService.recordSafeTransaction(disbursementId, request),
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: [...payoutDisbursementKeys.all, "communityPending", data.communityUID],
      });
      queryClient.invalidateQueries({
        queryKey: payoutDisbursementKeys.grantHistory(data.grantUID),
      });
      queryClient.invalidateQueries({
        queryKey: [...payoutDisbursementKeys.all, "safeAwaiting", data.safeAddress],
      });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
}

/**
 * Hook for updating disbursement status
 */
export function useUpdateDisbursementStatus(options?: {
  onSuccess?: (data: PayoutDisbursement) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation<
    PayoutDisbursement,
    Error,
    { disbursementId: string; request: UpdateStatusRequest }
  >({
    mutationFn: ({ disbursementId, request }) =>
      payoutService.updateDisbursementStatus(disbursementId, request),
    onSuccess: (data) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({
        queryKey: [...payoutDisbursementKeys.all, "communityPending", data.communityUID],
      });
      queryClient.invalidateQueries({
        queryKey: payoutDisbursementKeys.grantHistory(data.grantUID),
      });
      queryClient.invalidateQueries({
        queryKey: payoutDisbursementKeys.grantTotal(data.grantUID),
      });
      queryClient.invalidateQueries({
        queryKey: [...payoutDisbursementKeys.all, "safeAwaiting", data.safeAddress],
      });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
}
