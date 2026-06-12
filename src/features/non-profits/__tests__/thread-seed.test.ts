/**
 * Unit tests for non-profits/lib/thread-seed.ts and the threadId field on
 * the philanthropy store.
 *
 * Covers the stale-thread bug: the philanthropy store is global, so a
 * previous session's chat thread survives client-side navigation. ChatView
 * must reset it before seeding a new session's query — otherwise the new
 * query is silently swallowed and only a hard refresh recovers.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { decideThreadSeed } from "../lib/thread-seed";
import { usePhilanthropyStore } from "../store/philanthropy";

describe("decideThreadSeed", () => {
  it("seeds when the store is empty (cold load)", () => {
    expect(
      decideThreadSeed({ searchId: "a", seededSearchId: null, messageCount: 0, threadId: null })
    ).toBe("seed");
  });

  it("does nothing when this instance already seeded this searchId", () => {
    expect(
      decideThreadSeed({ searchId: "a", seededSearchId: "a", messageCount: 1, threadId: "a" })
    ).toBe("already-seeded");
  });

  it("keeps the thread when it belongs to this searchId (remount/back-nav)", () => {
    expect(
      decideThreadSeed({ searchId: "a", seededSearchId: null, messageCount: 3, threadId: "a" })
    ).toBe("adopt-existing-thread");
  });

  it("resets then seeds when a previous session's thread is still in the store", () => {
    // The fixed bug: landing → search (thread for "a") → back → new search "b".
    expect(
      decideThreadSeed({ searchId: "b", seededSearchId: "a", messageCount: 2, threadId: "a" })
    ).toBe("reset-then-seed");
  });

  it("resets then seeds when the thread predates threadId tracking (null threadId)", () => {
    expect(
      decideThreadSeed({ searchId: "b", seededSearchId: null, messageCount: 2, threadId: null })
    ).toBe("reset-then-seed");
  });

  it("re-seeds after new-chat re-arms the ref on an empty store", () => {
    expect(
      decideThreadSeed({ searchId: "a", seededSearchId: null, messageCount: 0, threadId: null })
    ).toBe("seed");
  });
});

describe("usePhilanthropyStore.threadId", () => {
  beforeEach(() => {
    usePhilanthropyStore.getState().reset();
  });

  it("defaults to null and is settable", () => {
    expect(usePhilanthropyStore.getState().threadId).toBeNull();
    usePhilanthropyStore.getState().setThreadId("session-1");
    expect(usePhilanthropyStore.getState().threadId).toBe("session-1");
  });

  it("is cleared by reset()", () => {
    usePhilanthropyStore.getState().setThreadId("session-1");
    usePhilanthropyStore.getState().reset();
    expect(usePhilanthropyStore.getState().threadId).toBeNull();
  });
});
