import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utilities/fetchData", () => ({
  default: vi.fn(),
}));

import type { CommunityStats } from "@/types/v2/community";
import fetchData from "@/utilities/fetchData";
import { getCommunityStats } from "@/utilities/queries/v2/getCommunityData";

const mockFetchData = fetchData as unknown as ReturnType<typeof vi.fn>;

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
    mockFetchData.mockResolvedValue([fullStats, null, null, 200]);
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
    mockFetchData.mockResolvedValue([zeroStats, null, null, 200]);
    await expect(getCommunityStats("zero-community")).resolves.toEqual(zeroStats);
  });

  it("throws when fetchData reports an error instead of fabricating an all-zero object", async () => {
    mockFetchData.mockResolvedValue([null, "Internal Server Error", null, 500]);
    await expect(getCommunityStats("error-community")).rejects.toThrow(
      /Failed to fetch community stats/
    );
  });

  it("throws when the response payload is empty", async () => {
    mockFetchData.mockResolvedValue([null, null, null, 200]);
    await expect(getCommunityStats("empty-community")).rejects.toThrow(/empty response/);
  });
});
