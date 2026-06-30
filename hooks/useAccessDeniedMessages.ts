import { useQuery } from "@tanstack/react-query";
import fetchData from "@/utilities/fetchData";

// Public endpoint — no auth header. Returns per-community Markdown
// overrides for the AccessDenied page body. Lives here (not in
// INDEXER) because it's the only caller — keeps the umbrella
// constants file from growing past its size budget.
const ACCESS_DENIED_MESSAGES_URL = (s: string) =>
  `/v2/community-configs/${s}/access-denied-messages`;

/**
 * Per-community Markdown overrides for the AccessDenied page body.
 * Either field is null when the admin has not customized it; render
 * the hard-coded fallback in that case. See
 * gap-indexer/docs/adr/0001-per-community-access-denied-messages.md.
 */
interface AccessDeniedMessages {
  unauthenticatedMessage: string | null;
  forbiddenMessage: string | null;
  applicantMessage: string | null;
}

/**
 * PUBLIC read — distinct from `useCommunityConfig` because the latter
 * hits the admin-gated endpoint and would 401/403 the AccessDenied
 * audience (anonymous visitors and signed-in users without the
 * required role). Falls back to nulls when slug is empty, the
 * endpoint 404s, or the fetch errors — the caller is expected to
 * render the hard-coded default body in those cases.
 */
export const useAccessDeniedMessages = (
  slugOrUid: string | null | undefined,
  enabled: boolean = true
) => {
  return useQuery<AccessDeniedMessages>({
    queryKey: ["access-denied-messages", slugOrUid ?? ""],
    queryFn: async () => {
      if (!slugOrUid) {
        return { unauthenticatedMessage: null, forbiddenMessage: null, applicantMessage: null };
      }
      const [data, error] = await fetchData(
        ACCESS_DENIED_MESSAGES_URL(slugOrUid),
        "GET",
        {},
        {},
        {},
        false // public — no auth header
      );
      if (error || !data) {
        return { unauthenticatedMessage: null, forbiddenMessage: null, applicantMessage: null };
      }
      return {
        unauthenticatedMessage: data.unauthenticatedMessage ?? null,
        forbiddenMessage: data.forbiddenMessage ?? null,
        applicantMessage: data.applicantMessage ?? null,
      };
    },
    enabled,
    // Static-ish copy — admins change it rarely, anonymous visitors
    // benefit most from aggressive caching.
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
};
