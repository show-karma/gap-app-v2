"use client";

import * as Sentry from "@sentry/nextjs";
import { useCallback } from "react";
import { TokenManager } from "@/utilities/auth/token-manager";
import { envVars } from "@/utilities/enviromentVars";
import { useAgentChatStore } from "@/store/agentChat";

export type RatingValue = 1 | -1;

export interface UseChatRatingResult {
  rating: RatingValue | null;
  /**
   * Submit a thumbs rating. Returns true on success, false on any failure
   * (network, non-2xx, missing traceId). The caller is expected to use
   * the boolean to decide whether to clear UI state — silently dropping
   * a failure would lose user-typed comments without any feedback.
   */
  submit: (value: RatingValue, comment?: string) => Promise<boolean>;
}

export function useChatRating(
  messageId: string,
  traceId: string | undefined
): UseChatRatingResult {
  const rating = useAgentChatStore(
    (state) => state.messages.find((m) => m.id === messageId)?.rating ?? null
  );

  const submit = useCallback(
    async (value: RatingValue, comment?: string): Promise<boolean> => {
      if (!traceId) return false;

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
          // Capture the response body for triage — Langfuse 4xx errors
          // (invalid traceId, malformed payload) carry diagnostic detail
          // that's lost if we only stash the status code.
          const responseBody = await response.text().catch(() => "");
          throw new Error(
            `agent/rating returned ${response.status}: ${responseBody.slice(0, 500)}`
          );
        }

        useAgentChatStore.getState().setMessageRating(messageId, value);
        return true;
      } catch (err: unknown) {
        Sentry.captureException(err, {
          tags: { feature: "agent-chat-rating" },
          extra: { messageId, traceId, value },
        });
        return false;
      }
    },
    [messageId, traceId]
  );

  return { rating, submit };
}
