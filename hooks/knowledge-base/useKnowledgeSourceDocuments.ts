import { useQuery } from "@tanstack/react-query";
import type { KnowledgeDocument } from "@/types/v2/knowledge-base";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

interface DocsResponse {
  data: KnowledgeDocument[];
}

export const knowledgeSourceDocumentsQueryKey = (communityIdOrSlug: string, sourceId: string) =>
  ["knowledge-base", "documents", communityIdOrSlug, sourceId] as const;

export function useKnowledgeSourceDocuments(
  communityIdOrSlug: string | undefined,
  sourceId: string | undefined
) {
  return useQuery({
    queryKey:
      communityIdOrSlug && sourceId
        ? knowledgeSourceDocumentsQueryKey(communityIdOrSlug, sourceId)
        : ["knowledge-base", "documents", "anonymous"],
    enabled: Boolean(communityIdOrSlug && sourceId),
    queryFn: async () => {
      if (!communityIdOrSlug || !sourceId) return [];
      const [data, error] = await fetchData<DocsResponse>(
        INDEXER.KNOWLEDGE_BASE.LIST_DOCUMENTS(communityIdOrSlug, sourceId),
        "GET",
        undefined,
        {},
        {},
        true
      );
      if (error) throw new Error(error);
      return data?.data ?? [];
    },
    staleTime: 30_000,
  });
}
