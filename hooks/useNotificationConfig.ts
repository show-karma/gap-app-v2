import { useMutation } from "@tanstack/react-query";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";

// ── Types ──

export type NotificationProviderType = "TELEGRAM" | "SLACK";

export interface TestNotificationConfigRequest {
  providerType: NotificationProviderType;
  botToken?: string | null;
  chatId?: string | null;
  chatIds?: string[];
  webhookUrl?: string | null;
  webhookUrls?: string[];
}

interface TestNotificationConfigResponse {
  success: boolean;
  message?: string;
}

// ── Hooks ──

export const useTestNotificationConfig = (communityIdOrSlug: string | undefined) => {
  return useMutation<TestNotificationConfigResponse, Error, TestNotificationConfigRequest>({
    mutationFn: async (config) => {
      if (!communityIdOrSlug) {
        throw new Error("Community ID is required");
      }

      // TODO(#1775): add zod schema
      const data = await api.post<TestNotificationConfigResponse>(
        INDEXER.NOTIFICATION_CONFIG.TEST_CONFIG(communityIdOrSlug),
        config
      );

      // Treat a missing/null response as a hard error so the calling
      // mutation lands in onError. Returning `{ success: false }` here would
      // squash the failure into the success path and leave callers with no
      // way to distinguish "test ran and the provider rejected the message"
      // from "we never got a usable response from our own backend".
      if (!data || typeof data.success !== "boolean") {
        throw new Error("Test notification: no response from server");
      }

      return data;
    },
  });
};
