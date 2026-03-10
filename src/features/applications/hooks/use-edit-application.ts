"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import type { Application } from "@/types/whitelabel-entities";
import fetchData from "@/utilities/fetchData";

export function useEditApplication(
  communityId: string,
  applicationId: string,
  initialApplication: Application
) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(initialApplication.applicationData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFormData(initialApplication.applicationData);
  }, [initialApplication.applicationData]);

  const updateFormData = useCallback((updates: Partial<Record<string, unknown>>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setError(null);
  }, []);

  const saveDraftMutation = useMutation({
    mutationFn: async (dataToSave: Record<string, unknown>) => {
      const [response, fetchError] = await fetchData<Application>(
        `/v2/funding-applications/${applicationId}`,
        "PUT",
        { data: dataToSave }
      );
      if (fetchError || !response) throw new Error(fetchError ?? "Failed to save draft");
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["application", communityId, applicationId],
      });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to save draft");
    },
  });

  const submitMutation = useMutation({
    mutationFn: async ({
      dataToSubmit,
      aiEvaluation,
    }: {
      dataToSubmit: Record<string, unknown>;
      aiEvaluation?: { evaluation: string; promptId: string };
    }) => {
      const body: Record<string, unknown> = { data: dataToSubmit };
      if (aiEvaluation) body.aiEvaluation = aiEvaluation;
      const [response, fetchError] = await fetchData<Application>(
        `/v2/funding-applications/${applicationId}`,
        "PUT",
        body
      );
      if (fetchError || !response) throw new Error(fetchError ?? "Failed to submit application");
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["application", communityId, applicationId],
      });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to submit application");
    },
  });

  const saveDraft = useCallback(
    async (dataToSave?: Record<string, unknown>) => {
      const data = dataToSave || formData;
      await saveDraftMutation.mutateAsync(data);
      return true;
    },
    [formData, saveDraftMutation]
  );

  const submitApplication = useCallback(
    async (
      dataToSubmit?: Record<string, unknown>,
      aiEvaluation?: { evaluation: string; promptId: string }
    ) => {
      const data = dataToSubmit || formData;
      await submitMutation.mutateAsync({ dataToSubmit: data, aiEvaluation });
      return true;
    },
    [formData, submitMutation]
  );

  return {
    formData,
    updateFormData,
    saveDraft,
    submitApplication,
    isLoading: false,
    isSaving: saveDraftMutation.isPending,
    isSubmitting: submitMutation.isPending,
    error,
  };
}
