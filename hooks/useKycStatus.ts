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

// Cache duration constants
const KYC_STATUS_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const KYC_CONFIG_STALE_TIME = 10 * 60 * 1000; // 10 minutes

/**
 * Determine if identifier is an application reference (APP-...) vs project UID (0x...)
 */
const isApplicationReference = (identifier: string): boolean => identifier.startsWith("APP-");

export const KYC_QUERY_KEYS = {
  all: ["kyc"] as const,
  status: (projectUID: string, communityUID: string) =>
    [...KYC_QUERY_KEYS.all, "status", projectUID, communityUID] as const,
  statusByAppRef: (referenceNumber: string) =>
    [...KYC_QUERY_KEYS.all, "status-by-app-ref", referenceNumber] as const,
  config: (communityIdOrSlug: string) =>
    [...KYC_QUERY_KEYS.all, "config", communityIdOrSlug] as const,
  batchStatuses: (communityUID: string, projectUIDs: string[]) =>
    [...KYC_QUERY_KEYS.all, "batch", communityUID, projectUIDs.join(",")] as const,
};

/**
 * Hook to fetch KYC verification status
 *
 * Automatically uses the correct endpoint based on identifier type:
 * - Application references (APP-...) use /v2/funding-applications/:referenceNumber/kyc-status
 * - Project UIDs (0x...) use /v2/projects/:projectUID/communities/:communityUID/kyc-status
 *
 * @param identifier - Can be projectUID (0x...) or application referenceNumber (APP-...)
 * @param communityUID - Required only when identifier is a projectUID
 * @param options - Query options
 */
export const useKycStatus = (
  identifier: string | undefined,
  communityUID: string | undefined,
  options?: { enabled?: boolean }
) => {
  const isAppRef = identifier ? isApplicationReference(identifier) : false;

  const query = useQuery<KycStatusResponse | null>({
    queryKey: isAppRef
      ? KYC_QUERY_KEYS.statusByAppRef(identifier || "")
      : KYC_QUERY_KEYS.status(identifier || "", communityUID || ""),
    queryFn: async () => {
      if (!identifier) return null;

      // Use application-specific endpoint for APP- references
      if (isAppRef) {
        const [data, error] = await fetchData<KycStatusResponse>(
          INDEXER.KYC.GET_STATUS_BY_APP_REF(identifier),
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
      }

      // Use project endpoint for 0x... identifiers (requires communityUID)
      if (!communityUID) return null;

      const [data, error] = await fetchData<KycStatusResponse>(
        INDEXER.KYC.GET_STATUS(identifier, communityUID),
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
    enabled: options?.enabled !== false && !!identifier && (isAppRef || !!communityUID),
    staleTime: KYC_STATUS_STALE_TIME,
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
        throw new Error(error);
      }

      return data ?? null;
    },
    enabled: options?.enabled !== false && !!communityIdOrSlug,
    staleTime: KYC_CONFIG_STALE_TIME,
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
    staleTime: KYC_STATUS_STALE_TIME,
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
      // Invalidate single status query
      queryClient.invalidateQueries({
        queryKey: KYC_QUERY_KEYS.status(variables.projectUID, variables.communityIdOrSlug),
      });
      // Also invalidate batch statuses that might contain this project
      queryClient.invalidateQueries({
        queryKey: [...KYC_QUERY_KEYS.all, "batch", variables.communityIdOrSlug],
        exact: false,
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
