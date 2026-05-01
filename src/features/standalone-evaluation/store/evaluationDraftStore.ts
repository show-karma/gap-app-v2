"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { EvaluationResultResponse, EvaluationStyle } from "../schemas/session.schema";

/**
 * Bucket persisted state by Privy wallet so a shared browser / account switch
 * doesn't rehydrate one user's drafts and results into another's session.
 * Reads the wallet address synchronously from Privy's own localStorage entry
 * (the same one `getWalletFromWagmiStore` uses); falls back to `anon` before
 * login. The base key matches the historical name so existing keys collide
 * only with the legacy unscoped bucket — the cleanup is left to the user.
 */
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

/**
 * Watch for Privy wallet changes — when the active wallet flips (login,
 * logout, account switch) we reset in-memory state to defaults and
 * re-rehydrate from the new bucket. Without this, the store's in-memory
 * state would persist across account switches and leak the previous
 * user's drafts/results into the new wallet's storage on next write.
 *
 * Implementation notes: `storage` events fire only for OTHER tabs, so we
 * also poll `privy:user` lazily on focus + a 1s interval. Both are
 * lightweight (string compare + read of one localStorage key).
 */
function installWalletChangeWatcher(): void {
  if (typeof window === "undefined") return;
  let lastSeenWallet = readPrivyWalletAddress();

  const checkAndReact = (): void => {
    const current = readPrivyWalletAddress();
    if (current === lastSeenWallet) return;
    lastSeenWallet = current;
    // Reset in-memory state to defaults; persist middleware then re-reads
    // from the new (current-wallet-scoped) bucket via rehydrate().
    useEvaluationDraftStore.setState({ ...initialState });
    // The persist API exposes rehydrate() on the store's `persist` extension.
    // Cast through unknown because the typing depends on middleware order.
    const persistApi = (
      useEvaluationDraftStore as unknown as {
        persist?: { rehydrate: () => Promise<void> };
      }
    ).persist;
    persistApi?.rehydrate().catch(() => {
      // Rehydrate failures are non-fatal — fall back to defaults already set.
    });
  };

  window.addEventListener("storage", (event) => {
    if (event.key === "privy:user") checkAndReact();
  });
  window.addEventListener("focus", checkAndReact);
  // Same-tab account switches (logout → login as different user without a
  // reload) emit no storage event, so a low-frequency tick covers them.
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
      // Include activeBulkJobIdBySession so a refresh / new tab can rebind
      // BulkProgressView to the still-running job. The id is just a pointer
      // to a server-authoritative resource — safe to round-trip via storage.
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
