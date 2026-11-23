"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import type { ApplicationComment } from "@/types/funding-platform";
import {
  createReviewerComment,
  deleteReviewerComment,
  editReviewerComment,
  getReviewerComments,
} from "../api/reviewer-comments-service";

const QUERY_KEY_PREFIX = "reviewer-comments";

export const reviewerCommentsQueryKey = (referenceNumber: string) => [
  QUERY_KEY_PREFIX,
  referenceNumber,
];

type Snapshot = { previous?: ApplicationComment[] };

export function useReviewerComments(referenceNumber: string) {
  const { authenticated } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => reviewerCommentsQueryKey(referenceNumber), [referenceNumber]);

  const query = useQuery({
    queryKey,
    queryFn: () => getReviewerComments(referenceNumber),
    enabled: !!referenceNumber && authenticated,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
  });

  const snapshot = async (
    update: (comments: ApplicationComment[]) => ApplicationComment[]
  ): Promise<Snapshot> => {
    await queryClient.cancelQueries({ queryKey });
    const previous = queryClient.getQueryData<ApplicationComment[]>(queryKey);
    queryClient.setQueryData<ApplicationComment[]>(queryKey, (old) => update(old ?? []));
    return { previous };
  };

  const rollback = (message: string) => (_error: unknown, _vars: unknown, context?: Snapshot) => {
    if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    toast.error(message);
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const createMutation = useMutation({
    mutationFn: (content: string) => createReviewerComment(referenceNumber, content),
    onSuccess: (created) => {
      queryClient.setQueryData<ApplicationComment[]>(queryKey, (old) => [...(old ?? []), created]);
    },
    onError: () => toast.error("Failed to post comment. Please try again."),
    onSettled: invalidate,
  });

  const editMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      editReviewerComment(referenceNumber, commentId, content),
    onMutate: ({ commentId, content }) =>
      snapshot((comments) => comments.map((c) => (c.id === commentId ? { ...c, content } : c))),
    onError: rollback("Failed to edit comment. Please try again."),
    onSettled: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => deleteReviewerComment(referenceNumber, commentId),
    onMutate: (commentId) => snapshot((comments) => comments.filter((c) => c.id !== commentId)),
    onError: rollback("Failed to delete comment. Please try again."),
    onSettled: invalidate,
  });

  return {
    comments: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    addComment: async (content: string) => {
      await createMutation.mutateAsync(content);
    },
    editComment: async (commentId: string, content: string) => {
      await editMutation.mutateAsync({ commentId, content });
    },
    deleteComment: async (commentId: string) => {
      await deleteMutation.mutateAsync(commentId);
    },
  };
}
