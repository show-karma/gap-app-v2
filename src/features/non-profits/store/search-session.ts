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
        const { sessions } = get();

        // Reuse existing session for the same query
        for (const [id, session] of Object.entries(sessions)) {
          if (session.query.toLowerCase() === query.toLowerCase()) {
            set({ currentId: id });
            return id;
          }
        }

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
