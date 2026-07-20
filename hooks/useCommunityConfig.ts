import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";

/**
 * One paired Telegram chat. The `name` is the chat title that Telegram
 * returns at pairing time (chat.title). May be empty for legacy entries
 * created before names were persisted, or for chat IDs that admins typed
 * in by hand instead of using the pairing flow.
 */
const TelegramChatSchema = z
  .object({
    id: z.string(),
    name: z.string(),
  })
  .passthrough();
export type TelegramChat = z.infer<typeof TelegramChatSchema>;

const CommunityConfigSchema = z
  .object({
    public: z.boolean().optional(),
    rank: z.number().optional(),
    disableReviewerEmails: z.boolean().optional(),
    /**
     * Paired Telegram chats the platform-owned Karma bot will post to.
     * Bot token is platform-owned (server env), no longer per-community.
     *
     * Replaces the legacy `telegramChatIds: string[]` shape.
     */
    telegramChats: z.array(TelegramChatSchema).optional(),
    telegramEnabled: z.boolean().optional(),
    slackWebhookUrls: z.array(z.string()).optional(),
    slackEnabled: z.boolean().optional(),
    /**
     * Per-community Markdown overrides for the AccessDenied page body.
     * `undefined` = don't touch on PUT; `null` = clear back to default.
     * Token contract enforced server-side. See
     * gap-indexer/docs/adr/0001-per-community-access-denied-messages.md.
     */
    accessDeniedUnauthenticatedMessage: z.string().nullable().optional(),
    accessDeniedForbiddenMessage: z.string().nullable().optional(),
    accessDeniedApplicantMessage: z.string().nullable().optional(),
  })
  .passthrough();
export type CommunityConfig = z.infer<typeof CommunityConfigSchema>;

const CommunityConfigGetResponseSchema = z
  .object({
    config: CommunityConfigSchema.optional(),
  })
  .passthrough();

export const useCommunityConfig = (slug: string, enabled: boolean = true) => {
  return useQuery<CommunityConfig | null>({
    queryKey: ["community-config", slug],
    queryFn: async () => {
      try {
        const data = await api.get(INDEXER.COMMUNITY.CONFIG.GET(slug), {
          schema: CommunityConfigGetResponseSchema,
        });
        return data?.config || null;
      } catch {
        // SUPPRESSED: matches legacy fetchData semantics (`error ? null :
        // data?.config`) — a missing/failed community config degrades to
        // "no config" rather than surfacing a query error to consumers.
        return null;
      }
    },
    enabled: enabled && !!slug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useCommunityConfigMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { slug: string; config: CommunityConfig },
    { previousConfig: CommunityConfig | null }
  >({
    mutationFn: async ({ slug, config }) => {
      return api.put<void>(INDEXER.COMMUNITY.CONFIG.UPDATE(slug), config);
    },
    onMutate: async ({ slug, config }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["community-config", slug] });

      // Snapshot the previous value
      const previousConfig = queryClient.getQueryData<CommunityConfig | null>([
        "community-config",
        slug,
      ]);

      // Optimistically update to the new value
      queryClient.setQueryData(["community-config", slug], config);

      // Return a context object with the snapshotted value
      return { previousConfig: previousConfig ?? null };
    },
    onError: (_err, { slug }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousConfig) {
        queryClient.setQueryData(["community-config", slug], context.previousConfig);
      }
    },
    onSettled: (_, __, { slug }) => {
      // Always refetch after error or success to ensure we have the latest
      queryClient.invalidateQueries({ queryKey: ["community-config", slug] });
      // Public AccessDenied cache lives under a separate key; invalidate
      // it too so the editor preview + any open AccessDenied pages pick
      // up the new messages without a hard reload.
      queryClient.invalidateQueries({ queryKey: ["access-denied-messages", slug] });
    },
  });
};
