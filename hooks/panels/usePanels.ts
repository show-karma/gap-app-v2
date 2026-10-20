"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as panelsService from "@/services/panels.service";
import {
  type CreatePanelCommentRequest,
  type CreatePanelRequest,
  isPanelWorking,
  type Panel,
  type PanelComment,
  type PanelDetail,
  type UpdatePanelRequest,
} from "@/types/panels";

export const panelKeys = {
  all: (community: string) => ["panels", community] as const,
  detail: (community: string, panelId: string) => ["panel", community, panelId] as const,
  version: (community: string, panelId: string, versionId: string) =>
    ["panel-version", community, panelId, versionId] as const,
};

const WORKING_POLL_MS = 5_000;

export function usePanels(community: string) {
  return useQuery({
    queryKey: panelKeys.all(community),
    queryFn: () => panelsService.listPanels(community),
    enabled: Boolean(community),
  });
}

export function usePanel(community: string, panelId: string) {
  return useQuery({
    queryKey: panelKeys.detail(community, panelId),
    queryFn: () => panelsService.getPanel(community, panelId),
    enabled: Boolean(community && panelId),
    refetchInterval: (query) => (isPanelWorking(query.state.data) ? WORKING_POLL_MS : false),
  });
}

export function usePanelVersion(
  community: string,
  panelId: string,
  versionId: string | null,
  options: { enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: panelKeys.version(community, panelId, versionId ?? ""),
    queryFn: () => panelsService.getPanelVersion(community, panelId, versionId ?? ""),
    enabled: Boolean(community && panelId && versionId) && (options.enabled ?? true),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useCreatePanel(community: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePanelRequest) => panelsService.createPanel(community, body),
    onSuccess: (panel) => {
      queryClient.setQueryData<Panel[]>(panelKeys.all(community), (old) =>
        old ? [panel, ...old] : [panel]
      );
    },
  });
}

export function useUpdatePanel(community: string, panelId: string) {
  const queryClient = useQueryClient();
  const detailKey = panelKeys.detail(community, panelId);
  return useMutation({
    mutationFn: (body: UpdatePanelRequest) => panelsService.updatePanel(community, panelId, body),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previous = queryClient.getQueryData<PanelDetail>(detailKey);
      if (previous) {
        queryClient.setQueryData<PanelDetail>(detailKey, {
          ...previous,
          panel: {
            ...previous.panel,
            ...(body.title !== undefined ? { title: body.title } : {}),
            ...(body.currentVersionId !== undefined
              ? { currentVersionId: body.currentVersionId }
              : {}),
          },
        });
      }
      return { previous };
    },
    onError: (_error, _body, context) => {
      if (context?.previous) queryClient.setQueryData(detailKey, context.previous);
    },
    onSuccess: (panel) => {
      queryClient.setQueryData<PanelDetail>(detailKey, (old) => (old ? { ...old, panel } : old));
      queryClient.setQueryData<Panel[]>(panelKeys.all(community), (old) =>
        old?.map((item) => (item.id === panel.id ? panel : item))
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: detailKey });
    },
  });
}

export function useDeletePanel(community: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (panelId: string) => panelsService.deletePanel(community, panelId),
    onSuccess: (_data, panelId) => {
      queryClient.removeQueries({ queryKey: panelKeys.detail(community, panelId) });
      queryClient.setQueryData<Panel[]>(panelKeys.all(community), (old) =>
        old?.filter((panel) => panel.id !== panelId)
      );
    },
  });
}

const OPTIMISTIC_PREFIX = "optimistic-";

export function useCreatePanelComment(community: string, panelId: string) {
  const queryClient = useQueryClient();
  const detailKey = panelKeys.detail(community, panelId);
  return useMutation({
    mutationFn: (body: CreatePanelCommentRequest) =>
      panelsService.createPanelComment(community, panelId, body),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previous = queryClient.getQueryData<PanelDetail>(detailKey);
      const optimisticId = `${OPTIMISTIC_PREFIX}${Date.now()}`;
      if (previous) {
        const now = new Date().toISOString();
        const optimistic: PanelComment = {
          id: optimisticId,
          panelId,
          versionId: body.versionId,
          blockId: body.blockId,
          blockLabel: body.blockLabel,
          body: body.body,
          status: "open",
          appliedInVersionId: null,
          createdBy: "",
          createdAt: now,
          updatedAt: now,
        };
        queryClient.setQueryData<PanelDetail>(detailKey, {
          ...previous,
          comments: [...previous.comments, optimistic],
        });
      }
      return { previous, optimisticId };
    },
    onError: (_error, _body, context) => {
      if (context?.previous) queryClient.setQueryData(detailKey, context.previous);
    },
    onSuccess: (comment, _body, context) => {
      queryClient.setQueryData<PanelDetail>(detailKey, (old) =>
        old
          ? {
              ...old,
              comments: old.comments.map((item) =>
                item.id === context.optimisticId ? comment : item
              ),
            }
          : old
      );
    },
  });
}

export function useUpdatePanelComment(community: string, panelId: string) {
  const queryClient = useQueryClient();
  const detailKey = panelKeys.detail(community, panelId);
  return useMutation({
    mutationFn: ({ commentId, body }: { commentId: string; body: string }) =>
      panelsService.updatePanelComment(community, panelId, commentId, { body }),
    onMutate: async ({ commentId, body }) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previous = queryClient.getQueryData<PanelDetail>(detailKey);
      if (previous) {
        queryClient.setQueryData<PanelDetail>(detailKey, {
          ...previous,
          comments: previous.comments.map((comment) =>
            comment.id === commentId ? { ...comment, body } : comment
          ),
        });
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(detailKey, context.previous);
    },
    onSuccess: (comment) => {
      queryClient.setQueryData<PanelDetail>(detailKey, (old) =>
        old
          ? {
              ...old,
              comments: old.comments.map((item) => (item.id === comment.id ? comment : item)),
            }
          : old
      );
    },
  });
}

export function useDeletePanelComment(community: string, panelId: string) {
  const queryClient = useQueryClient();
  const detailKey = panelKeys.detail(community, panelId);
  return useMutation({
    mutationFn: (commentId: string) =>
      panelsService.deletePanelComment(community, panelId, commentId),
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previous = queryClient.getQueryData<PanelDetail>(detailKey);
      if (previous) {
        queryClient.setQueryData<PanelDetail>(detailKey, {
          ...previous,
          comments: previous.comments.filter((comment) => comment.id !== commentId),
        });
      }
      return { previous };
    },
    onError: (_error, _commentId, context) => {
      if (context?.previous) queryClient.setQueryData(detailKey, context.previous);
    },
  });
}
