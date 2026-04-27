import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateKnowledgeSourceInput,
  KnowledgeSource,
  UpdateKnowledgeSourceInput,
} from "@/types/v2/knowledge-base";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { knowledgeSourcesQueryKey } from "./useKnowledgeSources";

interface SingleResponse {
  data: KnowledgeSource;
}

export function useCreateKnowledgeSource(communityIdOrSlug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateKnowledgeSourceInput) => {
      if (!communityIdOrSlug) throw new Error("Community required");
      const [data, error] = await fetchData<SingleResponse>(
        INDEXER.KNOWLEDGE_BASE.CREATE_SOURCE(communityIdOrSlug),
        "POST",
        input,
        {},
        {},
        true
      );
      if (error) throw new Error(error);
      if (!data?.data) throw new Error("Empty response from server");
      return data.data;
    },
    onSuccess: () => {
      if (communityIdOrSlug) {
        qc.invalidateQueries({
          queryKey: knowledgeSourcesQueryKey(communityIdOrSlug),
        });
      }
    },
  });
}

export function useUpdateKnowledgeSource(communityIdOrSlug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sourceId,
      patch,
    }: {
      sourceId: string;
      patch: UpdateKnowledgeSourceInput;
    }) => {
      if (!communityIdOrSlug) throw new Error("Community required");
      const [data, error] = await fetchData<SingleResponse>(
        INDEXER.KNOWLEDGE_BASE.UPDATE_SOURCE(communityIdOrSlug, sourceId),
        "PATCH",
        patch,
        {},
        {},
        true
      );
      if (error) throw new Error(error);
      if (!data?.data) throw new Error("Empty response from server");
      return data.data;
    },
    onSuccess: () => {
      if (communityIdOrSlug) {
        qc.invalidateQueries({
          queryKey: knowledgeSourcesQueryKey(communityIdOrSlug),
        });
      }
    },
  });
}

export function useDeleteKnowledgeSource(communityIdOrSlug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sourceId: string) => {
      if (!communityIdOrSlug) throw new Error("Community required");
      const [, error] = await fetchData(
        INDEXER.KNOWLEDGE_BASE.DELETE_SOURCE(communityIdOrSlug, sourceId),
        "DELETE",
        undefined,
        {},
        {},
        true
      );
      if (error) throw new Error(error);
      return sourceId;
    },
    onSuccess: () => {
      if (communityIdOrSlug) {
        qc.invalidateQueries({
          queryKey: knowledgeSourcesQueryKey(communityIdOrSlug),
        });
      }
    },
  });
}

export function useResyncKnowledgeSource(communityIdOrSlug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sourceId: string) => {
      if (!communityIdOrSlug) throw new Error("Community required");
      const [, error] = await fetchData(
        INDEXER.KNOWLEDGE_BASE.RESYNC_SOURCE(communityIdOrSlug, sourceId),
        "POST",
        {},
        {},
        {},
        true
      );
      if (error) throw new Error(error);
      return sourceId;
    },
    onSuccess: () => {
      if (communityIdOrSlug) {
        qc.invalidateQueries({
          queryKey: knowledgeSourcesQueryKey(communityIdOrSlug),
        });
      }
    },
  });
}
