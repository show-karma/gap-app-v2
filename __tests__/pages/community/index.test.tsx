import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { notFound } from "next/navigation";

jest.mock("next/navigation", () => ({
  notFound: jest.fn(),
}));

jest.mock("@/utilities/gapIndexerApi", () => ({
  gapIndexerApi: {
    communityBySlug: jest.fn(),
  },
}));

jest.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("@/components/CommunityGrants", () => ({
  CommunityGrants: () => (
    <div data-testid="community-grants">Community Grants</div>
  ),
}));

jest.mock("@/components/CommunityFeed", () => ({
  CommunityFeed: () => <div data-testid="community-feed">Community Feed</div>,
}));

describe("Community Page", () => {
  const mockCommunity = {
    uid: "123",
    details: {
      data: {
        name: "Test Community",
        slug: "test-community",
        imageURL: "https://example.com/image.jpg",
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the community page with correct components", async () => {
    const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
    gapIndexerApi.communityBySlug.mockResolvedValue({ data: mockCommunity });

    const fetchData = require("@/utilities/fetchData").default;
    fetchData.mockResolvedValue([[]]);

    const { default: PageComponent } = await import("@/app/[communityId]/page");
    render(await PageComponent({ params: { communityId: "test-community" } }));

    expect(screen.getByText("Test Community")).toBeInTheDocument();
    expect(screen.getByTestId("community-grants")).toBeInTheDocument();
    expect(screen.getByTestId("community-feed")).toBeInTheDocument();
  });

  it("calls notFound when community does not exist", async () => {
    const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
    gapIndexerApi.communityBySlug.mockResolvedValue({ data: null });

    const { default: PageComponent } = await import("@/app/[communityId]/page");
    render(
      await PageComponent({
        params: { communityId: "non-existent-community" },
      })
    );

    expect(notFound).toHaveBeenCalled();
  });
});
