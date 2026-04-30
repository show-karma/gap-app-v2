"use client";

import * as Sentry from "@sentry/nextjs";
import { useCallback } from "react";
import { TokenManager } from "@/utilities/auth/token-manager";
import { envVars } from "@/utilities/enviromentVars";
import { useAgentChatStore } from "@/store/agentChat";

export type RatingValue = 1 | -1;

export interface UseChatRatingResult {
  rating: RatingValue | null;
  submit: (value: RatingValue, comment?: string) => Promise<void>;
}

export function useChatRating(
  messageId: string,
  traceId: string | undefined
): UseChatRatingResult {
  const rating = useAgentChatStore(
    (state) => state.messages.find((m) => m.id === messageId)?.rating ?? null
  );

  const submit = useCallback(
    async (value: RatingValue, comment?: string) => {
      if (!traceId) return;

      try {
        const token = await TokenManager.getToken();
        const response = await fetch(
          `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}/v2/agent/rating`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              traceId,
              value,
              ...(comment ? { comment } : {}),
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`agent/rating returned ${response.status}`);
        }

        useAgentChatStore.getState().setMessageRating(messageId, value);
      } catch (err: unknown) {
        Sentry.captureException(err, {
          tags: { feature: "agent-chat-rating" },
          extra: { messageId, traceId, value },
        });
      }
    },
    [messageId, traceId]
  );

  return { rating, submit };
}
