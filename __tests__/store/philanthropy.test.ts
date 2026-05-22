/**
 * @file Tests for usePhilanthropyStore
 *
 * Covers:
 * - Initial state
 * - Selector-safety: EMPTY_* constants are stable references
 * - appendTurn / updateLastTurn streaming actions
 * - Legacy setQuery / setNarrative / setResult / setSearching / setError / setTraceId
 * - reset() restores all fields to initialState
 */

import { act } from "@testing-library/react";
import type { ChatTurn } from "@/src/features/non-profits/store/philanthropy";
import {
  EMPTY_ATTACHMENTS,
  EMPTY_CITATIONS,
  EMPTY_ENTITIES,
  EMPTY_MESSAGES,
  EMPTY_TOOL_HISTORY,
  usePhilanthropyStore,
} from "@/src/features/non-profits/store/philanthropy";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeTurn(overrides: Partial<ChatTurn> = {}): ChatTurn {
  return {
    id: "turn-1",
    userQuery: "Who are the largest education funders?",
    narrative: "",
    entities: EMPTY_ENTITIES,
    citations: EMPTY_CITATIONS,
    traceId: null,
    pagination: null,
    status: "streaming",
    error: null,
    progress: null,
    attachments: EMPTY_ATTACHMENTS,
    ...overrides,
  };
}

function resetStore() {
  act(() => {
    usePhilanthropyStore.getState().reset();
  });
}

// ── Test suite ───────────────────────────────────────────────────────────────

describe("usePhilanthropyStore", () => {
  beforeEach(() => {
    resetStore();
  });

  // ── Selector-safety: EMPTY_* constants ─────────────────────────────────────

  describe("EMPTY_* constants (selector-safety)", () => {
    it("EMPTY_MESSAGES is a stable reference", () => {
      expect(EMPTY_MESSAGES).toBe(EMPTY_MESSAGES);
      expect(Array.isArray(EMPTY_MESSAGES)).toBe(true);
      expect(EMPTY_MESSAGES).toHaveLength(0);
    });

    it("EMPTY_TOOL_HISTORY is a stable reference", () => {
      expect(EMPTY_TOOL_HISTORY).toBe(EMPTY_TOOL_HISTORY);
      expect(EMPTY_TOOL_HISTORY).toHaveLength(0);
    });

    it("EMPTY_ENTITIES is a stable reference", () => {
      expect(EMPTY_ENTITIES).toBe(EMPTY_ENTITIES);
      expect(EMPTY_ENTITIES).toHaveLength(0);
    });

    it("EMPTY_CITATIONS is a stable reference", () => {
      expect(EMPTY_CITATIONS).toBe(EMPTY_CITATIONS);
      expect(EMPTY_CITATIONS).toHaveLength(0);
    });

    it("EMPTY_ATTACHMENTS is a stable reference", () => {
      expect(EMPTY_ATTACHMENTS).toBe(EMPTY_ATTACHMENTS);
      expect(EMPTY_ATTACHMENTS).toHaveLength(0);
    });

    it("initial store messages is the EMPTY_MESSAGES constant", () => {
      expect(usePhilanthropyStore.getState().messages).toBe(EMPTY_MESSAGES);
    });
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  describe("initial state", () => {
    it("has empty messages", () => {
      expect(usePhilanthropyStore.getState().messages).toHaveLength(0);
    });

    it("has empty query", () => {
      expect(usePhilanthropyStore.getState().query).toBe("");
    });

    it("has empty narrative", () => {
      expect(usePhilanthropyStore.getState().narrative).toBe("");
    });

    it("has null traceId", () => {
      expect(usePhilanthropyStore.getState().traceId).toBeNull();
    });

    it("has null result", () => {
      expect(usePhilanthropyStore.getState().result).toBeNull();
    });

    it("is not searching", () => {
      expect(usePhilanthropyStore.getState().isSearching).toBe(false);
    });

    it("has null error", () => {
      expect(usePhilanthropyStore.getState().error).toBeNull();
    });
  });

  // ── appendTurn ─────────────────────────────────────────────────────────────

  describe("appendTurn", () => {
    it("appends a turn to an empty messages list", () => {
      const turn = makeTurn({ id: "turn-1" });

      act(() => {
        usePhilanthropyStore.getState().appendTurn(turn);
      });

      const messages = usePhilanthropyStore.getState().messages;
      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe("turn-1");
    });

    it("appends multiple turns in order", () => {
      act(() => {
        usePhilanthropyStore.getState().appendTurn(makeTurn({ id: "turn-a" }));
        usePhilanthropyStore.getState().appendTurn(makeTurn({ id: "turn-b" }));
        usePhilanthropyStore.getState().appendTurn(makeTurn({ id: "turn-c" }));
      });

      const messages = usePhilanthropyStore.getState().messages;
      expect(messages).toHaveLength(3);
      expect(messages.map((m) => m.id)).toEqual(["turn-a", "turn-b", "turn-c"]);
    });

    it("preserves all turn fields", () => {
      const turn = makeTurn({
        id: "turn-full",
        userQuery: "Find climate funders",
        narrative: "Here are the results…",
        status: "done",
        traceId: "trace-xyz",
      });

      act(() => {
        usePhilanthropyStore.getState().appendTurn(turn);
      });

      const stored = usePhilanthropyStore.getState().messages[0];
      expect(stored.userQuery).toBe("Find climate funders");
      expect(stored.narrative).toBe("Here are the results…");
      expect(stored.status).toBe("done");
      expect(stored.traceId).toBe("trace-xyz");
    });
  });

  // ── updateLastTurn ─────────────────────────────────────────────────────────

  describe("updateLastTurn", () => {
    it("patches the last turn with provided fields", () => {
      act(() => {
        usePhilanthropyStore.getState().appendTurn(makeTurn({ id: "turn-1", status: "streaming" }));
      });

      act(() => {
        usePhilanthropyStore.getState().updateLastTurn({ status: "done", narrative: "Completed." });
      });

      const last = usePhilanthropyStore.getState().messages[0];
      expect(last.status).toBe("done");
      expect(last.narrative).toBe("Completed.");
    });

    it("preserves unpatched fields on the last turn", () => {
      act(() => {
        usePhilanthropyStore
          .getState()
          .appendTurn(makeTurn({ id: "turn-1", userQuery: "original query", status: "streaming" }));
      });

      act(() => {
        usePhilanthropyStore.getState().updateLastTurn({ status: "done" });
      });

      const last = usePhilanthropyStore.getState().messages[0];
      expect(last.userQuery).toBe("original query");
      expect(last.id).toBe("turn-1");
    });

    it("only patches the last turn, not earlier ones", () => {
      act(() => {
        usePhilanthropyStore.getState().appendTurn(makeTurn({ id: "turn-1", status: "done" }));
        usePhilanthropyStore.getState().appendTurn(makeTurn({ id: "turn-2", status: "streaming" }));
      });

      act(() => {
        usePhilanthropyStore.getState().updateLastTurn({ status: "done" });
      });

      const messages = usePhilanthropyStore.getState().messages;
      expect(messages[0].id).toBe("turn-1");
      expect(messages[0].status).toBe("done");
      expect(messages[1].id).toBe("turn-2");
      expect(messages[1].status).toBe("done");
    });

    it("is a no-op when messages is empty", () => {
      act(() => {
        // Should not throw
        usePhilanthropyStore.getState().updateLastTurn({ status: "done" });
      });

      expect(usePhilanthropyStore.getState().messages).toHaveLength(0);
    });

    it("patches error field on the last turn", () => {
      act(() => {
        usePhilanthropyStore.getState().appendTurn(makeTurn({ id: "turn-1", status: "streaming" }));
      });

      act(() => {
        usePhilanthropyStore
          .getState()
          .updateLastTurn({ status: "error", error: "Network timeout" });
      });

      const last = usePhilanthropyStore.getState().messages[0];
      expect(last.status).toBe("error");
      expect(last.error).toBe("Network timeout");
    });
  });

  // ── Legacy actions ─────────────────────────────────────────────────────────

  describe("setQuery", () => {
    it("sets the query string", () => {
      act(() => {
        usePhilanthropyStore.getState().setQuery("education funders");
      });
      expect(usePhilanthropyStore.getState().query).toBe("education funders");
    });

    it("can be cleared with an empty string", () => {
      act(() => {
        usePhilanthropyStore.getState().setQuery("something");
        usePhilanthropyStore.getState().setQuery("");
      });
      expect(usePhilanthropyStore.getState().query).toBe("");
    });
  });

  describe("setNarrative", () => {
    it("sets the narrative", () => {
      act(() => {
        usePhilanthropyStore.getState().setNarrative("The top funders are…");
      });
      expect(usePhilanthropyStore.getState().narrative).toBe("The top funders are…");
    });
  });

  describe("setTraceId", () => {
    it("sets a trace id", () => {
      act(() => {
        usePhilanthropyStore.getState().setTraceId("trace-abc");
      });
      expect(usePhilanthropyStore.getState().traceId).toBe("trace-abc");
    });

    it("clears the trace id with null", () => {
      act(() => {
        usePhilanthropyStore.getState().setTraceId("trace-abc");
        usePhilanthropyStore.getState().setTraceId(null);
      });
      expect(usePhilanthropyStore.getState().traceId).toBeNull();
    });
  });

  describe("setSearching", () => {
    it("sets isSearching to true", () => {
      act(() => {
        usePhilanthropyStore.getState().setSearching(true);
      });
      expect(usePhilanthropyStore.getState().isSearching).toBe(true);
    });

    it("sets isSearching to false", () => {
      act(() => {
        usePhilanthropyStore.getState().setSearching(true);
        usePhilanthropyStore.getState().setSearching(false);
      });
      expect(usePhilanthropyStore.getState().isSearching).toBe(false);
    });
  });

  describe("setError", () => {
    it("sets an error message", () => {
      act(() => {
        usePhilanthropyStore.getState().setError("Something went wrong");
      });
      expect(usePhilanthropyStore.getState().error).toBe("Something went wrong");
    });

    it("clears the error with null", () => {
      act(() => {
        usePhilanthropyStore.getState().setError("Some error");
        usePhilanthropyStore.getState().setError(null);
      });
      expect(usePhilanthropyStore.getState().error).toBeNull();
    });
  });

  describe("setResult", () => {
    it("sets a search result", () => {
      const result = {
        entities: EMPTY_ENTITIES,
        citations: EMPTY_CITATIONS,
        intent: { type: "funder_discovery" as const },
        pagination: { page: 1, totalPages: 3, totalResults: 28, hasMore: true },
      };

      act(() => {
        usePhilanthropyStore.getState().setResult(result);
      });

      expect(usePhilanthropyStore.getState().result).toEqual(result);
    });

    it("clears the result with null", () => {
      act(() => {
        usePhilanthropyStore.getState().setResult({
          entities: EMPTY_ENTITIES,
          citations: EMPTY_CITATIONS,
          intent: { type: "funder_discovery" as const },
          pagination: { page: 1, totalPages: 1, totalResults: 5, hasMore: false },
        });
        usePhilanthropyStore.getState().setResult(null);
      });
      expect(usePhilanthropyStore.getState().result).toBeNull();
    });
  });

  // ── reset ──────────────────────────────────────────────────────────────────

  describe("reset", () => {
    it("clears messages back to empty", () => {
      act(() => {
        usePhilanthropyStore.getState().appendTurn(makeTurn({ id: "turn-1" }));
        usePhilanthropyStore.getState().reset();
      });
      expect(usePhilanthropyStore.getState().messages).toHaveLength(0);
    });

    it("restores initial state for all legacy fields", () => {
      act(() => {
        usePhilanthropyStore.getState().setQuery("some query");
        usePhilanthropyStore.getState().setNarrative("some narrative");
        usePhilanthropyStore.getState().setTraceId("trace-x");
        usePhilanthropyStore.getState().setSearching(true);
        usePhilanthropyStore.getState().setError("an error");
        usePhilanthropyStore.getState().reset();
      });

      const s = usePhilanthropyStore.getState();
      expect(s.query).toBe("");
      expect(s.narrative).toBe("");
      expect(s.traceId).toBeNull();
      expect(s.isSearching).toBe(false);
      expect(s.error).toBeNull();
      expect(s.result).toBeNull();
    });

    it("after reset, messages returns EMPTY_MESSAGES constant", () => {
      act(() => {
        usePhilanthropyStore.getState().appendTurn(makeTurn());
        usePhilanthropyStore.getState().reset();
      });
      // After reset the messages array must be the module-level constant,
      // not a new [] literal — this is the Zustand v5 selector-safety invariant.
      expect(usePhilanthropyStore.getState().messages).toBe(EMPTY_MESSAGES);
    });
  });
});
