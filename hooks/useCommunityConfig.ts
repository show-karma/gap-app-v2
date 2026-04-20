import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

/**
 * One paired Telegram chat. The `name` is the chat title that Telegram
 * returns at pairing time (chat.title). May be empty for legacy entries
 * created before names were persisted, or for chat IDs that admins typed
 * in by hand instead of using the pairing flow.
 */
export interface TelegramChat {
  id: string;
  name: string;
}

export interface CommunityConfig {
  public?: boolean;
  rank?: number;
  disableReviewerEmails?: boolean;
  /**
   * Paired Telegram chats the platform-owned Karma bot will post to.
   * Bot token is platform-owned (server env), no longer per-community.
   *
   * Replaces the legacy `telegramChatIds: string[]` shape.
   */
  telegramChats?: TelegramChat[];
  telegramEnabled?: boolean;
  slackWebhookUrls?: string[];
  slackEnabled?: boolean;
}

export const useCommunityConfig = (slug: string, enabled: boolean = true) => {
  return useQuery<CommunityConfig | null>({
    queryKey: ["community-config", slug],
    queryFn: async () => {
      const [data, error] = await fetchData(
        INDEXER.COMMUNITY.CONFIG.GET(slug),
        "GET",
        {},
        {},
        {},
        true
      );
      return error ? null : data?.config || null;
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
      const [data, error] = await fetchData(
        INDEXER.COMMUNITY.CONFIG.UPDATE(slug),
        "PUT",
        config,
        {},
        {},
        true // authenticated
      );
      if (error) throw new Error(error);
      return data;
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
    },
  });
};
