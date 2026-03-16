"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { CommentsService } from "../api/comments-service";
import type { ApplicationComment, UseApplicationCommentsReturn } from "../types";

interface UseApplicationCommentsOptions {
  applicationId: string;
  ownerAddress?: string;
  canViewComments?: boolean;
}

const QUERY_KEY_PREFIX = "application-comments";

export function useApplicationComments({
  applicationId,
  ownerAddress,
  canViewComments = true,
}: UseApplicationCommentsOptions): UseApplicationCommentsReturn {
  const { address, authenticated } = useAuth();
  const queryClient = useQueryClient();

  const isOwner = useMemo(() => {
    if (!address || !ownerAddress) return false;
    return address.toLowerCase() === ownerAddress.toLowerCase();
  }, [address, ownerAddress]);

  const queryKey = useMemo(() => [QUERY_KEY_PREFIX, applicationId], [applicationId]);

  const {
    data: comments = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => CommentsService.getComments(applicationId),
    enabled: !!applicationId && authenticated && canViewComments,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
  });

  const addCommentMutation = useMutation({
    mutationFn: (content: string) => CommentsService.createComment(applicationId, content),
    onSuccess: (newComment) => {
      queryClient.setQueryData<ApplicationComment[]>(queryKey, (old) => [
        ...(old ?? []),
        newComment,
      ]);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const editCommentMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      CommentsService.editComment(commentId, content),
    onSuccess: (updatedComment) => {
      queryClient.setQueryData<ApplicationComment[]>(
        queryKey,
        (old) => old?.map((c) => (c.id === updatedComment.id ? updatedComment : c)) ?? []
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => CommentsService.deleteComment(commentId),
    onSuccess: (_, commentId) => {
      queryClient.setQueryData<ApplicationComment[]>(
        queryKey,
        (old) => old?.filter((c) => c.id !== commentId) ?? []
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const addComment = useCallback(
    async (content: string) => {
      if (!canViewComments || !content.trim()) return;
      await addCommentMutation.mutateAsync(content);
    },
    [canViewComments, addCommentMutation.mutateAsync]
  );

  const editComment = useCallback(
    async (commentId: string, content: string) => {
      if (!canViewComments || !content.trim()) return;
      await editCommentMutation.mutateAsync({ commentId, content });
    },
    [canViewComments, editCommentMutation.mutateAsync]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!canViewComments) return;
      await deleteCommentMutation.mutateAsync(commentId);
    },
    [canViewComments, deleteCommentMutation.mutateAsync]
  );

  const canComment = canViewComments && !isLoading;

  return {
    comments,
    isLoading,
    error: error as Error | null,
    isOwner,
    canComment,
    canViewComments,
    addComment,
    editComment,
    deleteComment,
    refetch,
  };
}
