"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  MilestoneCompletion,
  MilestoneCompletionPayload,
} from "../services/milestone-completion.service";
import {
  createMilestoneCompletion,
  getMilestoneCompletions,
  updateMilestoneCompletion,
} from "../services/milestone-completion.service";

interface UseMilestoneCompletionsOptions {
  referenceNumber: string;
  enabled?: boolean;
}

export function useMilestoneCompletions({
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
    queryKey: ["milestone-completions", referenceNumber],
    queryFn: () => getMilestoneCompletions(referenceNumber),
    enabled: enabled && !!referenceNumber,
  });

  const createCompletion = useMutation({
    mutationFn: (payload: MilestoneCompletionPayload) =>
      createMilestoneCompletion(referenceNumber, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["milestone-completions", referenceNumber],
      });
    },
  });

  const updateCompletion = useMutation({
    mutationFn: (payload: MilestoneCompletionPayload) =>
      updateMilestoneCompletion(referenceNumber, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["milestone-completions", referenceNumber],
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
