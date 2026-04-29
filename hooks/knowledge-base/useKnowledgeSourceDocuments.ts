import { useQuery } from "@tanstack/react-query";
import { listKnowledgeSourceDocuments } from "@/services/knowledge-base.service";
import { QUERY_KEYS } from "@/utilities/queryKeys";

/**
 * Lists the per-document detail rows for a single knowledge source. The
 * server caps responses at 500 docs and the data is read-only here, so a
 * plain `useQuery` (no pagination, no mutations) covers the row-expand UI.
 *
 * Caller-controlled `enabled` flag: the SourceRow expand affordance only
 * fires the query the first time the row is opened, so the cost of paging
 * a community's full KB doesn't load up-front.
 */
export function useKnowledgeSourceDocuments(
  communityIdOrSlug: string | undefined,
  sourceId: string | undefined,
  options: { enabled?: boolean } = {}
) {
  const enabled = (options.enabled ?? true) && Boolean(communityIdOrSlug) && Boolean(sourceId);
  return useQuery({
    queryKey:
      communityIdOrSlug && sourceId
        ? QUERY_KEYS.KNOWLEDGE_BASE.SOURCE_DOCUMENTS(communityIdOrSlug, sourceId)
        : ["knowledge-base", "source-documents", "anonymous"],
    enabled,
    queryFn: () => listKnowledgeSourceDocuments(communityIdOrSlug as string, sourceId as string),
    staleTime: 30_000,
  });
}
