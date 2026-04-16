"use client";

import { useMutation } from "@tanstack/react-query";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

// ── Types ──

export type NotificationProviderType = "TELEGRAM" | "SLACK";

export interface TestNotificationConfigRequest {
  providerType: NotificationProviderType;
  botToken?: string | null;
  chatId?: string | null;
  webhookUrl?: string | null;
}

// ── Hooks ──

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
