/**
 * Unit tests for non-profits/services/philanthropy.service.ts
 *
 * Mocks:
 * - global `fetch` via vi.stubGlobal
 * - `TokenManager.getToken` via vi.spyOn
 * - `envVars.NEXT_PUBLIC_GAP_INDEXER_URL` via module mock
 *
 * Tests endpoint construction, schema validation, and error mapping.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { TokenManager } from "@/utilities/auth/token-manager";
import { philanthropyService } from "../services/philanthropy.service";
import type { Financials, Foundation, Grant, Nonprofit, Officer } from "../types/philanthropy";

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "https://indexer.test",
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeOkResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
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

const FOUNDATION_FIXTURE: Foundation = {
  id: "f-1",
  ein: "12-3456789",
  name: "Acme Foundation",
  description: "We fund good things.",
  totalAssets: 5_000_000,
  location: "New York, NY",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-06-01T00:00:00Z",
};

const NONPROFIT_FIXTURE: Nonprofit = {
  id: "n-1",
  ein: "98-7654321",
  name: "Better Futures",
  description: null,
  location: "Chicago, IL",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-06-01T00:00:00Z",
};

const GRANT_FIXTURE: Grant = {
  id: "g-1",
  filingId: "fil-1",
  foundationId: "f-1",
  nonprofitId: "n-1",
  recipientName: "Better Futures",
  amount: 100_000,
  date: "2023-12-01",
  purposeText: "Youth education",
  filingYear: 2023,
  sourceRowHash: "abc123def456",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-06-01T00:00:00Z",
};

const OFFICER_FIXTURE: Officer = {
  id: "o-1",
  foundationId: "f-1",
  name: "Jane Smith",
  title: "Executive Director",
  compensation: 200_000,
  benefits: 20_000,
  expenseAccount: 5_000,
  filingYear: 2023,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-06-01T00:00:00Z",
};

const FINANCIALS_FIXTURE: Financials = {
  id: "fin-1",
  foundationId: "f-1",
  filingYear: 2023,
  totalRevenue: 1_000_000,
  totalExpenses: 800_000,
  totalAssets: 5_000_000,
  netAssets: 4_200_000,
  minimumInvestmentReturn: 250_000,
  distributableAmount: 300_000,
  qualifyingDistributions: 400_000,
  undistributedIncome: 50_000,
  excessDistributions: 100_000,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-06-01T00:00:00Z",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("philanthropyService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(TokenManager, "getToken").mockResolvedValue(null);
  });

  // ── getFoundation ───────────────────────────────────────────────────────────

  describe("getFoundation", () => {
    it("calls the correct endpoint and parses the response", async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeOkResponse(FOUNDATION_FIXTURE));
      vi.stubGlobal("fetch", fetchMock);

      const result = await philanthropyService.getFoundation("f-1");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(FOUNDATION_FIXTURE);
      }
      expect(fetchMock).toHaveBeenCalledWith(
        "https://indexer.test/v2/philanthropy/foundations/f-1",
        expect.objectContaining({ method: "GET" })
      );
    });

    it("returns ApiError on non-ok response", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeErrorResponse(404, "Not found")));

      const result = await philanthropyService.getFoundation("nonexistent");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("ApiError");
        expect((result.error as { type: string; status: number }).status).toBe(404);
      }
    });

    it("returns ValidationError if server returns malformed data", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeOkResponse({ wrong: "shape" })));

      const result = await philanthropyService.getFoundation("f-bad");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("ValidationError");
      }
    });
  });

  // ── getFoundationGrants ─────────────────────────────────────────────────────

  describe("getFoundationGrants", () => {
    it("calls the grants endpoint and returns an array", async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeOkResponse([GRANT_FIXTURE]));
      vi.stubGlobal("fetch", fetchMock);

      const result = await philanthropyService.getFoundationGrants("f-1");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]).toEqual(GRANT_FIXTURE);
      }
      expect(fetchMock.mock.calls[0][0]).toContain("/v2/philanthropy/foundations/f-1/grants");
    });

    it("appends sort query params when provided", async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeOkResponse([GRANT_FIXTURE]));
      vi.stubGlobal("fetch", fetchMock);

      await philanthropyService.getFoundationGrants("f-1", { sortBy: "amount", sortOrder: "desc" });

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("sortBy=amount");
      expect(calledUrl).toContain("sortOrder=desc");
    });
  });

  // ── getFoundationOfficers ───────────────────────────────────────────────────

  describe("getFoundationOfficers", () => {
    it("calls the officers endpoint and returns an array", async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeOkResponse([OFFICER_FIXTURE]));
      vi.stubGlobal("fetch", fetchMock);

      const result = await philanthropyService.getFoundationOfficers("f-1");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value[0].name).toBe("Jane Smith");
      }
      expect(fetchMock.mock.calls[0][0]).toContain("/officers");
    });
  });

  // ── getFoundationFinancials ─────────────────────────────────────────────────

  describe("getFoundationFinancials", () => {
    it("calls the financials endpoint and parses the array", async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeOkResponse([FINANCIALS_FIXTURE]));
      vi.stubGlobal("fetch", fetchMock);

      const result = await philanthropyService.getFoundationFinancials("f-1");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value[0].filingYear).toBe(2023);
        expect(result.value[0].totalAssets).toBe(5_000_000);
      }
    });
  });

  // ── getNonprofit ────────────────────────────────────────────────────────────

  describe("getNonprofit", () => {
    it("calls the correct nonprofit endpoint", async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeOkResponse(NONPROFIT_FIXTURE));
      vi.stubGlobal("fetch", fetchMock);

      const result = await philanthropyService.getNonprofit("n-1");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.name).toBe("Better Futures");
      }
      expect(fetchMock.mock.calls[0][0]).toContain("/v2/philanthropy/nonprofits/n-1");
    });
  });

  // ── getNonprofitGrants ──────────────────────────────────────────────────────

  describe("getNonprofitGrants", () => {
    it("returns an array of grants for the nonprofit", async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeOkResponse([GRANT_FIXTURE]));
      vi.stubGlobal("fetch", fetchMock);

      const result = await philanthropyService.getNonprofitGrants("n-1");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
      }
      expect(fetchMock.mock.calls[0][0]).toContain("/v2/philanthropy/nonprofits/n-1/grants");
    });
  });

  // ── getGrant ────────────────────────────────────────────────────────────────

  describe("getGrant", () => {
    it("calls the grant endpoint and returns the parsed grant", async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeOkResponse(GRANT_FIXTURE));
      vi.stubGlobal("fetch", fetchMock);

      const result = await philanthropyService.getGrant("g-1");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe("g-1");
        expect(result.value.amount).toBe(100_000);
      }
      expect(fetchMock.mock.calls[0][0]).toContain("/v2/philanthropy/grants/g-1");
    });

    it("returns ApiError for 500 responses", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(makeErrorResponse(500, "Internal server error"))
      );

      const result = await philanthropyService.getGrant("g-bad");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("ApiError");
      }
    });
  });
});
