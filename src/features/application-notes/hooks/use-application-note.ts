"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getNote, saveNote as saveNoteRequest } from "../api/notes-service";
import type { ApplicationNote } from "../types";

interface UseApplicationNoteOptions {
  referenceNumber: string;
  /**
   * Resolved reviewer/admin flag. The query is DISABLED unless this is true, so
   * a non-reviewer's client never issues a request to the notes endpoint
   * (no 403 in their network tab). Must be the resolved (fail-closed) value.
   */
  canViewNotes: boolean;
}

const QUERY_KEY_PREFIX = "application-note";

export function useApplicationNote({ referenceNumber, canViewNotes }: UseApplicationNoteOptions) {
  const { authenticated } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => [QUERY_KEY_PREFIX, referenceNumber], [referenceNumber]);

  const {
    data: note = null,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => getNote(referenceNumber),
    enabled: !!referenceNumber && authenticated && canViewNotes,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
  });

  const saveNoteMutation = useMutation({
    mutationFn: (content: string) => saveNoteRequest(referenceNumber, content),
    onSuccess: (saved) => {
      queryClient.setQueryData<ApplicationNote>(queryKey, saved);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const saveNote = useCallback(
    async (content: string) => {
      await saveNoteMutation.mutateAsync(content);
    },
    [saveNoteMutation.mutateAsync]
  );

  return {
    note,
    isLoading,
    error: error as Error | null,
    saveNote,
    isSaving: saveNoteMutation.isPending,
    refetch,
  };
}
