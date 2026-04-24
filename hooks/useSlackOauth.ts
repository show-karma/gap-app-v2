import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { slackOauthService } from "@/services/slackOauth.service";
import { slackOauthKeys } from "@/utilities/queryKeys/slackOauth";
import type {
  SlackOAuthLinkInput,
  SlackOAuthRegisterWorkspaceInput,
  SlackOAuthUserLink,
  SlackOAuthUserLinksListResponse,
  SlackOAuthWorkspace,
} from "@/types/slack-oauth";

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
    queryFn: () =>
      slackOauthService.searchMembers(slug as string, uid as string, q),
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
    mutationFn: (uid: string) =>
      slackOauthService.deleteWorkspace(slug as string, uid),
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
    mutationFn: (uid: string) =>
      slackOauthService.testWorkspace(slug as string, uid),
  });
}

export function useLinkSlackUser(slug: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<SlackOAuthUserLink, Error, SlackOAuthLinkInput>({
    mutationFn: (input) =>
      slackOauthService.linkByHandleOrMember(slug as string, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: slackOauthKeys.userLinksAll(slug),
      });
    },
  });
}

export function useUnlinkSlackUser(slug: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) =>
      slackOauthService.unlinkUser(slug as string, uid),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: slackOauthKeys.userLinksAll(slug),
      });
    },
  });
}
