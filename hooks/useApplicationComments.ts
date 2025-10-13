import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  fetchApplicationComments,
  createComment,
  editComment,
  deleteComment,
  type ApplicationComment
} from "@/services/comments";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import toast from "react-hot-toast";

/**
 * Hook for fetching and managing application comments
 */
export const useApplicationComments = (referenceNumber: string) => {
  const queryClient = useQueryClient();

  const commentsQuery = useQuery({
    queryKey: QUERY_KEYS.APPLICATIONS.COMMENTS(referenceNumber),
    queryFn: () => fetchApplicationComments(referenceNumber),
    enabled: !!referenceNumber,
  });

  // Mutation for adding comments
  const addCommentMutation = useMutation({
    mutationFn: (content: string) => createComment(referenceNumber, content),
    onMutate: async (content: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.APPLICATIONS.COMMENTS(referenceNumber)
      });

      // Snapshot previous value
      const previousComments = queryClient.getQueryData<ApplicationComment[]>(
        QUERY_KEYS.APPLICATIONS.COMMENTS(referenceNumber)
      );

      // Optimistically update to the new value
      const optimisticComment: ApplicationComment = {
        id: `temp-${Date.now()}`,
        content,
        authorAddress: '', // Will be set by server
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<ApplicationComment[]>(
        QUERY_KEYS.APPLICATIONS.COMMENTS(referenceNumber),
        (old) => [...(old || []), optimisticComment]
      );

      return { previousComments };
    },
    onSuccess: (newComment) => {
      queryClient.setQueryData<ApplicationComment[]>(
        QUERY_KEYS.APPLICATIONS.COMMENTS(referenceNumber),
        (old) => {
          const filtered = (old || []).filter(c => !c.id.startsWith('temp-'));
          return [...filtered, newComment];
        }
      );
      toast.success("Comment added successfully");
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousComments) {
        queryClient.setQueryData(
          QUERY_KEYS.APPLICATIONS.COMMENTS(referenceNumber),
          context.previousComments
        );
      }
      toast.error("Failed to add comment");
      console.error("Error adding comment:", error);
    },
  });

  // Mutation for editing comments
  const editCommentMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      editComment(commentId, content),
    onMutate: async ({ commentId, content }) => {
      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.APPLICATIONS.COMMENTS(referenceNumber)
      });

      const previousComments = queryClient.getQueryData<ApplicationComment[]>(
        QUERY_KEYS.APPLICATIONS.COMMENTS(referenceNumber)
      );

      // Optimistically update
      queryClient.setQueryData<ApplicationComment[]>(
        QUERY_KEYS.APPLICATIONS.COMMENTS(referenceNumber),
        (old) =>
          (old || []).map((comment) =>
            comment.id === commentId ? { ...comment, content } : comment
          )
      );

      return { previousComments };
    },
    onSuccess: (updatedComment) => {
      queryClient.setQueryData<ApplicationComment[]>(
        QUERY_KEYS.APPLICATIONS.COMMENTS(referenceNumber),
        (old) =>
          (old || []).map((comment) =>
            comment.id === updatedComment.id ? updatedComment : comment
          )
      );
      toast.success("Comment updated successfully");
    },
    onError: (error, _variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(
          QUERY_KEYS.APPLICATIONS.COMMENTS(referenceNumber),
          context.previousComments
        );
      }
      toast.error("Failed to update comment");
      console.error("Error editing comment:", error);
    },
  });

  // Mutation for deleting comments
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.APPLICATIONS.COMMENTS(referenceNumber)
      });

      const previousComments = queryClient.getQueryData<ApplicationComment[]>(
        QUERY_KEYS.APPLICATIONS.COMMENTS(referenceNumber)
      );

      // Optimistically remove
      queryClient.setQueryData<ApplicationComment[]>(
        QUERY_KEYS.APPLICATIONS.COMMENTS(referenceNumber),
        (old) => (old || []).filter((comment) => comment.id !== commentId)
      );

      return { previousComments };
    },
    onSuccess: () => {
      toast.success("Comment deleted successfully");
    },
    onError: (error, _variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(
          QUERY_KEYS.APPLICATIONS.COMMENTS(referenceNumber),
          context.previousComments
        );
      }
      toast.error("Failed to delete comment");
      console.error("Error deleting comment:", error);
    },
  });

  const handleEditComment = useCallback(
    (commentId: string, content: string) =>
      editCommentMutation.mutateAsync({ commentId, content }),
    [editCommentMutation]
  );

  return {
    comments: commentsQuery.data || [],
    isLoading: commentsQuery.isLoading,
    error: commentsQuery.error,
    refetch: commentsQuery.refetch,
    addComment: addCommentMutation.mutateAsync,
    editComment: handleEditComment,
    deleteComment: deleteCommentMutation.mutateAsync,
    isAddingComment: addCommentMutation.isPending,
    isEditingComment: editCommentMutation.isPending,
    isDeletingComment: deleteCommentMutation.isPending,
  };
};
