import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { slackOauthService } from "@/services/slackOauth.service";
import type { SlackOAuthRegisterWorkspaceInput, SlackOAuthWorkspace } from "@/types/slack-oauth";
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

export function useSlackOauthWorkspace(slug: string | undefined) {
  return useQuery<SlackOAuthWorkspace | null>({
    queryKey: slackOauthKeys.workspace(slug),
    enabled: !!slug,
    staleTime: DEFAULT_STALE_TIME_MS,
    queryFn: () => slackOauthService.getWorkspace(slug as string),
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

// `slug` is `string | undefined` because the calling page resolves it
// from the route params and renders before that resolves. The mutation
// hooks guard at fire-time rather than rely on the type-cast — a
// mutation triggered before the slug is ready would otherwise hit the
// API with `slug=undefined` in the URL path and 404 / persist nothing.
function requireSlug(slug: string | undefined): string {
  if (!slug) {
    throw new Error("Community slug is required");
  }
  return slug;
}

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
