/**
 * @file Tests for the ImpactOutcomes section: loading skeleton, empty state, populated rows.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type React from "react";

vi.mock("next/navigation", () => ({
  useParams: vi.fn(() => ({ communityId: "filecoin" })),
}));
vi.mock("@/hooks/useCommunityAccent", () => ({
  useCommunityAccent: vi.fn(() => "#0090FF"),
}));
vi.mock("@/hooks/v2/useCommunityDetails", () => ({
  useCommunityDetails: vi.fn(() => ({
    community: { details: { slug: "filecoin" } },
  })),
}));
vi.mock("@/utilities/queries/v2/getCommunityData", () => ({
  getCommunityStats: vi.fn(),
}));

import { ImpactOutcomes } from "@/components/Pages/Communities/Impact/ImpactOutcomes";
import { getCommunityStats } from "@/utilities/queries/v2/getCommunityData";

const mockGetCommunityStats = getCommunityStats as vi.MockedFunction<typeof getCommunityStats>;

const renderWith = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const utils = render(<ImpactOutcomes />, { wrapper });
  return { queryClient, ...utils };
};

describe("ImpactOutcomes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a loading skeleton while stats are loading", () => {
    mockGetCommunityStats.mockReturnValue(new Promise(() => {}));
    const { container } = renderWith();
    expect(container.querySelector("section")).toBeInTheDocument();
    // Skeleton renders 4 placeholder rows
    expect(container.querySelectorAll(".grid > div")).toHaveLength(4);
  });

  it("returns null when no items are derivable from stats", async () => {
    mockGetCommunityStats.mockResolvedValue({
      totalProjects: 0,
      totalGrants: 0,
      totalMilestones: 0,
      projectUpdatesBreakdown: {
        projectUpdates: 0,
        grantUpdates: 0,
        projectCompletedMilestones: 0,
        grantCompletedMilestones: 0,
      },
    } as unknown as Awaited<ReturnType<typeof getCommunityStats>>);

    const { container } = renderWith();
    await waitFor(() => {
      expect(container.querySelector("h3")).not.toBeInTheDocument();
    });
  });

  it("renders populated outcome rows from stats", async () => {
    mockGetCommunityStats.mockResolvedValue({
      totalProjects: 12,
      totalGrants: 4,
      totalMilestones: 10,
      projectUpdatesBreakdown: {
        projectUpdates: 25,
        grantUpdates: 8,
        projectCompletedMilestones: 3,
        grantCompletedMilestones: 2,
      },
    } as unknown as Awaited<ReturnType<typeof getCommunityStats>>);

    renderWith();
    await screen.findByText("Outcomes delivered");
    expect(screen.getByText(/grants tracked across the community/)).toBeInTheDocument();
    expect(screen.getByText(/funded teams shipping work/)).toBeInTheDocument();
    expect(screen.getByText(/milestones shipped/)).toBeInTheDocument();
    expect(screen.getByText(/milestone completion rate/)).toBeInTheDocument();
    expect(screen.getByText(/project updates published by teams/)).toBeInTheDocument();
    expect(screen.getByText(/grant updates from funded programs/)).toBeInTheDocument();
    // 5/10 completed milestones = 50%
    expect(screen.getByText("50%")).toBeInTheDocument();
  });
});
