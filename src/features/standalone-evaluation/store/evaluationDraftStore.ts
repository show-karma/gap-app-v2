"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EvaluationResultResponse, EvaluationStyle } from "../schemas/session.schema";

const STORAGE_KEY = "karma-evaluator-draft";

export interface EvaluationDraft {
  programDescription: string;
  evaluationCriteria: string;
  evaluationStyle: EvaluationStyle;
}

interface EvaluationDraftState {
  // Form draft for an unsubmitted session config
  draft: EvaluationDraft;
  // Application text the user is composing for the active session
  applicationText: string;
  // Active session ID the user is iterating on (null when starting fresh)
  activeSessionId: string | null;
  // Iteration result history keyed by sessionId
  resultsBySession: Record<string, EvaluationResultResponse[]>;
  // Active bulk job id by sessionId
  activeBulkJobIdBySession: Record<string, string | null>;

  setDraft: (patch: Partial<EvaluationDraft>) => void;
  resetDraft: () => void;

  setApplicationText: (text: string) => void;

  setActiveSessionId: (id: string | null) => void;

  appendResult: (sessionId: string, result: EvaluationResultResponse) => void;
  setResults: (sessionId: string, results: EvaluationResultResponse[]) => void;
  clearResults: (sessionId: string) => void;

  setActiveBulkJobId: (sessionId: string, jobId: string | null) => void;

  reset: () => void;
}

const emptyDraft: EvaluationDraft = {
  programDescription: "",
  evaluationCriteria: "",
  evaluationStyle: "RUBRIC",
};

const initialState = {
  draft: emptyDraft,
  applicationText: "",
  activeSessionId: null as string | null,
  resultsBySession: {} as Record<string, EvaluationResultResponse[]>,
  activeBulkJobIdBySession: {} as Record<string, string | null>,
};

export const useEvaluationDraftStore = create<EvaluationDraftState>()(
  persist(
    (set) => ({
      ...initialState,

      setDraft: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),
      resetDraft: () => set({ draft: { ...emptyDraft } }),

      setApplicationText: (text) => set({ applicationText: text }),

      setActiveSessionId: (id) => set({ activeSessionId: id }),

      appendResult: (sessionId, result) =>
        set((state) => {
          const prior = state.resultsBySession[sessionId] ?? [];
          // Avoid duplicate iteration numbers if the same mutation re-runs.
          const filtered = prior.filter((r) => r.id !== result.id);
          return {
            resultsBySession: {
              ...state.resultsBySession,
              [sessionId]: [...filtered, result].sort(
                (a, b) => a.iterationNumber - b.iterationNumber
              ),
            },
          };
        }),

      setResults: (sessionId, results) =>
        set((state) => ({
          resultsBySession: { ...state.resultsBySession, [sessionId]: results },
        })),

      clearResults: (sessionId) =>
        set((state) => {
          const next = { ...state.resultsBySession };
          delete next[sessionId];
          return { resultsBySession: next };
        }),

      setActiveBulkJobId: (sessionId, jobId) =>
        set((state) => ({
          activeBulkJobIdBySession: {
            ...state.activeBulkJobIdBySession,
            [sessionId]: jobId,
          },
        })),

      reset: () => set({ ...initialState }),
    }),
    {
      name: STORAGE_KEY,
      // Persist everything except activeBulkJobIdBySession (job state is server-authoritative).
      partialize: (state) => ({
        draft: state.draft,
        applicationText: state.applicationText,
        activeSessionId: state.activeSessionId,
        resultsBySession: state.resultsBySession,
      }),
    }
  )
);
