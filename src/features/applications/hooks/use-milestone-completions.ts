"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import fetchData from "@/utilities/fetchData";

interface MilestoneCompletion {
  id: string;
  milestoneFieldLabel: string;
  milestoneTitle: string;
  completionText: string;
  isVerified: boolean;
  verifiedBy?: string;
  verificationComment?: string;
  createdAt: string;
  updatedAt: string;
}

interface MilestoneCompletionPayload {
  milestoneFieldLabel: string;
  milestoneTitle: string;
  completionText: string;
}

interface UseMilestoneCompletionsOptions {
  communityId: string;
  referenceNumber: string;
  enabled?: boolean;
}

export function useMilestoneCompletions({
  communityId,
  referenceNumber,
  enabled = true,
}: UseMilestoneCompletionsOptions) {
  const queryClient = useQueryClient();

  const {
    data: completions = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["milestone-completions", communityId, referenceNumber],
    queryFn: async () => {
      const [response, fetchError] = await fetchData<
        MilestoneCompletion[] | { data: MilestoneCompletion[] }
      >(`/v2/funding-applications/${referenceNumber}/milestone-completions`);
      if (fetchError) throw new Error(fetchError);
      if (!response) return [];
      return Array.isArray(response) ? response : (response.data ?? []);
    },
    enabled: enabled && !!referenceNumber,
  });

  const createCompletion = useMutation({
    mutationFn: async (payload: MilestoneCompletionPayload) => {
      const [response, fetchError] = await fetchData<MilestoneCompletion>(
        `/v2/funding-applications/${referenceNumber}/milestone-completions`,
        "POST",
        payload
      );
      if (fetchError || !response)
        throw new Error(fetchError ?? "Failed to create milestone completion");
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["milestone-completions", communityId, referenceNumber],
      });
    },
  });

  const updateCompletion = useMutation({
    mutationFn: async (payload: MilestoneCompletionPayload) => {
      const [response, fetchError] = await fetchData<MilestoneCompletion>(
        `/v2/funding-applications/${referenceNumber}/milestone-completions`,
        "PUT",
        payload
      );
      if (fetchError || !response)
        throw new Error(fetchError ?? "Failed to update milestone completion");
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["milestone-completions", communityId, referenceNumber],
      });
    },
  });

  const getCompletion = (
    milestoneFieldLabel: string,
    milestoneTitle: string
  ): MilestoneCompletion | undefined => {
    const normalizedFieldLabel = milestoneFieldLabel?.trim();
    const normalizedTitle = milestoneTitle?.trim();
    return completions.find(
      (c) =>
        c.milestoneFieldLabel?.trim() === normalizedFieldLabel &&
        c.milestoneTitle?.trim() === normalizedTitle
    );
  };

  const hasCompletion = (milestoneFieldLabel: string, milestoneTitle: string): boolean => {
    return !!getCompletion(milestoneFieldLabel, milestoneTitle);
  };

  return {
    completions,
    isLoading,
    error,
    refetch,
    createCompletion: createCompletion.mutate,
    updateCompletion: updateCompletion.mutate,
    isCreating: createCompletion.isPending,
    isUpdating: updateCompletion.isPending,
    createError: createCompletion.error,
    updateError: updateCompletion.error,
    getCompletion,
    hasCompletion,
  };
}
