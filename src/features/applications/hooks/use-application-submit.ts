"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import type { Application } from "@/types/whitelabel-entities";
import fetchData from "@/utilities/fetchData";
import type { ApplicationFormData, UseApplicationSubmitReturn } from "../types";

export function useApplicationSubmit(_communityId: string): UseApplicationSubmitReturn {
  const submitMutation = useMutation({
    mutationFn: async ({
      programId,
      data,
      applicantEmail,
      aiEvaluation,
      accessCode,
    }: {
      programId: string;
      data: ApplicationFormData;
      applicantEmail: string;
      aiEvaluation?: { evaluation: string; promptId: string };
      accessCode?: string;
    }) => {
      const body: Record<string, unknown> = {
        programId,
        applicationData: data,
        applicantEmail,
      };
      if (aiEvaluation) body.aiEvaluation = aiEvaluation;
      if (accessCode) body.accessCode = accessCode;

      const [response, fetchError] = await fetchData<Application>(
        `/v2/funding-applications/${programId}`,
        "POST",
        body
      );
      if (fetchError || !response) {
        throw new Error(fetchError ?? "Failed to submit application");
      }
      return response;
    },
  });

  const submit = useCallback(
    async (
      programId: string,
      data: ApplicationFormData,
      applicantEmail: string,
      aiEvaluation?: { evaluation: string; promptId: string },
      accessCode?: string
    ): Promise<Application> => {
      return submitMutation.mutateAsync({
        programId,
        data,
        applicantEmail,
        aiEvaluation,
        accessCode,
      });
    },
    [submitMutation]
  );

  return {
    submit,
    isSubmitting: submitMutation.isPending,
    error: (submitMutation.error as Error | null) ?? null,
  };
}
