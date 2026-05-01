import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createKnowledgeSource,
  deleteKnowledgeSource,
  triggerKnowledgeSourceResync,
  updateKnowledgeSource,
} from "@/services/knowledge-base.service";
import type {
  CreateKnowledgeSourceInput,
  KnowledgeSource,
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
    mutationFn: ({ sourceId, patch }: { sourceId: string; patch: UpdateKnowledgeSourceInput }) => {
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

/**
 * DEV-202: edit-flow variant of useUpdateKnowledgeSource. Uses the same
 * service call but adds optimistic-update-with-rollback for the source
 * list cache so the dialog feels instant. Lives as a separate hook so
 * the existing pause/resume call sites (which rely on the non-optimistic
 * `useUpdateKnowledgeSource` semantics) keep their current behavior —
 * onMutate cancels in-flight queries which can race with the rapid
 * pause/unpause toggling pattern those callers use.
 */
export function useEditKnowledgeSource(communityIdOrSlug: string | undefined) {
  const qc = useQueryClient();
  const invalidate = useInvalidateSources(communityIdOrSlug);
  return useMutation<
    KnowledgeSource,
    Error,
    { sourceId: string; patch: UpdateKnowledgeSourceInput },
    { previous: KnowledgeSource[] | undefined }
  >({
    mutationFn: ({ sourceId, patch }) => {
      if (!communityIdOrSlug) throw new Error("Community required");
      return updateKnowledgeSource(communityIdOrSlug, sourceId, patch);
    },
    // Optimistic patch: cancel in-flight refetches so they don't clobber
    // our local change, snapshot the list for rollback, then mutate the
    // cached row in place. We patch only the form-projected fields —
    // server-derived fields like `lastSyncedAt` and `lastSyncStatus`
    // refresh on settle when the backend re-syncs as a side effect.
    onMutate: async ({ sourceId, patch }) => {
      if (!communityIdOrSlug) return { previous: undefined };
      const key = QUERY_KEYS.KNOWLEDGE_BASE.SOURCES(communityIdOrSlug);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<KnowledgeSource[]>(key);
      qc.setQueryData<KnowledgeSource[]>(key, (old) =>
        (old ?? []).map((s) => (s.id === sourceId ? applyPatch(s, patch) : s))
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (!communityIdOrSlug || !ctx?.previous) return;
      qc.setQueryData(QUERY_KEYS.KNOWLEDGE_BASE.SOURCES(communityIdOrSlug), ctx.previous);
    },
    // Always invalidate at the end so server-side derived fields
    // (lastSyncedAt cleared by markPendingSync, etc.) reach the cache.
    onSettled: invalidate,
  });
}

/**
 * Project an UpdateKnowledgeSourceInput onto a KnowledgeSource for
 * cache-level optimistic updates. Distinguishes "key absent → leave
 * alone" from "key present → apply (including null)" to match the
 * backend's tri-state handling of `goal`.
 */
function applyPatch(source: KnowledgeSource, patch: UpdateKnowledgeSourceInput): KnowledgeSource {
  return {
    ...source,
    ...(patch.title !== undefined && { title: patch.title }),
    ...(Object.hasOwn(patch, "goal") && {
      goal: patch.goal ?? null,
    }),
    ...(patch.externalId !== undefined && { externalId: patch.externalId }),
    ...(patch.isActive !== undefined && { isActive: patch.isActive }),
    ...(patch.paused !== undefined && { paused: patch.paused }),
    ...(patch.syncIntervalMin !== undefined && {
      syncIntervalMin: patch.syncIntervalMin,
    }),
    ...(patch.followLinks !== undefined && { followLinks: patch.followLinks }),
  };
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
