"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { compareAllWallets } from "@/utilities/auth/compare-all-wallets";
import { CommentsService } from "../api/comments-service";
import type { ApplicationComment, UsePublicCommentingReturn } from "../types";

interface UsePublicCommentingOptions {
  referenceNumber: string;
  communityId: string;
  enabled?: boolean;
}

const QUERY_KEY_PREFIX = "wl-public-comments";

export function usePublicCommenting({
  referenceNumber,
  communityId,
  enabled = true,
}: UsePublicCommentingOptions): UsePublicCommentingReturn {
  const { address, authenticated, user } = useAuth();
  const queryClient = useQueryClient();

  const currentUserAddress = useMemo(() => {
    if (!address) return null;
    return address.toLowerCase();
  }, [address]);

  // communityId scopes the key to prevent cross-tenant cache collisions
  const queryKey = useMemo(
    () => [QUERY_KEY_PREFIX, communityId, referenceNumber],
    [communityId, referenceNumber]
  );

  const {
    data: comments = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => CommentsService.getPublicComments(referenceNumber),
    enabled: enabled && !!referenceNumber,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
    retry: false,
  });

  const addCommentMutation = useMutation({
    mutationFn: (content: string) => CommentsService.createPublicComment(referenceNumber, content),
    onSuccess: (newComment) => {
      queryClient.setQueryData<ApplicationComment[]>(queryKey, (old) => [
        ...(old ?? []),
        newComment,
      ]);
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

  const canDeleteComment = useCallback(
    (comment: ApplicationComment): boolean => {
      if (!authenticated || !user) return false;
      if (comment.isDeleted) return false;
      return compareAllWallets(user, comment.authorAddress);
    },
    [authenticated, user]
  );

  const addComment = useCallback(
    async (content: string) => {
      if (!authenticated || !content.trim()) {
        throw new Error("You must be connected to comment");
      }
      await addCommentMutation.mutateAsync(content);
    },
    [authenticated, addCommentMutation.mutateAsync]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      const comment = comments.find((c) => c.id === commentId);
      if (!comment || !canDeleteComment(comment)) {
        throw new Error("You can only delete your own comments");
      }
      await deleteCommentMutation.mutateAsync(commentId);
    },
    [comments, canDeleteComment, deleteCommentMutation.mutateAsync]
  );

  return {
    comments,
    isLoading,
    error: error as Error | null,

    isAuthenticated: authenticated,
    currentUserAddress,

    addComment,
    deleteComment,

    canComment: authenticated && !isLoading,
    canDeleteComment,

    isAddingComment: addCommentMutation.isPending,
    isDeletingComment: deleteCommentMutation.isPending,

    refetch,
  };
}
