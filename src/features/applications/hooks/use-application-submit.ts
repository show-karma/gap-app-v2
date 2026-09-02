"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import type { Application } from "@/types/whitelabel-entities";
import { track } from "@/utilities/analytics/client";
import { toErrorCode } from "@/utilities/analytics/error-code";
import { api } from "@/utilities/api/client";
import { secondsSinceApplicationStarted } from "../lib/application-timing";
import type { ApplicationFormData, UseApplicationSubmitReturn } from "../types";

export function useApplicationSubmit(communityId: string): UseApplicationSubmitReturn {
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

      // TODO(#1775): add zod schema
      const response = await api.post<Application>(`/v2/funding-applications/${programId}`, body);
      if (!response) {
        throw new Error("Failed to submit application");
      }
      return response;
    },
    onSuccess: (_application, { programId }) => {
      track("application_submitted", {
        program_id: programId,
        community_id: communityId,
        time_to_submit_s: secondsSinceApplicationStarted(programId),
      });
    },
    onError: (error, { programId }) => {
      track("application_submit_failed", {
        program_id: programId,
        error_code: toErrorCode(error),
      });
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
