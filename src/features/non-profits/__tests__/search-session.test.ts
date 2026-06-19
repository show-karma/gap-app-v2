/**
 * Unit tests for non-profits/store/search-session.ts
 *
 * Tests the Zustand persist store independently using getState() access
 * (mirrors the selector-safety rule — sessions is an object, never
 * accessed as a reactive selector).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { useSearchSessionStore } from "../store/search-session";

function resetStore() {
  useSearchSessionStore.setState({ sessions: {}, currentId: null });
}

describe("useSearchSessionStore", () => {
  beforeEach(() => {
    resetStore();
  });

  it("createSession creates a new session and returns its id", () => {
    const id = useSearchSessionStore.getState().createSession("foundations in Ohio");
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);

    const session = useSearchSessionStore.getState().getSession(id);
    expect(session).toMatchObject({ id, query: "foundations in Ohio" });
    expect(useSearchSessionStore.getState().currentId).toBe(id);
  });

  it("createSession ALWAYS mints a fresh session even for an identical query", () => {
    // The prior dedup behaviour caused stale results when the user
    // navigated back to the landing page and submitted the same chip
    // again — the route pointed at the cached old session instead of
    // a fresh run. Each submit must be a brand-new session.
    const id1 = useSearchSessionStore.getState().createSession("Youth literacy");
    const id2 = useSearchSessionStore.getState().createSession("youth LITERACY");
    expect(id2).not.toBe(id1);
    expect(useSearchSessionStore.getState().currentId).toBe(id2);
  });

  it("setSession creates or overwrites a session with the given id", () => {
    useSearchSessionStore.getState().setSession("custom-id-123", "climate grants");
    const session = useSearchSessionStore.getState().getSession("custom-id-123");
    expect(session).toMatchObject({ id: "custom-id-123", query: "climate grants" });
    expect(useSearchSessionStore.getState().currentId).toBe("custom-id-123");
  });

  it("setCurrentId updates currentId without touching sessions", () => {
    useSearchSessionStore.getState().setSession("s1", "query one");
    useSearchSessionStore.getState().setCurrentId(null);
    expect(useSearchSessionStore.getState().currentId).toBeNull();
    expect(useSearchSessionStore.getState().getSession("s1")).toBeDefined();
  });

  it("getSession returns undefined for unknown id", () => {
    const result = useSearchSessionStore.getState().getSession("nonexistent");
    expect(result).toBeUndefined();
  });

  it("clearSession removes the session and resets currentId when it was current", () => {
    const id = useSearchSessionStore.getState().createSession("foundations to clear");
    expect(useSearchSessionStore.getState().currentId).toBe(id);

    useSearchSessionStore.getState().clearSession(id);
    expect(useSearchSessionStore.getState().getSession(id)).toBeUndefined();
    expect(useSearchSessionStore.getState().currentId).toBeNull();
  });

  it("clearSession leaves other sessions and currentId intact", () => {
    const keep = useSearchSessionStore.getState().createSession("keep me");
    useSearchSessionStore.getState().setSession("drop-me", "drop me");
    useSearchSessionStore.getState().setCurrentId(keep);

    useSearchSessionStore.getState().clearSession("drop-me");
    expect(useSearchSessionStore.getState().getSession("drop-me")).toBeUndefined();
    expect(useSearchSessionStore.getState().getSession(keep)).toBeDefined();
    expect(useSearchSessionStore.getState().currentId).toBe(keep);
  });

  it("clearSession is a no-op for an unknown id", () => {
    const id = useSearchSessionStore.getState().createSession("still here");
    useSearchSessionStore.getState().clearSession("nonexistent");
    expect(useSearchSessionStore.getState().getSession(id)).toBeDefined();
  });

  it("createSession trims old sessions when MAX_SESSIONS (50) is reached", () => {
    // Seed 50 sessions
    for (let i = 0; i < 50; i += 1) {
      useSearchSessionStore.getState().createSession(`unique query ${i}`);
    }
    expect(Object.keys(useSearchSessionStore.getState().sessions)).toHaveLength(50);

    // Adding one more should evict the oldest
    useSearchSessionStore.getState().createSession("unique query overflow");
    expect(Object.keys(useSearchSessionStore.getState().sessions)).toHaveLength(50);
  });

  it("createSession for distinct queries produces distinct ids", () => {
    const id1 = useSearchSessionStore.getState().createSession("query alpha");
    const id2 = useSearchSessionStore.getState().createSession("query beta");
    expect(id1).not.toBe(id2);
  });

  it("createSession marks the session fresh", () => {
    const id = useSearchSessionStore.getState().createSession("brand new search");
    expect(useSearchSessionStore.getState().getSession(id)?.fresh).toBe(true);
  });

  it("consumeFresh returns true exactly once for a fresh session", () => {
    const id = useSearchSessionStore.getState().createSession("brand new search");

    expect(useSearchSessionStore.getState().consumeFresh(id)).toBe(true);
    // Second call: the flag was consumed — this is now a revisit.
    expect(useSearchSessionStore.getState().consumeFresh(id)).toBe(false);
    expect(useSearchSessionStore.getState().getSession(id)?.query).toBe("brand new search");
  });

  it("consumeFresh returns false for sessions written via setSession", () => {
    useSearchSessionStore.getState().setSession("remote-id", "hydrated from server");
    expect(useSearchSessionStore.getState().consumeFresh("remote-id")).toBe(false);
  });

  it("consumeFresh returns false for unknown ids", () => {
    expect(useSearchSessionStore.getState().consumeFresh("nonexistent")).toBe(false);
  });

  it("keeps an empty-query session after consumeFresh, distinct from an unknown id", () => {
    // A "New chat" mints an empty-query fresh session. After its one-shot fresh
    // flag is consumed (e.g. a reload before searching), getSession must still
    // return it — that's how ChatView tells "my own empty chat" (→ empty
    // workbench) apart from an unknown/private URL (→ not-found state).
    const id = useSearchSessionStore.getState().createSession("");
    expect(useSearchSessionStore.getState().consumeFresh(id)).toBe(true);
    expect(useSearchSessionStore.getState().getSession(id)).toBeDefined();
    expect(useSearchSessionStore.getState().getSession(id)?.query).toBe("");
    expect(useSearchSessionStore.getState().getSession("never-created")).toBeUndefined();
  });

  it("setSession clears the fresh flag for an existing session", () => {
    const id = useSearchSessionStore.getState().createSession("first query");
    useSearchSessionStore.getState().setSession(id, "first query");
    expect(useSearchSessionStore.getState().consumeFresh(id)).toBe(false);
  });
});
