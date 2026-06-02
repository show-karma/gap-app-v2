import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ActivityFeed } from "@/components/Pages/Project/v2/MainContent/ActivityFeed";
import { useIsCommunityAdmin } from "@/hooks/communities/useIsCommunityAdmin";

vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "project-1" }),
}));

vi.mock("@/components/Shared/ActivityCard", () => ({
  ActivityCard: ({ isAuthorized }: { isAuthorized?: boolean }) => (
    <div data-testid="activity-card" data-is-authorized={String(Boolean(isAuthorized))} />
  ),
}));

vi.mock("@/hooks/useCommunityMilestoneAllocations", () => ({
  useMilestoneAllocationsByGrants: () => ({ allocationMap: new Map() }),
}));

vi.mock("@/hooks/communities/useIsCommunityAdmin", () => ({
  useIsCommunityAdmin: vi.fn(() => ({ isCommunityAdmin: false })),
}));

const mockUseIsCommunityAdmin = vi.mocked(useIsCommunityAdmin);

const grantMilestoneItem = {
  uid: "milestone-1",
  type: "milestone",
  title: "Milestone 1",
  createdAt: "2024-01-01T00:00:00.000Z",
  completed: false,
  source: {
    type: "grant",
    grantMilestone: {
      milestone: { uid: "milestone-1" },
      grant: {
        uid: "grant-1",
        chainID: 42161,
        community: { uid: "", chainID: 42161, details: { slug: "filecoin" } },
      },
    },
  },
} as any;

describe("ActivityFeed per-item community admin gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIsCommunityAdmin.mockReturnValue({ isCommunityAdmin: false } as any);
  });

  it("should_query_community_admin_with_the_grant_community_slug", () => {
    render(<ActivityFeed milestones={[grantMilestoneItem]} isAuthorized={false} />);

    expect(mockUseIsCommunityAdmin).toHaveBeenCalledWith("filecoin");
  });

  it("should_authorize_item_when_user_is_community_admin_even_if_not_project_authorized", () => {
    mockUseIsCommunityAdmin.mockReturnValue({ isCommunityAdmin: true } as any);

    render(<ActivityFeed milestones={[grantMilestoneItem]} isAuthorized={false} />);

    expect(screen.getByTestId("activity-card")).toHaveAttribute("data-is-authorized", "true");
  });

  it("should_not_authorize_item_when_neither_project_nor_community_admin", () => {
    render(<ActivityFeed milestones={[grantMilestoneItem]} isAuthorized={false} />);

    expect(screen.getByTestId("activity-card")).toHaveAttribute("data-is-authorized", "false");
  });

  it("should_authorize_item_when_project_authorized", () => {
    render(<ActivityFeed milestones={[grantMilestoneItem]} isAuthorized={true} />);

    expect(screen.getByTestId("activity-card")).toHaveAttribute("data-is-authorized", "true");
  });
});
