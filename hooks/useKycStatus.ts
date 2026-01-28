"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  KycBatchStatusResponse,
  KycConfigResponse,
  KycFormUrlRequest,
  KycFormUrlResponse,
  KycStatusResponse,
  KycVerificationType,
} from "@/types/kyc";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

export const KYC_QUERY_KEYS = {
  all: ["kyc"] as const,
  status: (projectUID: string, communityUID: string) =>
    [...KYC_QUERY_KEYS.all, "status", projectUID, communityUID] as const,
  config: (communityIdOrSlug: string) =>
    [...KYC_QUERY_KEYS.all, "config", communityIdOrSlug] as const,
  batchStatuses: (communityUID: string, projectUIDs: string[]) =>
    [...KYC_QUERY_KEYS.all, "batch", communityUID, projectUIDs.join(",")] as const,
};

/**
 * Hook to fetch KYC verification status for a single project in a community
 */
export const useKycStatus = (
  projectUID: string | undefined,
  communityUID: string | undefined,
  options?: { enabled?: boolean }
) => {
  const query = useQuery<KycStatusResponse | null>({
    queryKey: KYC_QUERY_KEYS.status(projectUID || "", communityUID || ""),
    queryFn: async () => {
      if (!projectUID || !communityUID) return null;

      const [data, error] = await fetchData<KycStatusResponse>(
        INDEXER.KYC.GET_STATUS(projectUID, communityUID),
        "GET",
        {},
        {},
        {},
        true
      );

      if (error) {
        throw new Error(error);
      }

      return data;
    },
    enabled: options?.enabled !== false && !!projectUID && !!communityUID,
    staleTime: 5 * 60 * 1000,
  });

  return {
    status: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    isError: query.isError,
    refetch: query.refetch,
  };
};

/**
 * Hook to fetch KYC provider configuration for a community
 */
export const useKycConfig = (
  communityIdOrSlug: string | undefined,
  options?: { enabled?: boolean }
) => {
  const query = useQuery<KycConfigResponse | null>({
    queryKey: KYC_QUERY_KEYS.config(communityIdOrSlug || ""),
    queryFn: async () => {
      if (!communityIdOrSlug) return null;

      const [data, error] = await fetchData<KycConfigResponse>(
        INDEXER.KYC.GET_CONFIG(communityIdOrSlug),
        "GET",
        {},
        {},
        {},
        false
      );

      if (error) {
        console.warn("KYC config fetch failed:", error);
        return null;
      }

      return data ?? null;
    },
    enabled: options?.enabled !== false && !!communityIdOrSlug,
    staleTime: 10 * 60 * 1000,
  });

  return {
    config: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    isError: query.isError,
    refetch: query.refetch,
    isEnabled: query.data?.isEnabled ?? false,
  };
};

/**
 * Hook to fetch batch KYC statuses for multiple projects in a community
 */
export const useKycBatchStatuses = (
  communityUID: string | undefined,
  projectUIDs: string[],
  options?: { enabled?: boolean }
) => {
  const query = useQuery<Map<string, KycStatusResponse | null>>({
    queryKey: KYC_QUERY_KEYS.batchStatuses(communityUID || "", projectUIDs),
    queryFn: async () => {
      if (!communityUID || projectUIDs.length === 0) {
        return new Map();
      }

      const [data, error] = await fetchData<KycBatchStatusResponse>(
        INDEXER.KYC.GET_BATCH_STATUSES(communityUID),
        "POST",
        { projectUIDs },
        {},
        {},
        true
      );

      if (error) {
        throw new Error(error);
      }

      const statusMap = new Map<string, KycStatusResponse | null>();
      if (data?.statuses) {
        Object.entries(data.statuses).forEach(([projectUID, status]) => {
          statusMap.set(projectUID, status);
        });
      }

      return statusMap;
    },
    enabled: options?.enabled !== false && !!communityUID && projectUIDs.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  return {
    statuses: query.data || new Map<string, KycStatusResponse | null>(),
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    isError: query.isError,
    refetch: query.refetch,
    getStatus: (projectUID: string) => query.data?.get(projectUID) ?? null,
  };
};

/**
 * Hook to get KYC form URL with application reference
 */
export const useKycFormUrl = () => {
  const queryClient = useQueryClient();

  return useMutation<
    KycFormUrlResponse,
    Error,
    {
      communityIdOrSlug: string;
      projectUID: string;
      verificationType: KycVerificationType;
      walletAddress?: string;
    }
  >({
    mutationFn: async ({ communityIdOrSlug, projectUID, verificationType, walletAddress }) => {
      const requestBody: KycFormUrlRequest = {
        projectUID,
        verificationType,
        walletAddress,
      };

      const [data, error] = await fetchData<KycFormUrlResponse>(
        INDEXER.KYC.GET_FORM_URL(communityIdOrSlug),
        "POST",
        requestBody,
        {},
        {},
        true
      );

      if (error) {
        throw new Error(error);
      }

      if (!data) {
        throw new Error("No data returned from KYC form URL request");
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: KYC_QUERY_KEYS.status(variables.projectUID, variables.communityIdOrSlug),
      });
    },
  });
};

/**
 * Hook to save KYC provider configuration for a community
 */
export interface SaveKycConfigRequest {
  providerType: "TREOVA";
  providerName: string;
  kycFormUrl: string;
  kybFormUrl: string;
  validityMonths: number;
  isEnabled: boolean;
}

export const useSaveKycConfig = (communityIdOrSlug: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation<KycConfigResponse, Error, SaveKycConfigRequest>({
    mutationFn: async (config) => {
      if (!communityIdOrSlug) {
        throw new Error("Community ID is required");
      }

      const [data, error] = await fetchData<KycConfigResponse>(
        INDEXER.KYC.GET_CONFIG(communityIdOrSlug),
        "PUT",
        config,
        {},
        {},
        true
      );

      if (error) {
        throw new Error(error);
      }

      if (!data) {
        throw new Error("No data returned from save KYC config request");
      }

      return data;
    },
    onSuccess: () => {
      if (communityIdOrSlug) {
        queryClient.invalidateQueries({
          queryKey: KYC_QUERY_KEYS.config(communityIdOrSlug),
        });
      }
    },
  });
};
