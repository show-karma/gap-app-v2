"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import type { CommunityConfig } from "./useCommunityConfig";

// ── Types ──

export interface TelegramPairStartResponse {
  token: string;
  expiresAt: string;
}

export interface TelegramPairVerifyResponse {
  chatId: string;
  chatTitle: string;
  chatType: string;
  alreadyPaired: boolean;
}

export interface TelegramPairingError extends Error {
  status: number;
}

const createPairingError = (message: string, status: number): TelegramPairingError => {
  const error = new Error(message) as TelegramPairingError;
  error.status = status;
  return error;
};

// ── Hooks ──

export const useStartTelegramPairing = (communitySlug: string | undefined) => {
  return useMutation<TelegramPairStartResponse, TelegramPairingError, void>({
    mutationFn: async () => {
      if (!communitySlug) {
        throw createPairingError("Community slug is required", 400);
      }

      const [data, error, , status] = await fetchData<TelegramPairStartResponse>(
        INDEXER.COMMUNITY.CONFIG.TELEGRAM_PAIR_START(communitySlug),
        "POST",
        {},
        {},
        {},
        true
      );

      if (error || !data) {
        throw createPairingError(error || "Failed to start pairing", status);
      }

      return data;
    },
  });
};

export const useVerifyTelegramPairing = (communitySlug: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation<TelegramPairVerifyResponse, TelegramPairingError, { token: string }>({
    mutationFn: async ({ token }) => {
      if (!communitySlug) {
        throw createPairingError("Community slug is required", 400);
      }

      const [data, error, , status] = await fetchData<TelegramPairVerifyResponse>(
        INDEXER.COMMUNITY.CONFIG.TELEGRAM_PAIR_VERIFY(communitySlug),
        "POST",
        { token },
        {},
        {},
        true
      );

      if (error || !data) {
        throw createPairingError(error || "Verification failed", status);
      }

      return data;
    },
    onSuccess: (data) => {
      if (!communitySlug) return;
      const queryKey = ["community-config", communitySlug];
      // Patch the cache directly so the chat-IDs list reflects the new
      // pairing immediately (and isn't subject to refetch races that could
      // clobber unsaved local form edits).
      queryClient.setQueryData<CommunityConfig | null>(queryKey, (old) => {
        if (!old) return old;
        const existingChats = old.telegramChats ?? [];
        const alreadyPaired = existingChats.some((c) => c.id === data.chatId);
        const nextChats = alreadyPaired
          ? existingChats
          : [...existingChats, { id: data.chatId, name: data.chatTitle }];
        return {
          ...old,
          telegramChats: nextChats,
          telegramEnabled: true, // backend auto-enables on first pair
        };
      });
      queryClient.invalidateQueries({ queryKey });
    },
  });
};
