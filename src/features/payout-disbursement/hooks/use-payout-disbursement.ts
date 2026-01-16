"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import * as payoutService from "../services/payout-disbursement.service";
import type {
  CommunityPayoutsOptions,
  CommunityPayoutsResponse,
  CreateDisbursementsRequest,
  PaginatedDisbursementsResponse,
  PayoutDisbursement,
  PayoutGrantConfig,
  RecordSafeTransactionRequest,
  SavePayoutConfigRequest,
  SavePayoutConfigResponse,
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
  communityRecent: (communityUID: string, page?: number, limit?: number, status?: string) =>
    [
      ...payoutDisbursementKeys.all,
      "communityRecent",
      communityUID,
      { page, limit, status },
    ] as const,
  communityPayouts: (communityUID: string, options?: CommunityPayoutsOptions) =>
    [...payoutDisbursementKeys.all, "communityPayouts", communityUID, options] as const,
  payoutConfigs: {
    all: ["payoutConfig"] as const,
    byCommunity: (communityUID: string) =>
      [...payoutDisbursementKeys.payoutConfigs.all, "community", communityUID] as const,
    byGrant: (grantUID: string) =>
      [...payoutDisbursementKeys.payoutConfigs.all, "grant", grantUID] as const,
  },
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
      queryClient.invalidateQueries({
        queryKey: [...payoutDisbursementKeys.all, "communityRecent", data.communityUID],
      });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
}

/**
 * Hook for fetching recent disbursements for a community (all statuses)
 */
export function useRecentCommunityDisbursements(
  communityUID: string,
  page?: number,
  limit?: number,
  status?: string,
  options?: { enabled?: boolean }
) {
  return useQuery<PaginatedDisbursementsResponse, Error>({
    queryKey: payoutDisbursementKeys.communityRecent(communityUID, page, limit, status),
    queryFn: () => payoutService.getRecentCommunityDisbursements(communityUID, page, limit, status),
    enabled: options?.enabled ?? !!communityUID,
    staleTime: 1000 * 60 * 1, // 1 minute
  });
}

/**
 * Hook for fetching total disbursed amounts for multiple grants in parallel
 * Returns a map of grantUID to total disbursed amount
 */
export function useBatchTotalDisbursed(grantUIDs: string[], options?: { enabled?: boolean }) {
  const queries = useQueries({
    queries: grantUIDs.map((grantUID) => ({
      queryKey: payoutDisbursementKeys.grantTotal(grantUID),
      queryFn: () => payoutService.getTotalDisbursed(grantUID),
      enabled: options?.enabled ?? true,
      staleTime: 1000 * 60 * 5, // 5 minutes
    })),
  });

  // Transform results into a map
  const totalsMap: Record<string, string> = {};
  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);

  grantUIDs.forEach((grantUID, index) => {
    const query = queries[index];
    if (query?.data) {
      totalsMap[grantUID] = query.data;
    }
  });

  return {
    data: totalsMap,
    isLoading,
    isError,
    queries,
  };
}

/**
 * Hook for fetching payout history for multiple grants to determine their status
 * Returns a map of grantUID to latest disbursement status
 */
export function useBatchGrantStatus(grantUIDs: string[], options?: { enabled?: boolean }) {
  const queries = useQueries({
    queries: grantUIDs.map((grantUID) => ({
      queryKey: payoutDisbursementKeys.grantHistory(grantUID, 1, 1), // Only fetch latest
      queryFn: () => payoutService.getPayoutHistory(grantUID, 1, 1),
      enabled: options?.enabled ?? true,
      staleTime: 1000 * 60 * 2, // 2 minutes
    })),
  });

  // Transform results into a map of grantUID to latest status
  const statusMap: Record<
    string,
    {
      status: PayoutDisbursement["status"] | "PENDING" | "PARTIALLY_DISBURSED";
      latestDisbursement?: PayoutDisbursement;
    }
  > = {};
  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);

  grantUIDs.forEach((grantUID, index) => {
    const query = queries[index];
    if (query?.data?.payload?.[0]) {
      statusMap[grantUID] = {
        status: query.data.payload[0].status,
        latestDisbursement: query.data.payload[0],
      };
    } else {
      // No disbursements yet
      statusMap[grantUID] = { status: "PENDING" };
    }
  });

  return {
    data: statusMap,
    isLoading,
    isError,
    queries,
  };
}

/**
 * Hook for fetching community payouts with aggregated disbursement status
 * Returns grants with their project info, payout amounts, and disbursement history
 */
export function useCommunityPayouts(
  communityUID: string,
  options?: CommunityPayoutsOptions,
  queryOptions?: { enabled?: boolean }
) {
  const queryClient = useQueryClient();

  const query = useQuery<CommunityPayoutsResponse, Error>({
    queryKey: payoutDisbursementKeys.communityPayouts(communityUID, options),
    queryFn: () => payoutService.getCommunityPayouts(communityUID, options),
    enabled: queryOptions?.enabled ?? !!communityUID,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: [...payoutDisbursementKeys.all, "communityPayouts", communityUID],
    });
  };

  return {
    ...query,
    invalidate,
  };
}

/**
 * Hook for saving payout configs (payout address and total grant amount)
 */
export function useSavePayoutConfig(options?: {
  onSuccess?: (data: SavePayoutConfigResponse) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation<SavePayoutConfigResponse, Error, SavePayoutConfigRequest>({
    mutationFn: (request) => payoutService.savePayoutConfigs(request),
    onSuccess: (data, variables) => {
      // Invalidate payout configs for the community
      queryClient.invalidateQueries({
        queryKey: payoutDisbursementKeys.payoutConfigs.byCommunity(variables.communityUID),
      });
      // Invalidate community payouts to refresh the admin data view
      queryClient.invalidateQueries({
        queryKey: [...payoutDisbursementKeys.all, "communityPayouts", variables.communityUID],
      });
      // Invalidate individual grant configs
      for (const config of variables.configs) {
        queryClient.invalidateQueries({
          queryKey: payoutDisbursementKeys.payoutConfigs.byGrant(config.grantUID),
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
 * Hook for fetching payout configs for a community
 */
export function usePayoutConfigsByCommunity(communityUID: string, options?: { enabled?: boolean }) {
  return useQuery<PayoutGrantConfig[], Error>({
    queryKey: payoutDisbursementKeys.payoutConfigs.byCommunity(communityUID),
    queryFn: () => payoutService.getPayoutConfigsByCommunity(communityUID),
    enabled: options?.enabled ?? !!communityUID,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook for fetching payout config for a specific grant
 */
export function usePayoutConfigByGrant(grantUID: string, options?: { enabled?: boolean }) {
  return useQuery<PayoutGrantConfig | null, Error>({
    queryKey: payoutDisbursementKeys.payoutConfigs.byGrant(grantUID),
    queryFn: () => payoutService.getPayoutConfigByGrant(grantUID),
    enabled: options?.enabled ?? !!grantUID,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook for deleting a payout config
 */
export function useDeletePayoutConfig(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { grantUID: string; communityUID: string }>({
    mutationFn: ({ grantUID }) => payoutService.deletePayoutConfig(grantUID),
    onSuccess: (_, variables) => {
      // Invalidate the specific grant config
      queryClient.invalidateQueries({
        queryKey: payoutDisbursementKeys.payoutConfigs.byGrant(variables.grantUID),
      });
      // Invalidate community configs
      queryClient.invalidateQueries({
        queryKey: payoutDisbursementKeys.payoutConfigs.byCommunity(variables.communityUID),
      });
      // Invalidate community payouts
      queryClient.invalidateQueries({
        queryKey: [...payoutDisbursementKeys.all, "communityPayouts", variables.communityUID],
      });
      options?.onSuccess?.();
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
}
