import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { slackOauthService } from "@/services/slackOauth.service";
import type {
  SlackOAuthRegisterWorkspaceInput,
  SlackOAuthWorkspace,
  SlackUserConnection,
} from "@/types/slack-oauth";
import { slackOauthKeys } from "@/utilities/queryKeys/slackOauth";

/**
 * React Query hooks over `slackOauthService`. Each `queryFn` delegates
 * to the service so hooks stay thin and the service is the single
 * place that talks to the HTTP boundary.
 *
 * Per-user Slack handle mapping is NOT here — that lives on
 * `user_profiles.slack` and is managed via the user-profile UI.
 */

const DEFAULT_STALE_TIME_MS = 60_000;

// ── Queries ───────────────────────────────────────────────────────────

// Guard slug at fire-time so a request triggered before route params
// resolve doesn't hit the API with `slug=undefined` in the URL path.
function requireSlug(slug: string | undefined): string {
  if (!slug) {
    throw new Error("Community slug is required");
  }
  return slug;
}

export function useSlackOauthWorkspace(slug: string | undefined) {
  return useQuery<SlackOAuthWorkspace | null>({
    queryKey: slackOauthKeys.workspace(slug),
    enabled: !!slug,
    staleTime: DEFAULT_STALE_TIME_MS,
    queryFn: () => slackOauthService.getWorkspace(requireSlug(slug)),
  });
}

/**
 * Fetches the Slack authorize URL via the SPA-friendly /authorize-url
 * endpoint and navigates the browser to it. Modeled as a mutation
 * (not a query) because it's an action with side-effects (browser
 * navigation) rather than a passive read.
 */
export function useStartSlackInstall(slug: string | undefined) {
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const authorizeUrl = await slackOauthService.getSlackAuthorizeUrl(requireSlug(slug));
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
      slackOauthService.registerWorkspace(requireSlug(slug), input),
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
    mutationFn: (uid: string) => slackOauthService.deleteWorkspace(requireSlug(slug), uid),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: slackOauthKeys.workspace(slug),
      });
    },
  });
}

export function useTestSlackWorkspace(slug: string | undefined) {
  return useMutation({
    mutationFn: (uid: string) => slackOauthService.testWorkspace(requireSlug(slug), uid),
  });
}

// ── Per-user connection ───────────────────────────────────────────────

export function useSlackUserConnections(enabled = true) {
  return useQuery<SlackUserConnection[]>({
    queryKey: slackOauthKeys.userConnections(),
    enabled,
    staleTime: DEFAULT_STALE_TIME_MS,
    queryFn: () => slackOauthService.getUserConnections(),
  });
}

/** Same navigation pattern as `useStartSlackInstall`, for the user's own account. */
export function useStartSlackUserConnect(slug: string | undefined) {
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const authorizeUrl = await slackOauthService.getUserAuthorizeUrl(requireSlug(slug));
      if (typeof window !== "undefined") {
        window.location.href = authorizeUrl;
      }
    },
  });
}

export function useDisconnectSlackUser() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string, { previous?: SlackUserConnection[] }>({
    mutationFn: (teamId: string) => slackOauthService.disconnectUser(teamId),
    onMutate: async (teamId) => {
      const key = slackOauthKeys.userConnections();
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<SlackUserConnection[]>(key);
      queryClient.setQueryData<SlackUserConnection[]>(key, (current) =>
        (current ?? []).filter((c) => c.teamId !== teamId)
      );
      return { previous };
    },
    onError: (_error, _teamId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(slackOauthKeys.userConnections(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: slackOauthKeys.userConnections() });
    },
  });
}
