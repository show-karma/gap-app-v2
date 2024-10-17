import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { notFound } from "next/navigation";

import Page from "@/app/[communityId]/grant-reviews/page";

jest.mock("next/navigation", () => ({
  notFound: jest.fn(),
}));

jest.mock("@/utilities/gapIndexerApi", () => ({
  gapIndexerApi: {
    communityBySlug: jest.fn(),
  },
}));

jest.mock("@/utilities/sdk", () => ({
  getMetadata: jest.fn(),
}));

jest.mock("@/components/Pages/Communities/CommunityLanding", () => {
  return function MockCommunityLanding() {
    return (
      <div data-testid="mock-community-landing">Mocked Community Landing</div>
    );
  };
});

describe("Grant Reviews Page", () => {
  const mockCommunity = {
    uid: "123",
    details: {
      data: {
        name: "Test Community",
        slug: "test-community",
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the CommunityLanding component when community exists", async () => {
    const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
    gapIndexerApi.communityBySlug.mockResolvedValue({ data: mockCommunity });

    render(await Page({ params: { communityId: "test-community" } }));

    expect(screen.getByTestId("mock-community-landing")).toBeInTheDocument();
  });

  it("calls notFound when community does not exist", async () => {
    const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
    gapIndexerApi.communityBySlug.mockResolvedValue({ data: null });

    await Page({ params: { communityId: "non-existent-community" } });

    expect(notFound).toHaveBeenCalled();
  });
});
