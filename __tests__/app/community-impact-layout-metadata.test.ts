import { beforeEach, describe, expect, it, vi } from "vitest";
import { PROJECT_NAME } from "@/constants/brand";

const { getCommunityDetailsCachedMock } = vi.hoisted(() => ({
  getCommunityDetailsCachedMock: vi.fn(),
}));

vi.mock("@/utilities/queries/v2/getCommunityData.cached", () => ({
  getCommunityDetailsCached: getCommunityDetailsCachedMock,
}));

vi.mock("@/components/Pages/Communities/Impact/ImpactTabNavigator", () => ({
  ImpactTabNavigator: () => null,
}));

import { generateMetadata } from "@/app/t/[tenant]/(chrome)/community/[communityId]/(with-header)/impact/layout";

describe("community impact layout generateMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads the community through getCommunityDetailsCached and builds title and description", async () => {
    getCommunityDetailsCachedMock.mockResolvedValue({
      uid: "0xgitcoin",
      details: { name: "Gitcoin" },
    });

    const metadata = await generateMetadata({
      params: Promise.resolve({ communityId: "gitcoin" }),
    });

    expect(getCommunityDetailsCachedMock).toHaveBeenCalledTimes(1);
    expect(getCommunityDetailsCachedMock).toHaveBeenCalledWith("gitcoin");
    expect(metadata).toEqual({
      title: `Gitcoin Impact & Outcomes | ${PROJECT_NAME}`,
      description: `Measure the impact of grants funded by Gitcoin. Explore project outcomes, performance metrics, and community-driven results on ${PROJECT_NAME}.`,
    });
  });

  it("falls back to communityId when community details have no name", async () => {
    getCommunityDetailsCachedMock.mockResolvedValue(null);

    const metadata = await generateMetadata({
      params: Promise.resolve({ communityId: "optimism" }),
    });

    expect(getCommunityDetailsCachedMock).toHaveBeenCalledWith("optimism");
    expect(metadata.title).toBe(`optimism Impact & Outcomes | ${PROJECT_NAME}`);
    expect(metadata.description).toContain("grants funded by optimism");
  });
});
