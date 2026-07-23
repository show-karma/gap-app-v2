"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import type { Application } from "@/types/whitelabel-entities";
import { api } from "@/utilities/api/client";
import { HttpError, isApiError } from "@/utilities/api/errors";

/**
 * Extracts the backend's `message` from an HttpError body when present,
 * falling back to the ApiError's own message. Preserves the pre-migration
 * `fetchData` behavior of surfacing the server's actual error text (instead
 * of a generic "HTTP 400 PUT ..." string) in `setError`/toast copy.
 */
function toErrorMessage(err: unknown, fallback: string): string {
  if (isApiError(err)) {
    if (err instanceof HttpError) {
      const bodyMessage = (err.body as { message?: string } | undefined)?.message;
      return bodyMessage || err.message;
    }
    return err.message;
  }
  return err instanceof Error ? err.message : fallback;
}

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
      try {
        // TODO(#1775): add zod schema
        const response = await api.put<Application>(`/v2/funding-applications/${applicationId}`, {
          data: dataToSave,
        });
        if (!response) throw new Error("Failed to save draft");
        return response;
      } catch (err) {
        throw new Error(toErrorMessage(err, "Failed to save draft"));
      }
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
      try {
        // TODO(#1775): add zod schema
        const response = await api.put<Application>(
          `/v2/funding-applications/${applicationId}`,
          body
        );
        if (!response) throw new Error("Failed to submit application");
        return response;
      } catch (err) {
        throw new Error(toErrorMessage(err, "Failed to submit application"));
      }
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
