import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createKnowledgeSource,
  deleteKnowledgeSource,
  triggerKnowledgeSourceResync,
  updateKnowledgeSource,
} from "@/services/knowledge-base.service";
import type {
  CreateKnowledgeSourceInput,
  UpdateKnowledgeSourceInput,
} from "@/types/v2/knowledge-base";
import { QUERY_KEYS } from "@/utilities/queryKeys";

/**
 * Network calls live in `services/knowledge-base.service.ts`. These hooks
 * own only the React Query plumbing — caching, optimistic updates,
 * invalidation. Query keys come from `utilities/queryKeys.ts`. This
 * matches the convention used by other admin sections (communities,
 * project, project-grants, etc.).
 */

function useInvalidateSources(communityIdOrSlug: string | undefined) {
  const qc = useQueryClient();
  return () => {
    if (!communityIdOrSlug) return;
    qc.invalidateQueries({
      queryKey: QUERY_KEYS.KNOWLEDGE_BASE.SOURCES(communityIdOrSlug),
    });
  };
}

export function useCreateKnowledgeSource(communityIdOrSlug: string | undefined) {
  const invalidate = useInvalidateSources(communityIdOrSlug);
  return useMutation({
    mutationFn: (input: CreateKnowledgeSourceInput) => {
      if (!communityIdOrSlug) throw new Error("Community required");
      return createKnowledgeSource(communityIdOrSlug, input);
    },
    onSuccess: invalidate,
  });
}

export function useUpdateKnowledgeSource(communityIdOrSlug: string | undefined) {
  const invalidate = useInvalidateSources(communityIdOrSlug);
  return useMutation({
    mutationFn: ({
      sourceId,
      patch,
    }: {
      sourceId: string;
      patch: UpdateKnowledgeSourceInput;
    }) => {
      if (!communityIdOrSlug) throw new Error("Community required");
      return updateKnowledgeSource(communityIdOrSlug, sourceId, patch);
    },
    onSuccess: invalidate,
  });
}

export function useDeleteKnowledgeSource(communityIdOrSlug: string | undefined) {
  const invalidate = useInvalidateSources(communityIdOrSlug);
  return useMutation({
    mutationFn: async (sourceId: string) => {
      if (!communityIdOrSlug) throw new Error("Community required");
      await deleteKnowledgeSource(communityIdOrSlug, sourceId);
      return sourceId;
    },
    onSuccess: invalidate,
  });
}

export function useResyncKnowledgeSource(communityIdOrSlug: string | undefined) {
  const invalidate = useInvalidateSources(communityIdOrSlug);
  return useMutation({
    mutationFn: async (sourceId: string) => {
      if (!communityIdOrSlug) throw new Error("Community required");
      await triggerKnowledgeSourceResync(communityIdOrSlug, sourceId);
      return sourceId;
    },
    onSuccess: invalidate,
  });
}
