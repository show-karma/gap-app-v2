"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type { EvaluationResultResponse, SessionResponse } from "../schemas/session.schema";
import { standaloneEvaluationService } from "../services/standaloneEvaluationService";
import { useEvaluationDraftStore } from "../store/evaluationDraftStore";
import { CREDITS_QUERY_KEYS } from "./useCredits";
import { EVALUATION_SESSION_KEYS } from "./useEvaluationSessions";

interface EvaluateApplicationInput {
  sessionId: string;
  applicationText: string;
}

export const useEvaluateApplication = () => {
  const queryClient = useQueryClient();
  const appendResult = useEvaluationDraftStore((s) => s.appendResult);

  return useMutation<EvaluationResultResponse, Error, EvaluateApplicationInput>({
    mutationFn: ({ sessionId, applicationText }) =>
      standaloneEvaluationService.evaluateApplication(sessionId, applicationText),
    onSuccess: (result, vars) => {
      toast.success("Evaluation complete");
      appendResult(vars.sessionId, result);
      queryClient.invalidateQueries({
        queryKey: EVALUATION_SESSION_KEYS.detail(vars.sessionId),
      });
      queryClient.invalidateQueries({ queryKey: CREDITS_QUERY_KEYS.all });
    },
    onError: (error) => {
      toast.error(error.message || "Evaluation failed");
    },
  });
};

interface SubmitFeedbackInput {
  sessionId: string;
  feedback: string;
}

export const useSubmitFeedback = () => {
  const queryClient = useQueryClient();
  const appendResult = useEvaluationDraftStore((s) => s.appendResult);

  return useMutation<EvaluationResultResponse, Error, SubmitFeedbackInput>({
    mutationFn: ({ sessionId, feedback }) =>
      standaloneEvaluationService.submitFeedback(sessionId, feedback),
    onSuccess: (result, vars) => {
      toast.success("Re-evaluation complete");
      appendResult(vars.sessionId, result);
      queryClient.invalidateQueries({
        queryKey: EVALUATION_SESSION_KEYS.detail(vars.sessionId),
      });
      queryClient.invalidateQueries({ queryKey: CREDITS_QUERY_KEYS.all });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit feedback");
    },
  });
};

interface SetSampleInput {
  sessionId: string;
  sampleApplication: string;
}

export const useSetSample = () => {
  const queryClient = useQueryClient();

  return useMutation<SessionResponse, Error, SetSampleInput>({
    mutationFn: ({ sessionId, sampleApplication }) =>
      standaloneEvaluationService.setSample(sessionId, sampleApplication),
    onSuccess: (session) => {
      queryClient.setQueryData(EVALUATION_SESSION_KEYS.detail(session.id), session);
      queryClient.invalidateQueries({ queryKey: EVALUATION_SESSION_KEYS.all });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save sample");
    },
  });
};

export const useMarkReadyForBulk = () => {
  const queryClient = useQueryClient();

  return useMutation<SessionResponse, Error, string>({
    mutationFn: (sessionId) => standaloneEvaluationService.markReadyForBulk(sessionId),
    onSuccess: (session) => {
      toast.success("Session ready for bulk processing");
      queryClient.setQueryData(EVALUATION_SESSION_KEYS.detail(session.id), session);
      queryClient.invalidateQueries({ queryKey: EVALUATION_SESSION_KEYS.all });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to mark session ready");
    },
  });
};
