"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotebookConfigInput, NotebookConfigUpdate } from "@/services/notebooks-admin.service";
import * as notebooksAdmin from "@/services/notebooks-admin.service";

/**
 * Query/mutation layer for the notebook page builder.
 *
 * Components stay thin: they render and collect input, these own the cache
 * keys and the invalidation. Nothing here decides authorization — the indexer
 * does, on every call — so a hook that errors is reporting a real failure and
 * the UI must show it rather than fall back to an empty state.
 */

const QUERY_KEYS = {
  /**
   * Deliberately prefixed so `invalidateQueries({ queryKey: list(slug) })`
   * also clears the per-page entries nested under it.
   */
  list: (communitySlug: string) => ["notebook-configs-admin", communitySlug] as const,
  detail: (communitySlug: string, slug: string) =>
    ["notebook-configs-admin", communitySlug, slug] as const,
};

export function useAdminNotebooks(communitySlug: string) {
  return useQuery({
    queryKey: QUERY_KEYS.list(communitySlug),
    queryFn: () => notebooksAdmin.getAdminNotebooks(communitySlug),
    enabled: Boolean(communitySlug),
  });
}

export function useAdminNotebook(communitySlug: string, slug: string) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(communitySlug, slug),
    queryFn: () => notebooksAdmin.getAdminNotebook(communitySlug, slug),
    enabled: Boolean(communitySlug && slug),
  });
}

export function useCreateNotebook(communitySlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: NotebookConfigInput) => notebooksAdmin.createNotebook(communitySlug, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list(communitySlug) });
    },
  });
}

export function useUpdateNotebook(communitySlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, body }: { slug: string; body: NotebookConfigUpdate }) =>
      notebooksAdmin.updateNotebook(communitySlug, slug, body),
    onSuccess: () => {
      // Invalidating the list prefix covers the renamed and the original slug
      // without the caller having to know which one changed.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list(communitySlug) });
    },
  });
}

export function useSetNotebookStatus(communitySlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, status }: { slug: string; status: "draft" | "published" }) =>
      notebooksAdmin.setNotebookStatus(communitySlug, slug, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list(communitySlug) });
    },
  });
}

export function useDeleteNotebook(communitySlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => notebooksAdmin.deleteNotebook(communitySlug, slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list(communitySlug) });
    },
  });
}
