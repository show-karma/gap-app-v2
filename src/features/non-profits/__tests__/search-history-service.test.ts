/**
 * Unit tests for the new methods added to search-history.service.ts (Phase 5).
 * Tests: list, deleteOne, clearAll.
 * (create and getById were tested implicitly before; now explicitly covered too.)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { TokenManager } from "@/utilities/auth/token-manager";
import { searchHistoryService } from "../services/search-history.service";

vi.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "https://indexer.test",
  },
}));

function makeOkResponse(body: unknown, status = 200): Response {
  return {
    ok: true,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function makeErrorResponse(status: number, message: string): Response {
  return {
    ok: false,
    status,
    text: () => Promise.resolve(JSON.stringify({ message })),
    json: () => Promise.resolve({ message }),
  } as unknown as Response;
}

function make204Response(): Response {
  return {
    ok: true,
    status: 204,
    text: () => Promise.resolve(""),
    json: () => Promise.resolve(undefined),
  } as unknown as Response;
}

const HISTORY_ENTRY = {
  id: "sh-1",
  userId: "u-1",
  query: "Foundations in Ohio",
  createdAt: "2024-01-01T00:00:00Z",
};

const SAVED_TURN = {
  id: "turn-1",
  searchHistoryId: "sh-1",
  turnIndex: 0,
  userQuery: "Foundations in Ohio",
  narrative: "Top funders…",
  entities: [],
  citations: [],
  traceId: "trace-1",
  createdAt: "2024-01-01T00:00:00Z",
};

const HISTORY_DETAIL = { ...HISTORY_ENTRY, turns: [SAVED_TURN] };

describe("searchHistoryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(TokenManager, "getToken").mockResolvedValue(null);
  });

  describe("list", () => {
    it("calls the LIST endpoint with default limit and returns array", async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeOkResponse([HISTORY_ENTRY]));
      vi.stubGlobal("fetch", fetchMock);

      const result = await searchHistoryService.list();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].query).toBe("Foundations in Ohio");
      }
      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/v2/search-history");
      expect(calledUrl).toContain("limit=20");
    });

    it("appends custom limit to the URL", async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeOkResponse([]));
      vi.stubGlobal("fetch", fetchMock);

      await searchHistoryService.list(5);

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("limit=5");
    });

    it("returns ApiError on non-ok response", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeErrorResponse(401, "Unauthorized")));

      const result = await searchHistoryService.list();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("ApiError");
      }
    });
  });

  describe("create", () => {
    it("posts the query and returns the created entry", async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeOkResponse(HISTORY_ENTRY));
      vi.stubGlobal("fetch", fetchMock);

      const result = await searchHistoryService.create("Foundations in Ohio");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe("sh-1");
      }
      const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
      expect(body).toEqual({ query: "Foundations in Ohio" });
    });

    it("includes the conversation id in the body when supplied", async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeOkResponse(HISTORY_ENTRY));
      vi.stubGlobal("fetch", fetchMock);

      await searchHistoryService.create("Foundations in Ohio", "thread-1");

      const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
      expect(body).toEqual({ query: "Foundations in Ohio", id: "thread-1" });
    });
  });

  describe("anonymous (ownerless) responses", () => {
    // Regression: ownerless chats return `userId: null`. The response schema
    // must accept it — otherwise create/getById fail to parse, the create is
    // treated as an error, and the first turn is never persisted while logged
    // out (the append is chained off a successful create).
    it("create accepts a null userId", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(makeOkResponse({ ...HISTORY_ENTRY, userId: null }, 201));
      vi.stubGlobal("fetch", fetchMock);

      const result = await searchHistoryService.create("anon query", "thread-anon");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.userId).toBeNull();
      }
    });

    it("getById accepts a null userId with turns", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(makeOkResponse({ ...HISTORY_DETAIL, userId: null }));
      vi.stubGlobal("fetch", fetchMock);

      const result = await searchHistoryService.getById("thread-anon");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.userId).toBeNull();
        expect(result.value.turns).toHaveLength(1);
      }
    });
  });

  describe("getById", () => {
    it("calls the GET endpoint for the given id and returns saved turns", async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeOkResponse(HISTORY_DETAIL));
      vi.stubGlobal("fetch", fetchMock);

      const result = await searchHistoryService.getById("sh-1");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe("sh-1");
        expect(result.value.turns).toHaveLength(1);
        expect(result.value.turns[0].userQuery).toBe("Foundations in Ohio");
      }
      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/v2/search-history/sh-1");
    });

    it("returns ApiError for 404", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeErrorResponse(404, "Not found")));

      const result = await searchHistoryService.getById("missing");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("ApiError");
        expect((result.error as { type: string; status: number }).status).toBe(404);
      }
    });
  });

  describe("getById resilient turn parsing", () => {
    // Regression: a single malformed turn must NOT reject the whole response.
    // Otherwise getById fails to parse, the revisit hydrate is skipped, and the
    // workbench falls through to re-running the agent instead of showing the
    // saved conversation (reported user-feedback bug).
    it("drops a malformed turn but keeps the valid ones", async () => {
      const malformed = { id: "turn-bad", searchHistoryId: "sh-1" }; // missing required fields
      const detail = { ...HISTORY_ENTRY, turns: [SAVED_TURN, malformed] };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeOkResponse(detail)));

      const result = await searchHistoryService.getById("sh-1");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.turns).toHaveLength(1);
        expect(result.value.turns[0].id).toBe("turn-1");
      }
    });

    it("returns an empty turns list (not an error) when every turn is invalid", async () => {
      const detail = { ...HISTORY_ENTRY, turns: [{ id: "x" }, { nope: true }] };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeOkResponse(detail)));

      const result = await searchHistoryService.getById("sh-1");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.turns).toEqual([]);
      }
    });

    it("tolerates a non-array turns field by collapsing to an empty list", async () => {
      const detail = { ...HISTORY_ENTRY, turns: null };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeOkResponse(detail)));

      const result = await searchHistoryService.getById("sh-1");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.turns).toEqual([]);
      }
    });
  });

  describe("appendTurn", () => {
    it("posts the turn snapshot to the turns endpoint", async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeOkResponse(SAVED_TURN));
      vi.stubGlobal("fetch", fetchMock);

      const result = await searchHistoryService.appendTurn("sh-1", {
        id: "turn-1",
        userQuery: "Foundations in Ohio",
        narrative: "Top funders…",
        entities: [],
        citations: [],
        traceId: "trace-1",
      });

      expect(result.isOk()).toBe(true);
      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/v2/search-history/sh-1/turns");
      expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST" });
    });

    it("returns ApiError when unauthenticated", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeErrorResponse(401, "Unauthorized")));

      const result = await searchHistoryService.appendTurn("sh-1", {
        id: "turn-1",
        userQuery: "q",
        narrative: "",
        entities: [],
        citations: [],
        traceId: null,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("ApiError");
      }
    });
  });

  describe("deleteOne", () => {
    it("calls DELETE on the specific entry endpoint", async () => {
      const fetchMock = vi.fn().mockResolvedValue(make204Response());
      vi.stubGlobal("fetch", fetchMock);

      const result = await searchHistoryService.deleteOne("sh-1");

      expect(result.isOk()).toBe(true);
      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/v2/search-history/sh-1");
      expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "DELETE" });
    });
  });

  describe("clearAll", () => {
    it("calls DELETE on the base endpoint", async () => {
      const fetchMock = vi.fn().mockResolvedValue(make204Response());
      vi.stubGlobal("fetch", fetchMock);

      const result = await searchHistoryService.clearAll();

      expect(result.isOk()).toBe(true);
      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/v2/search-history");
      expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "DELETE" });
    });
  });
});
