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

/**
 * Real Error subclass — supports `instanceof TelegramPairingError` checks at
 * call sites. Previously a plain Error with a stamped `status` field cast via
 * `as`, which made instanceof checks return false.
 */
export class TelegramPairingError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "TelegramPairingError";
    this.status = status;
    // Preserve prototype chain for `instanceof` after transpilation to ES5.
    Object.setPrototypeOf(this, TelegramPairingError.prototype);
  }
}

// ── Hooks ──

export const useStartTelegramPairing = (communitySlug: string | undefined) => {
  return useMutation<TelegramPairStartResponse, TelegramPairingError, void>({
    mutationFn: async () => {
      if (!communitySlug) {
        throw new TelegramPairingError("Community slug is required", 400);
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
        throw new TelegramPairingError(error || "Failed to start pairing", status);
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
        throw new TelegramPairingError("Community slug is required", 400);
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
        throw new TelegramPairingError(error || "Verification failed", status);
      }

      return data;
    },
    onSuccess: (data) => {
      if (!communitySlug) return;
      const queryKey = ["community-config", communitySlug];
      // Patch the cache directly so the chat-IDs list reflects the new
      // pairing immediately. The verifyPairing response includes the
      // canonical chat data (id, title), so this patch IS the authoritative
      // update — there's no need to invalidate and refetch. Invalidating
      // here would defeat the patch by triggering exactly the refetch race
      // we're trying to avoid (it would clobber unsaved local form edits in
      // NotificationSettingsPage). If the cached entry needs to be
      // refreshed for some reason (e.g. the bot was kicked from the chat),
      // the user can navigate away and back.
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
    },
  });
};
