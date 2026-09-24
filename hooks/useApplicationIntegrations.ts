import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { QUERY_KEYS } from "@/hooks/fundingPlatformQueryKeys";
import {
  addSimocracySimLink,
  deleteSimocracyCredential,
  deleteSimocracySimLink,
  exportSimocracyFeedbackCsv,
  feedbackSubjectKey,
  fetchApplicationIntegrations,
  fetchSimocracyComments,
  fetchSimocracyCouncil,
  fetchSimocracyEvaluations,
  fetchSimocracyFeedback,
  fetchSimocracyProgramSummary,
  fetchSimocracySimLinks,
  fetchSimocracySimPersona,
  type SimocracyFeedbackSubject,
  type SimocracyFeedbackVerdict,
  type SimocracySimLink,
  setSimocracyCredential,
  submitSimocracyFeedback,
} from "@/services/fundingApplicationIntegrations.service";
import { type FundingProgram, fundingPlatformService } from "@/services/fundingPlatformService";
import type { ISimocracyIntegrationConfig } from "@/types/funding-platform";

const INTEGRATIONS_STALE_TIME_MS = 60_000;

export function useApplicationIntegrations(referenceNumber: string) {
  return useQuery({
    queryKey: QUERY_KEYS.applicationIntegrations(referenceNumber),
    queryFn: () => fetchApplicationIntegrations(referenceNumber),
    enabled: !!referenceNumber,
    staleTime: INTEGRATIONS_STALE_TIME_MS,
  });
}

export function useSimocracyEvaluations(referenceNumber: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: QUERY_KEYS.simocracyEvaluations(referenceNumber),
    queryFn: () => fetchSimocracyEvaluations(referenceNumber),
    enabled: (options?.enabled ?? true) && !!referenceNumber,
    staleTime: INTEGRATIONS_STALE_TIME_MS,
  });
}

export function useSimocracyProgramSummary(
  programId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: QUERY_KEYS.simocracyProgramSummary(programId ?? ""),
    queryFn: () => fetchSimocracyProgramSummary(programId ?? ""),
    enabled: (options?.enabled ?? true) && !!programId,
    staleTime: INTEGRATIONS_STALE_TIME_MS,
  });
}

export function useSimocracyCouncil(
  programId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: QUERY_KEYS.simocracyCouncil(programId ?? ""),
    queryFn: () => fetchSimocracyCouncil(programId ?? ""),
    enabled: (options?.enabled ?? true) && !!programId,
    staleTime: INTEGRATIONS_STALE_TIME_MS,
  });
}

export function useSimocracySimPersona(
  programId: string,
  simUri: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: QUERY_KEYS.simocracySimPersona(programId, simUri),
    queryFn: () => fetchSimocracySimPersona(programId, simUri),
    enabled: (options?.enabled ?? false) && !!programId && !!simUri,
    staleTime: 30_000,
  });
}

export function useSimocracySimLinks(
  programId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: QUERY_KEYS.simocracySimLinks(programId ?? ""),
    queryFn: () => fetchSimocracySimLinks(programId ?? ""),
    enabled: (options?.enabled ?? true) && !!programId,
    staleTime: INTEGRATIONS_STALE_TIME_MS,
  });
}

/**
 * Mutations for the global Sim ↔ Karma user link table, scoped to a program
 * for authorization. Both mutations update the links cache optimistically and
 * roll back on failure.
 */
export function useSimocracySimLinkMutations(programId: string) {
  const queryClient = useQueryClient();
  const linksKey = QUERY_KEYS.simocracySimLinks(programId);

  const addMutation = useMutation({
    mutationFn: (link: SimocracySimLink) => addSimocracySimLink(programId, link),
    onMutate: async (link) => {
      await queryClient.cancelQueries({ queryKey: linksKey });
      const previous = queryClient.getQueryData<SimocracySimLink[]>(linksKey);
      queryClient.setQueryData<SimocracySimLink[]>(linksKey, (old = []) => [
        ...old.filter((existing) => existing.simUri !== link.simUri),
        { simUri: link.simUri, publicAddress: link.publicAddress.toLowerCase() },
      ]);
      return { previous };
    },
    onError: (error, _link, context) => {
      if (context?.previous) {
        queryClient.setQueryData(linksKey, context.previous);
      }
      toast.error(error instanceof Error ? error.message : "Failed to link sim");
    },
    onSuccess: () => {
      toast.success("Sim linked");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: linksKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (simUri: string) => deleteSimocracySimLink(programId, simUri),
    onMutate: async (simUri) => {
      await queryClient.cancelQueries({ queryKey: linksKey });
      const previous = queryClient.getQueryData<SimocracySimLink[]>(linksKey);
      queryClient.setQueryData<SimocracySimLink[]>(linksKey, (old = []) =>
        old.filter((existing) => existing.simUri !== simUri)
      );
      return { previous };
    },
    onError: (error, _simUri, context) => {
      if (context?.previous) {
        queryClient.setQueryData(linksKey, context.previous);
      }
      toast.error(error instanceof Error ? error.message : "Failed to remove sim link");
    },
    onSuccess: () => {
      toast.success("Sim link removed");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: linksKey });
    },
  });

  return {
    addSimLinkAsync: addMutation.mutateAsync,
    isAdding: addMutation.isPending,
    deleteSimLinkAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deletingSimUri: deleteMutation.isPending ? deleteMutation.variables : undefined,
  };
}

/**
 * Persists the Simocracy section of a program's `integrations` config through
 * the program-config update endpoint. The body carries ONLY `integrations` —
 * the endpoint treats absent fields as "leave unchanged", so formSchema and
 * the rest of the config are never clobbered. Optimistically patches the
 * cached program config and rolls back on failure.
 */
export function useUpdateSimocracyIntegration(programId: string) {
  const queryClient = useQueryClient();
  const configKey = QUERY_KEYS.programConfig(programId);

  return useMutation({
    mutationFn: (simocracy: ISimocracyIntegrationConfig) =>
      fundingPlatformService.programs.updateProgramConfiguration(programId, {
        integrations: { simocracy },
      }),
    onMutate: async (simocracy) => {
      await queryClient.cancelQueries({ queryKey: configKey });
      const previous = queryClient.getQueryData<FundingProgram>(configKey);
      if (previous?.applicationConfig) {
        queryClient.setQueryData<FundingProgram>(configKey, {
          ...previous,
          applicationConfig: {
            ...previous.applicationConfig,
            integrations: {
              ...previous.applicationConfig.integrations,
              simocracy,
            },
          },
        });
      }
      return { previous };
    },
    onError: (error, _simocracy, context) => {
      if (context?.previous) {
        queryClient.setQueryData(configKey, context.previous);
      }
      toast.error(error instanceof Error ? error.message : "Failed to update Simocracy settings");
    },
    onSuccess: () => {
      toast.success("Simocracy settings saved");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: configKey });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simocracyProgramSummary(programId) });
    },
  });
}

export function useSetSimocracyCredential(programId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appPassword: string) => setSimocracyCredential(programId, appPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.programConfig(programId) });
      toast.success("Simocracy credential verified and saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteSimocracyCredential(programId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteSimocracyCredential(programId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.programConfig(programId) });
      toast.success("Simocracy credential removed");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useSimocracyComments(referenceNumber: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: QUERY_KEYS.simocracyComments(referenceNumber),
    queryFn: () => fetchSimocracyComments(referenceNumber),
    enabled: (options?.enabled ?? true) && !!referenceNumber,
    staleTime: INTEGRATIONS_STALE_TIME_MS,
  });
}

// `subject` narrows to one run or one verdict comment; "all" loads every
// entry of the application in a single request (used by the comment list).
export function useSimocracyFeedback(
  referenceNumber: string,
  subject: SimocracyFeedbackSubject | "all" | null,
  options?: { enabled?: boolean }
) {
  const narrowed = subject && subject !== "all" ? subject : undefined;
  return useQuery({
    queryKey: QUERY_KEYS.simocracyFeedback(
      referenceNumber,
      narrowed ? feedbackSubjectKey(narrowed) : "all"
    ),
    queryFn: () => fetchSimocracyFeedback(referenceNumber, narrowed),
    enabled: (options?.enabled ?? true) && !!referenceNumber && subject !== null,
    staleTime: INTEGRATIONS_STALE_TIME_MS,
  });
}

export function useSubmitSimocracyFeedback(
  referenceNumber: string,
  subject: SimocracyFeedbackSubject
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { simUri: string; verdict: SimocracyFeedbackVerdict; comment?: string }) =>
      submitSimocracyFeedback(referenceNumber, { ...subject, ...input }),
    onSuccess: () => {
      // Drops the narrowed and the "all" caches of this application at once.
      queryClient.invalidateQueries({
        queryKey: ["simocracy-feedback", referenceNumber],
      });
      toast.success("Feedback saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// A download, not a cache write: plain async state instead of a mutation.
export function useExportSimocracyFeedback(programId: string) {
  const [isPending, setIsPending] = useState(false);
  const mutate = useCallback(async () => {
    setIsPending(true);
    try {
      const { blob, filename } = await exportSimocracyFeedbackCsv(programId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Feedback exported");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export feedback");
    } finally {
      setIsPending(false);
    }
  }, [programId]);
  return { mutate, isPending };
}
