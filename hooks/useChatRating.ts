"use client";

import * as Sentry from "@sentry/nextjs";
import { useCallback } from "react";
import { getLangfuseWeb } from "@/lib/langfuse-web";
import { useAgentChatStore } from "@/store/agentChat";

export type RatingValue = 1 | -1;

export interface UseChatRatingResult {
  rating: RatingValue | null;
  submit: (value: RatingValue, comment?: string) => Promise<void>;
}

export function useChatRating(messageId: string, traceId: string | undefined): UseChatRatingResult {
  const rating = useAgentChatStore(
    (state) => state.messages.find((m) => m.id === messageId)?.rating ?? null
  );

  const submit = useCallback(
    async (value: RatingValue, comment?: string) => {
      if (!traceId) return;

      const client = getLangfuseWeb();
      if (!client) return;

      try {
        await client.score({
          traceId,
          name: "user_rating",
          value,
          ...(comment ? { comment } : {}),
        });
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
