"use client";

import { useQuery } from "@tanstack/react-query";
import { CommentsService } from "../api/comments-service";
import type { ApplicationComment } from "../types";

interface UsePublicApplicationCommentsReturn {
  comments: ApplicationComment[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function usePublicApplicationComments(
  referenceNumber: string,
  enabled: boolean
): UsePublicApplicationCommentsReturn {
  const {
    data: comments = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["public-application-comments", referenceNumber],
    queryFn: () => CommentsService.getPublicComments(referenceNumber),
    enabled: enabled && !!referenceNumber,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
    retry: false,
  });

  return {
    comments,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
