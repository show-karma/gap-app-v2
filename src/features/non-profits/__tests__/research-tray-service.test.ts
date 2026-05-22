/**
 * Unit tests for non-profits/services/research-tray.service.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { TokenManager } from "@/utilities/auth/token-manager";
import { researchTrayService } from "../services/research-tray.service";

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

const TRAY_ENTRY = {
  id: "te-1",
  userId: "u-1",
  entityType: "foundation",
  entityId: "f-1",
  name: "Acme Foundation",
  metadata: null,
  createdAt: "2024-01-01T00:00:00Z",
};

describe("researchTrayService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(TokenManager, "getToken").mockResolvedValue(null);
  });

  describe("list", () => {
    it("calls the LIST endpoint and returns an array", async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeOkResponse([TRAY_ENTRY]));
      vi.stubGlobal("fetch", fetchMock);

      const result = await researchTrayService.list();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].entityId).toBe("f-1");
      }
      expect(fetchMock).toHaveBeenCalledWith(
        "https://indexer.test/v2/research-tray",
        expect.objectContaining({ method: "GET" })
      );
    });

    it("returns ApiError on non-ok response", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeErrorResponse(401, "Unauthorized")));

      const result = await researchTrayService.list();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("ApiError");
      }
    });
  });

  describe("create", () => {
    it("posts data and returns the created entry", async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeOkResponse(TRAY_ENTRY));
      vi.stubGlobal("fetch", fetchMock);

      const result = await researchTrayService.create({
        entityType: "foundation",
        entityId: "f-1",
        name: "Acme Foundation",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe("te-1");
      }
      expect(fetchMock).toHaveBeenCalledWith(
        "https://indexer.test/v2/research-tray",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  describe("deleteOne", () => {
    it("calls DELETE endpoint with the entry id", async () => {
      const fetchMock = vi.fn().mockResolvedValue(make204Response());
      vi.stubGlobal("fetch", fetchMock);

      const result = await researchTrayService.deleteOne("te-1");

      expect(result.isOk()).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        "https://indexer.test/v2/research-tray/te-1",
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  describe("clearAll", () => {
    it("calls DELETE on the base endpoint", async () => {
      const fetchMock = vi.fn().mockResolvedValue(make204Response());
      vi.stubGlobal("fetch", fetchMock);

      const result = await researchTrayService.clearAll();

      expect(result.isOk()).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        "https://indexer.test/v2/research-tray",
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });
});
