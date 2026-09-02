import { errorManager } from "@/components/Utilities/errorManager";
import type { CommunityProgram } from "@/types/v2/community-program";
import { api } from "@/utilities/api/client";
import { publicReadOptions } from "@/utilities/api/public-read";
import { INDEXER } from "@/utilities/indexer";

/**
 * Fetches a community's funding programs from the public V2 endpoint.
 *
 * V2 endpoint: GET /v2/communities/:uidOrSlug/programs
 * - Returns a PII-safe whitelist (see {@link CommunityProgram}); an unknown
 *   community resolves to `[]` server-side (never a 404).
 * - Re-throws on transport/HTTP failure (after logging) so callers keep an
 *   explicit error state: the React Query hook surfaces `isError`, and server
 *   components decide whether to bubble to `error.tsx` or degrade to `[]`.
 *
 * On the server the read is anonymous (`publicReadOptions`). `api.get` otherwise
 * defaults `isAuthorized` to true, which routes every server read through
 * `TokenManager.getServerToken()` and a `cookies()` call -- request state that
 * leaves a HANGING_PROMISE_REJECTION on the two manage pages that read this on
 * the server (`portfolio-reports/config`, `milestones-report`). Dropping the
 * header provably cannot change the payload: `GET /v2/communities/:uidOrSlug/programs`
 * carries no auth preHandler at all, only the public rate limiter, and the route
 * definition says so ("Intentionally public: no auth middleware"). The client
 * path is untouched -- `usePrograms` still sends its token.
 *
 * @param uidOrSlug - Community UID or slug
 * @returns Promise<CommunityProgram[]>
 */
export const getCommunityPrograms = async (uidOrSlug: string): Promise<CommunityProgram[]> => {
  try {
    // TODO(#1775): add zod schema
    const data = await api.get<CommunityProgram[]>(
      INDEXER.V2.COMMUNITIES.PROGRAMS(uidOrSlug),
      publicReadOptions()
    );
    return data ?? [];
  } catch (error) {
    // not a swallow: logs to Sentry via errorManager, then rethrows
    errorManager(`Error fetching programs for community ${uidOrSlug}`, error, {
      context: "community-programs.service",
      uidOrSlug,
    });
    throw error;
  }
};
