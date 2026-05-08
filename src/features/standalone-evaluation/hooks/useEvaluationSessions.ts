"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import type { SessionCreateInput, SessionResponse } from "../schemas/session.schema";
import { standaloneEvaluationService } from "../services/standaloneEvaluationService";
import { useEvaluationDraftStore } from "../store/evaluationDraftStore";

export const EVALUATION_SESSION_KEYS = {
  all: ["evaluation-sessions"] as const,
  list: (params: { limit: number; offset: number }) =>
    [...EVALUATION_SESSION_KEYS.all, "list", params] as const,
  detail: (id: string) => [...EVALUATION_SESSION_KEYS.all, "detail", id] as const,
};

export const useSessions = (params: { limit?: number; offset?: number } = {}) => {
  const { authenticated } = useAuth();
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;
  return useQuery({
    queryKey: EVALUATION_SESSION_KEYS.list({ limit, offset }),
    queryFn: () => standaloneEvaluationService.listSessions({ limit, offset }),
    enabled: authenticated,
    staleTime: 30_000,
  });
};

export const useSession = (id: string | null | undefined) => {
  const { authenticated } = useAuth();
  return useQuery({
    queryKey: EVALUATION_SESSION_KEYS.detail(id ?? ""),
    queryFn: () => standaloneEvaluationService.getSession(id as string),
    enabled: authenticated && Boolean(id),
    staleTime: 15_000,
  });
};

export const useCreateSession = () => {
  const queryClient = useQueryClient();
  const setActiveSessionId = useEvaluationDraftStore((s) => s.setActiveSessionId);
  const resetDraft = useEvaluationDraftStore((s) => s.resetDraft);

  return useMutation<SessionResponse, Error, SessionCreateInput>({
    mutationFn: (input) => standaloneEvaluationService.createSession(input),
    onSuccess: (session) => {
      toast.success("Evaluation session created");
      setActiveSessionId(session.id);
      resetDraft();
      queryClient.invalidateQueries({ queryKey: EVALUATION_SESSION_KEYS.all });
      queryClient.setQueryData(EVALUATION_SESSION_KEYS.detail(session.id), session);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create session");
    },
  });
};

export const useDeleteSession = () => {
  const queryClient = useQueryClient();
  const clearResults = useEvaluationDraftStore((s) => s.clearResults);
  const activeSessionId = useEvaluationDraftStore((s) => s.activeSessionId);
  const setActiveSessionId = useEvaluationDraftStore((s) => s.setActiveSessionId);

  return useMutation<void, Error, string>({
    mutationFn: (id) => standaloneEvaluationService.deleteSession(id),
    onSuccess: (_, id) => {
      toast.success("Session deleted");
      clearResults(id);
      if (activeSessionId === id) setActiveSessionId(null);
      queryClient.invalidateQueries({ queryKey: EVALUATION_SESSION_KEYS.all });
      queryClient.removeQueries({ queryKey: EVALUATION_SESSION_KEYS.detail(id) });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete session");
    },
  });
};
