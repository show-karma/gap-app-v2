/**
 * Search session store — ported from grant-atlas store/search-session.ts.
 *
 * Zustand v5 selector-safety rules:
 * - `sessions` is an object (non-primitive). NEVER use it as a reactive
 *   selector — always access via getState() in effects/callbacks to avoid
 *   React #185 infinite-render loops.
 * - Only primitive/stable-fn fields should be selected reactively.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SearchSession {
  id: string;
  query: string;
}

interface SearchSessionStore {
  sessions: Record<string, SearchSession>;
  currentId: string | null;
  createSession: (query: string) => string;
  setSession: (id: string, query: string) => void;
  getSession: (id: string) => SearchSession | undefined;
  clearSession: (id: string) => void;
  setCurrentId: (id: string | null) => void;
}

function generateId(): string {
  return crypto.randomUUID();
}

const MAX_SESSIONS = 50;

export const useSearchSessionStore = create<SearchSessionStore>()(
  persist(
    (set, get) => ({
      sessions: {},
      currentId: null,

      createSession: (query: string) => {
        // Always mint a fresh session. The prior implementation deduped
        // by query text, which meant submitting the same question twice
        // (from the landing page after navigating back) routed the user
        // to the cached old result instead of a re-run. A refresh fixed
        // it, which is exactly the smell of stale-session-on-replay.
        const { sessions } = get();
        const id = generateId();
        const entries = Object.entries(sessions);
        const trimmed =
          entries.length >= MAX_SESSIONS
            ? Object.fromEntries(entries.slice(-MAX_SESSIONS + 1))
            : sessions;

        set({
          sessions: { ...trimmed, [id]: { id, query } },
          currentId: id,
        });
        return id;
      },

      setSession: (id: string, query: string) => {
        const { sessions } = get();
        const entries = Object.entries(sessions);
        const trimmed =
          entries.length >= MAX_SESSIONS
            ? Object.fromEntries(entries.slice(-MAX_SESSIONS + 1))
            : sessions;

        set({
          sessions: { ...trimmed, [id]: { id, query } },
          currentId: id,
        });
      },

      getSession: (id: string) => get().sessions[id],

      clearSession: (id: string) => {
        const { sessions, currentId } = get();
        if (!(id in sessions)) return;
        const { [id]: _removed, ...rest } = sessions;
        set({ sessions: rest, currentId: currentId === id ? null : currentId });
      },

      setCurrentId: (id) => set({ currentId: id }),
    }),
    {
      name: "non-profits-search-sessions",
      partialize: (state) => ({
        sessions: state.sessions,
        currentId: state.currentId,
      }),
    }
  )
);
