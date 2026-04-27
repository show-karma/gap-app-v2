import { useQuery } from "@tanstack/react-query";
import type { KnowledgeSource } from "@/types/v2/knowledge-base";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

interface ListResponse {
  data: KnowledgeSource[];
}

export const knowledgeSourcesQueryKey = (communityIdOrSlug: string) =>
  ["knowledge-base", "sources", communityIdOrSlug] as const;

export function useKnowledgeSources(communityIdOrSlug: string | undefined) {
  return useQuery({
    queryKey: communityIdOrSlug
      ? knowledgeSourcesQueryKey(communityIdOrSlug)
      : ["knowledge-base", "sources", "anonymous"],
    enabled: Boolean(communityIdOrSlug),
    queryFn: async () => {
      if (!communityIdOrSlug) return [];
      const [data, error] = await fetchData<ListResponse>(
        INDEXER.KNOWLEDGE_BASE.LIST_SOURCES(communityIdOrSlug),
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
