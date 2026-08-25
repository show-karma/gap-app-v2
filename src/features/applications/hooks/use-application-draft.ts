"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { applicationKeys } from "@/src/lib/query-keys";
import type { Application } from "@/types/whitelabel-entities";
import { api } from "@/utilities/api/client";
import type { ApplicationFormData, UseApplicationDraftReturn } from "../types";

export function useApplicationDraft(communityId: string): UseApplicationDraftReturn {
  const queryClient = useQueryClient();

  const saveDraftMutation = useMutation({
    mutationFn: async ({
      programId,
      applicationId,
      data,
      applicantEmail,
    }: {
      programId: string;
      applicationId?: string;
      data: ApplicationFormData;
      applicantEmail: string;
    }) => {
      // TODO(#1775): add zod schema
      if (applicationId) {
        return api.put<Application>(`/v2/funding-applications/${applicationId}`, { data });
      }
      return api.post<Application>(`/v2/funding-applications/${programId}`, {
        programId,
        data,
        applicantEmail,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
    },
  });

  const deleteDraftMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      await api.delete(`/v2/funding-applications/${applicationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["user-applications"] });
    },
  });

  const saveDraft = useCallback(
    async (
      programId: string,
      data: ApplicationFormData,
      applicantEmail: string,
      applicationId?: string
    ): Promise<Application> => {
      return saveDraftMutation.mutateAsync({
        programId,
        applicationId,
        data,
        applicantEmail,
      });
    },
    [saveDraftMutation]
  );

  const deleteDraft = useCallback(
    async (applicationId: string): Promise<void> => {
      return deleteDraftMutation.mutateAsync(applicationId);
    },
    [deleteDraftMutation]
  );

  return {
    saveDraft,
    deleteDraft,
    isSavingDraft: saveDraftMutation.isPending,
    isDeletingDraft: deleteDraftMutation.isPending,
  };
}
