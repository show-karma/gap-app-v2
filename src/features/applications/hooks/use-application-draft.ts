"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { Application } from "@/types/whitelabel-entities";
import fetchData from "@/utilities/fetchData";
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
      if (applicationId) {
        const [response, error] = await fetchData<Application>(
          `/v2/funding-applications/${applicationId}`,
          "PUT",
          { data }
        );
        if (error || !response) throw new Error(error ?? "Failed to update draft");
        return response;
      }
      const [response, error] = await fetchData<Application>(
        `/v2/funding-applications/${programId}`,
        "POST",
        { programId, data, applicantEmail }
      );
      if (error || !response) throw new Error(error ?? "Failed to create draft");
      return response;
    },
    onSuccess: (application) => {
      queryClient.invalidateQueries({
        queryKey: ["applications", application.programId],
      });
      queryClient.invalidateQueries({
        queryKey: ["application", application.referenceNumber],
      });
      queryClient.invalidateQueries({ queryKey: ["user-applications"] });
    },
  });

  const deleteDraftMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      const [, error] = await fetchData(`/v2/funding-applications/${applicationId}`, "DELETE");
      if (error) throw new Error(error);
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
