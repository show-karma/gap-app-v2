import { useQuery } from "@tanstack/react-query";
import { listKnowledgeSources } from "@/services/knowledge-base.service";
import { QUERY_KEYS } from "@/utilities/queryKeys";

export function useKnowledgeSources(communityIdOrSlug: string | undefined) {
  return useQuery({
    queryKey: communityIdOrSlug
      ? QUERY_KEYS.KNOWLEDGE_BASE.SOURCES(communityIdOrSlug)
      : [...QUERY_KEYS.KNOWLEDGE_BASE.SOURCES_BASE, "anonymous"],
    enabled: Boolean(communityIdOrSlug),
    queryFn: () => listKnowledgeSources(communityIdOrSlug as string),
    staleTime: 30_000,
  });
}
