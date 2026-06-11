/**
 * Unit tests for lib/saved-conversation.ts — mapping between persisted
 * conversation turns and the in-memory ChatTurn shape.
 */
import { describe, expect, it } from "vitest";
import {
  chatTurnToTurnPayload,
  savedTurnsToChatTurns,
  savedTurnToChatTurn,
} from "../lib/saved-conversation";
import type { SavedSearchTurn } from "../services/search-history.service";
import type { ChatTurn } from "../store/philanthropy";
import type { RankedEntity } from "../types/philanthropy";

function makeEntity(id: string): RankedEntity {
  return {
    entityType: "foundation",
    id,
    name: `Foundation ${id}`,
    description: null,
    ein: null,
    location: null,
    totalAssets: null,
    amount: null,
    date: null,
    filingYear: null,
    foundationId: null,
    foundationName: null,
    nonprofitId: null,
    nonprofitName: null,
    scores: { semantic: 1, amount: 0, recency: 0, composite: 1 },
  };
}

function makeSavedTurn(overrides: Partial<SavedSearchTurn> = {}): SavedSearchTurn {
  return {
    id: "turn-1",
    searchHistoryId: "sh-1",
    turnIndex: 0,
    userQuery: "Foundations in Ohio",
    narrative: "Top funders…",
    entities: [makeEntity("f-1")],
    citations: [{ entityId: "f-1", entityType: "foundation", filingYear: 2023, fieldPath: "x" }],
    traceId: "trace-1",
    createdAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeChatTurn(overrides: Partial<ChatTurn> = {}): ChatTurn {
  return {
    id: "turn-1",
    userQuery: "Foundations in Ohio",
    narrative: "Top funders…",
    entities: [makeEntity("f-1")],
    citations: [],
    traceId: "trace-1",
    pagination: null,
    status: "done",
    error: null,
    progress: null,
    attachments: [],
    ...overrides,
  };
}

describe("savedTurnToChatTurn", () => {
  it("restores a completed turn with no streaming residue", () => {
    const turn = savedTurnToChatTurn(makeSavedTurn());

    expect(turn).toEqual({
      id: "turn-1",
      userQuery: "Foundations in Ohio",
      narrative: "Top funders…",
      entities: [makeEntity("f-1")],
      citations: [{ entityId: "f-1", entityType: "foundation", filingYear: 2023, fieldPath: "x" }],
      traceId: "trace-1",
      pagination: null,
      status: "done",
      error: null,
      progress: null,
      attachments: [],
    });
  });

  it("preserves turn order in savedTurnsToChatTurns", () => {
    const turns = savedTurnsToChatTurns([
      makeSavedTurn({ id: "t-1", turnIndex: 0 }),
      makeSavedTurn({ id: "t-2", turnIndex: 1 }),
    ]);

    expect(turns.map((t) => t.id)).toEqual(["t-1", "t-2"]);
  });
});

describe("chatTurnToTurnPayload", () => {
  it("snapshots id, query, narrative, entities, citations and traceId", () => {
    const payload = chatTurnToTurnPayload(makeChatTurn());

    expect(payload).toEqual({
      id: "turn-1",
      userQuery: "Foundations in Ohio",
      narrative: "Top funders…",
      entities: [makeEntity("f-1")],
      citations: [],
      traceId: "trace-1",
    });
  });

  it("clamps oversized fields to the server bounds", () => {
    const entities = Array.from({ length: 600 }, (_, i) => makeEntity(`f-${i}`));
    const payload = chatTurnToTurnPayload(
      makeChatTurn({
        userQuery: "q".repeat(5000),
        narrative: "n".repeat(50000),
        entities,
      })
    );

    expect(payload.userQuery).toHaveLength(4000);
    expect(payload.narrative).toHaveLength(40000);
    expect(payload.entities).toHaveLength(500);
  });
});
