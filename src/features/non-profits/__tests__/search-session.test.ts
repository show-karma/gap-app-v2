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

  it("createSession reuses an existing session for a duplicate query (case-insensitive)", () => {
    const id1 = useSearchSessionStore.getState().createSession("Youth literacy");
    const id2 = useSearchSessionStore.getState().createSession("youth LITERACY");
    expect(id2).toBe(id1);
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
});
