import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

jest.mock("@/utilities/queries/getCommunityData", () => ({
  getCommunityCategories: jest.fn(),
}));

jest.mock("@/utilities/queries/getCommunityDataV2", () => ({
  getCommunityDetailsV2: jest.fn(),
  getCommunityStatsV2: jest.fn(),
  getCommunityProjectsV2: jest.fn(),
}));

jest.mock("@/utilities/pagesOnRoot", () => ({
  pagesOnRoot: [],
}));

jest.mock("@/components/CommunityGrants", () => ({
  CommunityGrants: () => (
    <div data-testid="community-grants">Community Grants</div>
  ),
}));

describe("Community Page", () => {
  const mockCommunityDetails = {
    uid: "123",
    name: "Test Community",
    slug: "test-community",
  };

  const mockCommunityStats = {
    totalProjects: 10,
    totalGrants: 5,
  };

  const mockCategories = ["DeFi", "NFT"];
  const mockProjects = {
    data: [],
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const { getCommunityDetailsV2, getCommunityStatsV2, getCommunityProjectsV2 } = require("@/utilities/queries/getCommunityDataV2");
    const { getCommunityCategories } = require("@/utilities/queries/getCommunityData");

    getCommunityDetailsV2.mockResolvedValue(mockCommunityDetails);
    getCommunityStatsV2.mockResolvedValue(mockCommunityStats);
    getCommunityCategories.mockResolvedValue(mockCategories);
    getCommunityProjectsV2.mockResolvedValue(mockProjects);
  });

  it("renders the community page with correct components", async () => {
    const { default: PageComponent } = await import(
      "@/app/community/[communityId]/page"
    );
    const result = await PageComponent({
      params: Promise.resolve({ communityId: "test-community" }),
    });

    render(result);
    expect(screen.getByTestId("community-grants")).toBeInTheDocument();
  });

  it("returns undefined for pages on root", async () => {
    const { pagesOnRoot } = require("@/utilities/pagesOnRoot");
    pagesOnRoot.push("dashboard");

    const { default: PageComponent } = await import(
      "@/app/community/[communityId]/page"
    );
    const result = await PageComponent({
      params: Promise.resolve({ communityId: "dashboard" }),
    });

    expect(result).toBeUndefined();
  });
});
