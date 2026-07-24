import { errorManager } from "@/components/Utilities/errorManager";
import type { CommunityProgram } from "@/types/v2/community-program";
import { api } from "@/utilities/api/client";
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
 * @param uidOrSlug - Community UID or slug
 * @returns Promise<CommunityProgram[]>
 */
export const getCommunityPrograms = async (uidOrSlug: string): Promise<CommunityProgram[]> => {
  try {
    // TODO(#1775): add zod schema
    const data = await api.get<CommunityProgram[]>(INDEXER.V2.COMMUNITIES.PROGRAMS(uidOrSlug));
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
