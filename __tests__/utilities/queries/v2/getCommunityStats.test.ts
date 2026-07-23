import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn(),
  },
}));

import type { CommunityStats } from "@/types/v2/community";
import { api } from "@/utilities/api/client";
import { getCommunityStats } from "@/utilities/queries/v2/getCommunityData";

const mockApiGet = api.get as unknown as ReturnType<typeof vi.fn>;

const fullStats: CommunityStats = {
  totalProjects: 7,
  totalGrants: 3,
  totalMilestones: 9,
  projectUpdates: 4,
  projectUpdatesBreakdown: {
    projectMilestones: 5,
    projectCompletedMilestones: 2,
    projectUpdates: 1,
    grantMilestones: 4,
    grantCompletedMilestones: 3,
    grantUpdates: 2,
  },
  totalTransactions: 1,
  averageCompletion: 50,
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getCommunityStats", () => {
  it("returns the stats payload on success", async () => {
    mockApiGet.mockResolvedValue(fullStats);
    // Unique slug per test — getCommunityStats is wrapped in React cache().
    await expect(getCommunityStats("success-community")).resolves.toEqual(fullStats);
  });

  it("returns a genuine all-zero payload honestly (does not treat zero as an error)", async () => {
    const zeroStats: CommunityStats = {
      ...fullStats,
      totalProjects: 0,
      totalGrants: 0,
      totalMilestones: 0,
      projectUpdates: 0,
    };
    mockApiGet.mockResolvedValue(zeroStats);
    await expect(getCommunityStats("zero-community")).resolves.toEqual(zeroStats);
  });

  it("throws when the request fails instead of fabricating an all-zero object", async () => {
    mockApiGet.mockRejectedValue(new Error("Internal Server Error"));
    await expect(getCommunityStats("error-community")).rejects.toThrow(
      /Failed to fetch community stats/
    );
  });

  it("throws when the response payload is empty", async () => {
    mockApiGet.mockResolvedValue(null);
    await expect(getCommunityStats("empty-community")).rejects.toThrow(/empty response/);
  });
});
