"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { INDEXER } from "@/utilities/indexer";
import fetchData from "@/utilities/fetchData";

// ── Types ──

export type NotificationProviderType = "TELEGRAM" | "SLACK";

export interface NotificationProviderConfig {
  id: string;
  communityUID: string;
  programId: string | null;
  providerType: NotificationProviderType;
  botToken: string | null;
  chatId: string | null;
  webhookUrl: string | null;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SaveNotificationConfigRequest {
  programId?: string | null;
  providerType: NotificationProviderType;
  botToken?: string | null;
  chatId?: string | null;
  webhookUrl?: string | null;
  isEnabled: boolean;
}

export interface TestNotificationConfigRequest {
  providerType: NotificationProviderType;
  botToken?: string | null;
  chatId?: string | null;
  webhookUrl?: string | null;
}

// ── Query keys ──

const NOTIFICATION_CONFIG_STALE_TIME = 10 * 60 * 1000; // 10 minutes

const NOTIFICATION_QUERY_KEYS = {
  configs: (communityIdOrSlug: string) =>
    ["notification-config", communityIdOrSlug] as const,
};

// ── Hooks ──

export const useNotificationConfigs = (
  communityIdOrSlug: string | undefined,
  options?: { enabled?: boolean }
) => {
  const query = useQuery<{ configs: NotificationProviderConfig[] } | null>({
    queryKey: NOTIFICATION_QUERY_KEYS.configs(communityIdOrSlug || ""),
    queryFn: async () => {
      if (!communityIdOrSlug) return null;

      const [data, error, , ] = await fetchData<{ configs: NotificationProviderConfig[] }>(
        INDEXER.NOTIFICATION_CONFIG.GET_CONFIGS(communityIdOrSlug),
        "GET",
        {},
        {},
        {},
        true
      );

      if (error) {
        const errorLower = error.toLowerCase();
        if (errorLower.includes("not found") || errorLower.includes("not configured")) {
          return null;
        }
        throw new Error(error);
      }

      return data ?? null;
    },
    enabled: options?.enabled !== false && !!communityIdOrSlug,
    staleTime: NOTIFICATION_CONFIG_STALE_TIME,
  });

  return {
    configs: query.data?.configs ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    isError: query.isError,
    refetch: query.refetch,
  };
};

export const useSaveNotificationConfig = (communityIdOrSlug: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation<NotificationProviderConfig, Error, SaveNotificationConfigRequest>({
    mutationFn: async (config) => {
      if (!communityIdOrSlug) {
        throw new Error("Community ID is required");
      }

      const [data, error, , ] = await fetchData<NotificationProviderConfig>(
        INDEXER.NOTIFICATION_CONFIG.UPSERT_CONFIG(communityIdOrSlug),
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
        throw new Error("No data returned from save notification config request");
      }

      return data;
    },
    onSuccess: () => {
      if (communityIdOrSlug) {
        queryClient.invalidateQueries({
          queryKey: NOTIFICATION_QUERY_KEYS.configs(communityIdOrSlug),
        });
      }
    },
  });
};

export const useDeleteNotificationConfig = (communityIdOrSlug: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: async (configId) => {
      const [data, error, , ] = await fetchData<{ success: boolean }>(
        INDEXER.NOTIFICATION_CONFIG.DELETE_CONFIG(configId),
        "DELETE",
        {},
        {},
        {},
        true
      );

      if (error) {
        throw new Error(error);
      }

      return data ?? { success: true };
    },
    onSuccess: () => {
      if (communityIdOrSlug) {
        queryClient.invalidateQueries({
          queryKey: NOTIFICATION_QUERY_KEYS.configs(communityIdOrSlug),
        });
      }
    },
  });
};

export const useTestNotificationConfig = (communityIdOrSlug: string | undefined) => {
  return useMutation<{ success: boolean; message?: string }, Error, TestNotificationConfigRequest>({
    mutationFn: async (config) => {
      if (!communityIdOrSlug) {
        throw new Error("Community ID is required");
      }

      const [data, error, , ] = await fetchData<{ success: boolean; message?: string }>(
        INDEXER.NOTIFICATION_CONFIG.TEST_CONFIG(communityIdOrSlug),
        "POST",
        config,
        {},
        {},
        true
      );

      if (error) {
        throw new Error(error);
      }

      return data ?? { success: false, message: "No response from test" };
    },
  });
};
