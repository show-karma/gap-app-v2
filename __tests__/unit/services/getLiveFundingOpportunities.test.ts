/**
 * @file Tests for getLiveFundingOpportunities service
 * @description Tests the server-side service that fetches active funding programs.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utilities/indexer", () => ({
  INDEXER: {
    V2: {
      REGISTRY: {
        GET_ALL: "/v2/registry",
      },
    },
  },
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { getLiveFundingOpportunities } from "@/src/services/funding/getLiveFundingOpportunities";

describe("getLiveFundingOpportunities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("fetches active programs from the correct URL", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ programs: [{ id: "p1" }] }),
    });

    const result = await getLiveFundingOpportunities();

    expect(result).toEqual([{ id: "p1" }]);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v2/registry"),
      expect.objectContaining({
        next: { revalidate: 300 },
      })
    );
  });

  it("includes status=active and onlyOnKarma=true params", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ programs: [] }),
    });

    await getLiveFundingOpportunities();

    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain("status=active");
    expect(url).toContain("onlyOnKarma=true");
    expect(url).toContain("limit=100");
  });

  it("returns empty array on non-OK HTTP response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const result = await getLiveFundingOpportunities();
    expect(result).toEqual([]);
  });

  it("returns empty array on network error", async () => {
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await getLiveFundingOpportunities();
    expect(result).toEqual([]);
  });

  it("returns empty array when programs field is missing", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    const result = await getLiveFundingOpportunities();
    expect(result).toEqual([]);
  });

  it("returns full programs array when present", async () => {
    const programs = [
      { id: "p1", name: "Program 1" },
      { id: "p2", name: "Program 2" },
    ];
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ programs }),
    });

    const result = await getLiveFundingOpportunities();
    expect(result).toHaveLength(2);
  });
});
