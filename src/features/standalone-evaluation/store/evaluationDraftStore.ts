"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { EvaluationResultResponse, EvaluationStyle } from "../schemas/session.schema";

// Bucket persisted state by Privy wallet — shared browser / account switch
// would otherwise leak one user's drafts and results into another's session.
const STORAGE_KEY = "karma-evaluator-draft";

function readPrivyWalletAddress(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("privy:user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      wallet?: { address?: string };
      linkedAccounts?: Array<{ type?: string; address?: string }>;
    };
    if (parsed.wallet?.address) return parsed.wallet.address;
    const linked = parsed.linkedAccounts?.find((a) => a?.type === "wallet");
    return linked?.address ?? null;
  } catch {
    return null;
  }
}

function scopedKey(baseKey: string): string {
  const wallet = readPrivyWalletAddress();
  return wallet ? `${baseKey}::${wallet.toLowerCase()}` : `${baseKey}::anon`;
}

const userScopedLocalStorage = {
  getItem: (name: string): string | null =>
    typeof window === "undefined" ? null : window.localStorage.getItem(scopedKey(name)),
  setItem: (name: string, value: string): void => {
    if (typeof window !== "undefined") window.localStorage.setItem(scopedKey(name), value);
  },
  removeItem: (name: string): void => {
    if (typeof window !== "undefined") window.localStorage.removeItem(scopedKey(name));
  },
};

export interface EvaluationDraft {
  programDescription: string;
  evaluationCriteria: string;
  evaluationStyle: EvaluationStyle;
}

interface EvaluationDraftState {
  draft: EvaluationDraft;
  applicationText: string;
  activeSessionId: string | null;
  resultsBySession: Record<string, EvaluationResultResponse[]>;
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

// On wallet change, reset in-memory state and re-read from the new bucket.
// `storage` events fire only for OTHER tabs, so a 1s tick + focus listener
// covers same-tab account switches that emit no storage event.
function installWalletChangeWatcher(): void {
  if (typeof window === "undefined") return;
  let lastSeenWallet = readPrivyWalletAddress();

  const checkAndReact = (): void => {
    const current = readPrivyWalletAddress();
    if (current === lastSeenWallet) return;
    lastSeenWallet = current;
    useEvaluationDraftStore.setState({ ...initialState });
    const persistApi = (
      useEvaluationDraftStore as unknown as {
        persist?: { rehydrate: () => Promise<void> };
      }
    ).persist;
    persistApi?.rehydrate().catch(() => {});
  };

  window.addEventListener("storage", (event) => {
    if (event.key === "privy:user") checkAndReact();
  });
  window.addEventListener("focus", checkAndReact);
  window.setInterval(checkAndReact, 1000);
}

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
      storage: createJSONStorage(() => userScopedLocalStorage),
      partialize: (state) => ({
        draft: state.draft,
        applicationText: state.applicationText,
        activeSessionId: state.activeSessionId,
        resultsBySession: state.resultsBySession,
        activeBulkJobIdBySession: state.activeBulkJobIdBySession,
      }),
    }
  )
);

installWalletChangeWatcher();
