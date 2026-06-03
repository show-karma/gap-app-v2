import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MilestoneDetails } from "@/components/Pages/GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/MilestoneDetails";
import { useIsCommunityAdmin } from "@/hooks/communities/useIsCommunityAdmin";

vi.mock("@/components/Shared/ActivityCard", () => ({
  ActivityCard: ({ isAuthorized }: { isAuthorized?: boolean }) => (
    <div data-testid="activity-card" data-is-authorized={String(Boolean(isAuthorized))} />
  ),
}));

const mockIsOwner = vi.fn(() => false);
const mockIsProjectOwner = vi.fn(() => false);
const mockIsProjectAdmin = vi.fn(() => false);

vi.mock("@/store", () => ({
  useOwnerStore: vi.fn(() => mockIsOwner()),
  useProjectStore: vi.fn((selector: any) => {
    const source = selector.toString();
    if (source.includes("isProjectOwner")) return mockIsProjectOwner();
    if (source.includes("isProjectAdmin")) return mockIsProjectAdmin();
    return undefined;
  }),
}));

vi.mock("@/store/grant", () => ({
  useGrantStore: vi.fn((selector: any) => selector({ grant: { communityUID: "0xcommunity" } })),
}));

vi.mock("@/hooks/communities/useIsCommunityAdmin", () => ({
  useIsCommunityAdmin: vi.fn(() => ({ isCommunityAdmin: false })),
}));

const mockUseIsCommunityAdmin = vi.mocked(useIsCommunityAdmin);

const baseMilestone = {
  uid: "milestone-1",
  refUID: "grant-1",
  title: "Milestone 1",
  description: "desc",
  chainID: 42161,
} as any;

const renderComponent = () => render(<MilestoneDetails milestone={baseMilestone} />);

describe("MilestoneDetails gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsOwner.mockReturnValue(false);
    mockIsProjectOwner.mockReturnValue(false);
    mockIsProjectAdmin.mockReturnValue(false);
    mockUseIsCommunityAdmin.mockReturnValue({ isCommunityAdmin: false } as any);
  });

  it("should_query_community_admin_with_the_grant_communityUID", () => {
    renderComponent();

    expect(mockUseIsCommunityAdmin).toHaveBeenCalledWith("0xcommunity");
  });

  it("should_authorize_when_user_is_community_admin", () => {
    mockUseIsCommunityAdmin.mockReturnValue({ isCommunityAdmin: true } as any);

    renderComponent();

    expect(screen.getByTestId("activity-card")).toHaveAttribute("data-is-authorized", "true");
  });

  it("should_not_authorize_when_user_has_no_role", () => {
    renderComponent();

    expect(screen.getByTestId("activity-card")).toHaveAttribute("data-is-authorized", "false");
  });

  it("should_authorize_when_user_is_project_owner", () => {
    mockIsProjectOwner.mockReturnValue(true);

    renderComponent();

    expect(screen.getByTestId("activity-card")).toHaveAttribute("data-is-authorized", "true");
  });
});
