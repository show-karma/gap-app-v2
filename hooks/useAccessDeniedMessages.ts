import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/utilities/api/client";

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
const AccessDeniedMessagesResponseSchema = z
  .object({
    unauthenticatedMessage: z.string().nullable().optional(),
    forbiddenMessage: z.string().nullable().optional(),
    applicantMessage: z.string().nullable().optional(),
  })
  .passthrough();

interface AccessDeniedMessages {
  unauthenticatedMessage: string | null;
  forbiddenMessage: string | null;
  applicantMessage: string | null;
}

const NULL_ACCESS_DENIED_MESSAGES: AccessDeniedMessages = {
  unauthenticatedMessage: null,
  forbiddenMessage: null,
  applicantMessage: null,
};

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
        return NULL_ACCESS_DENIED_MESSAGES;
      }
      // Any failure (network, 404, contract violation, ...) degrades to the
      // hard-coded fallback — this endpoint is best-effort copy, never a hard
      // dependency for rendering the AccessDenied page.
      try {
        const data = await api.get(ACCESS_DENIED_MESSAGES_URL(slugOrUid), {
          isAuthorized: false, // public — no auth header
          schema: AccessDeniedMessagesResponseSchema,
        });
        if (!data) {
          return NULL_ACCESS_DENIED_MESSAGES;
        }
        return {
          unauthenticatedMessage: data.unauthenticatedMessage ?? null,
          forbiddenMessage: data.forbiddenMessage ?? null,
          applicantMessage: data.applicantMessage ?? null,
        };
      } catch {
        return NULL_ACCESS_DENIED_MESSAGES;
      }
    },
    enabled,
    // Static-ish copy — admins change it rarely, anonymous visitors
    // benefit most from aggressive caching.
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
};
