import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { slackOauthService } from "@/services/slackOauth.service";
import type {
  SlackOAuthLinkInput,
  SlackOAuthRegisterWorkspaceInput,
  SlackOAuthUserLink,
  SlackOAuthUserLinksListResponse,
  SlackOAuthWorkspace,
} from "@/types/slack-oauth";
import { slackOauthKeys } from "@/utilities/queryKeys/slackOauth";

/**
 * React Query hooks over `slackOauthService`. Each `queryFn` delegates
 * to the service so hooks stay thin and the service is the single
 * place that talks to the HTTP boundary.
 *
 * Re-exports `SlackOAuthHandleAmbiguousError` so callers can
 * `instanceof`-check the ambiguity case without importing from the
 * service file directly.
 */

export { SlackOAuthHandleAmbiguousError } from "@/services/slackOauth.service";

const DEFAULT_STALE_TIME_MS = 60_000;

// ── Queries ───────────────────────────────────────────────────────────

export function useSlackOauthWorkspace(slug: string | undefined) {
  return useQuery<SlackOAuthWorkspace | null>({
    queryKey: slackOauthKeys.workspace(slug),
    enabled: !!slug,
    staleTime: DEFAULT_STALE_TIME_MS,
    queryFn: () => slackOauthService.getWorkspace(slug as string),
  });
}

export interface UseSlackOauthUserLinksQuery {
  karmaUserId?: string;
  page?: number;
  limit?: number;
}

export function useSlackOauthUserLinks(
  slug: string | undefined,
  query: UseSlackOauthUserLinksQuery = {}
) {
  return useQuery<SlackOAuthUserLinksListResponse>({
    queryKey: slackOauthKeys.userLinks(slug, query),
    enabled: !!slug,
    staleTime: DEFAULT_STALE_TIME_MS,
    queryFn: () => slackOauthService.listUserLinks(slug as string, query),
  });
}

export function useSlackOauthWorkspaceMembers(
  slug: string | undefined,
  uid: string | undefined,
  q: string
) {
  return useQuery({
    queryKey: slackOauthKeys.members(slug, uid, q),
    enabled: !!slug && !!uid && q.length > 0,
    staleTime: DEFAULT_STALE_TIME_MS,
    queryFn: () => slackOauthService.searchMembers(slug as string, uid as string, q),
  });
}

/**
 * Fetches the Slack authorize URL via the SPA-friendly /authorize-url
 * endpoint and navigates the browser to it. Modeled as a mutation
 * (not a query) because it's an action with side-effects (browser
 * navigation) rather than a passive read.
 *
 * The hook returns `{ start, isPending }` so the calling button can
 * disable itself while the fetch is in flight; once the URL is in
 * hand, navigation is synchronous via window.location.href and the
 * page unloads.
 */
export function useStartSlackInstall(slug: string | undefined) {
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!slug) throw new Error("Community slug is required");
      const authorizeUrl = await slackOauthService.getSlackAuthorizeUrl(slug);
      // Hard navigation to slack.com — the server set a Redis nonce on
      // the way out, the callback will redeem it. No SPA-side state to
      // preserve; the callback bounces back to /settings with a flag.
      if (typeof window !== "undefined") {
        window.location.href = authorizeUrl;
      }
    },
  });
}

// ── Mutations ─────────────────────────────────────────────────────────

export function useRegisterSlackWorkspace(slug: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SlackOAuthRegisterWorkspaceInput) =>
      slackOauthService.registerWorkspace(slug as string, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: slackOauthKeys.workspace(slug),
      });
    },
  });
}

export function useDeleteSlackWorkspace(slug: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => slackOauthService.deleteWorkspace(slug as string, uid),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: slackOauthKeys.workspace(slug),
      });
      // FK cascade removes all user links server-side; flush FE cache too.
      queryClient.invalidateQueries({
        queryKey: slackOauthKeys.userLinksAll(slug),
      });
    },
  });
}

export function useTestSlackWorkspace(slug: string | undefined) {
  return useMutation({
    mutationFn: (uid: string) => slackOauthService.testWorkspace(slug as string, uid),
  });
}

export function useLinkSlackUser(slug: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<SlackOAuthUserLink, Error, SlackOAuthLinkInput>({
    mutationFn: (input) => slackOauthService.linkByHandleOrMember(slug as string, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: slackOauthKeys.userLinksAll(slug),
      });
    },
  });
}

/**
 * Unlink with optimistic update — the row disappears immediately on
 * click, rolls back if the server rejects. Per CLAUDE.md mutation rule:
 * "Always useMutation with optimistic updates — never useState +
 * direct service calls". Unlink is the textbook case: a single row
 * removal where the server outcome is near-certain and waiting feels
 * sluggish.
 */
export function useUnlinkSlackUser(slug: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => slackOauthService.unlinkUser(slug as string, uid),

    onMutate: async (uid: string) => {
      // Cancel in-flight list refetches so they don't overwrite our
      // optimistic delete with a stale snapshot.
      await queryClient.cancelQueries({
        queryKey: slackOauthKeys.userLinksAll(slug),
      });

      // Snapshot every cached link list (multiple keys exist if the UI
      // has paginated or filtered queries) and remove the matching uid
      // from each. Returning the snapshots from onMutate hands them to
      // onError as `context` for rollback.
      const snapshots = queryClient.getQueriesData<SlackOAuthUserLinksListResponse>({
        queryKey: slackOauthKeys.userLinksAll(slug),
      });

      for (const [key, data] of snapshots) {
        if (!data) continue;
        queryClient.setQueryData<SlackOAuthUserLinksListResponse>(key, {
          ...data,
          items: data.items.filter((link) => link.uid !== uid),
          total: Math.max(0, data.total - 1),
        });
      }

      return { snapshots };
    },

    onError: (_err, _uid, context) => {
      // Server rejected — restore every snapshot so the row reappears
      // with its original list-position + total intact.
      if (!context?.snapshots) return;
      for (const [key, data] of context.snapshots) {
        queryClient.setQueryData(key, data);
      }
    },

    onSettled: () => {
      // Whether the optimistic delete stuck or rolled back, refetch
      // ground truth from the server.
      queryClient.invalidateQueries({
        queryKey: slackOauthKeys.userLinksAll(slug),
      });
    },
  });
}
