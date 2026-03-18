"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import { GrantCommentsService } from "../api/grant-comments-service";
import type { GrantComment } from "../types";

interface UseGrantCommentsOptions {
  projectUID: string;
  programId: string;
}

export function useGrantComments({ projectUID, programId }: UseGrantCommentsOptions) {
  const { authenticated } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => [...QUERY_KEYS.GRANTS.COMMENTS(projectUID, programId)],
    [projectUID, programId]
  );

  const {
    data: comments = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => GrantCommentsService.getComments(projectUID, programId),
    enabled: !!projectUID && !!programId && authenticated,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
  });

  const addCommentMutation = useMutation({
    mutationFn: (content: string) =>
      GrantCommentsService.createComment(projectUID, programId, content),
    onSuccess: (newComment) => {
      queryClient.setQueryData<GrantComment[]>(queryKey, (old) => [...(old ?? []), newComment]);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const editCommentMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      GrantCommentsService.editComment(commentId, content),
    onSuccess: (updatedComment) => {
      queryClient.setQueryData<GrantComment[]>(
        queryKey,
        (old) => old?.map((c) => (c.id === updatedComment.id ? updatedComment : c)) ?? []
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => GrantCommentsService.deleteComment(commentId),
    onSuccess: (_, commentId) => {
      queryClient.setQueryData<GrantComment[]>(
        queryKey,
        (old) => old?.filter((c) => c.id !== commentId) ?? []
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const createCommentAsync = useCallback(
    async ({ content }: { content: string }) => {
      if (!content.trim()) return;
      await addCommentMutation.mutateAsync(content);
    },
    [addCommentMutation.mutateAsync]
  );

  const editCommentAsync = useCallback(
    async ({ commentId, content }: { commentId: string; content: string }) => {
      if (!content.trim()) return;
      await editCommentMutation.mutateAsync({ commentId, content });
    },
    [editCommentMutation.mutateAsync]
  );

  const deleteCommentAsync = useCallback(
    async (commentId: string) => {
      await deleteCommentMutation.mutateAsync(commentId);
    },
    [deleteCommentMutation.mutateAsync]
  );

  return {
    comments,
    isLoading,
    error: error as Error | null,
    createCommentAsync,
    editCommentAsync,
    deleteCommentAsync,
    refetch,
  };
}
