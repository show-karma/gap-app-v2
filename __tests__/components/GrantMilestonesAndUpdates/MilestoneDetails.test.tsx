import { render, screen } from "@testing-library/react";
import { MilestoneDetails } from "@/components/Pages/GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/MilestoneDetails";
import type { GrantMilestone } from "@/types/v2/grant";

// Mock the SDK to avoid class initialization errors
vi.mock("@show-karma/karma-gap-sdk", () => ({
  GAP: vi.fn(),
  GapSchema: vi.fn(),
}));

// Mock the ActivityCard component to avoid SDK dependency chain. Expose the
// unified milestone's currentStatus so we can assert it is threaded through
// (the card itself derives the Cancelled badge from this field).
vi.mock("@/components/Shared/ActivityCard", () => ({
  ActivityCard: ({ activity }: any) => (
    <div data-testid="activity-card">
      {activity?.data?.title || "Activity"}
      <span data-testid="unified-current-status">{activity?.data?.currentStatus ?? ""}</span>
    </div>
  ),
}));

vi.mock("@/store", () => ({
  useProjectStore: vi.fn((selector: (s: any) => any) =>
    selector({ isProjectOwner: false, isProjectAdmin: false })
  ),
  useOwnerStore: vi.fn((selector: (s: any) => any) => selector({ isOwner: false })),
}));

vi.mock("@/store/grant", () => ({
  useGrantStore: vi.fn((selector: (s: any) => any) => selector({ grant: null })),
}));

vi.mock("@/hooks/communities/useIsCommunityAdmin", () => ({
  useIsCommunityAdmin: () => ({ isCommunityAdmin: false }),
}));

vi.mock("@/hooks/useProjectAuthorization", () => ({
  useProjectAuthorization: () => ({ isAuthorized: false, isLoading: false }),
}));

vi.mock(
  "@/components/Pages/GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/MilestoneDelete",
  () => ({ MilestoneDelete: () => null })
);
vi.mock(
  "@/components/Pages/GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/MilestoneEdit",
  () => ({ MilestoneEdit: () => null })
);
vi.mock(
  "@/components/Pages/GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/Updates",
  () => ({ Updates: () => null })
);
vi.mock("@/utilities/ReadMore", () => ({
  ReadMore: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const baseMilestone: GrantMilestone = {
  uid: "milestone-abc",
  chainID: 1,
  title: "Build the thing",
  description: "Some description",
  endsAt: Date.now() / 1000 + 86400,
};

describe("MilestoneDetails", () => {
  it("renders milestone title", () => {
    render(<MilestoneDetails milestone={baseMilestone} index={1} />);
    expect(screen.getByText("Build the thing")).toBeInTheDocument();
  });

  it("does not render an amount badge when allocationAmount is not provided", () => {
    render(<MilestoneDetails milestone={baseMilestone} index={1} />);
    expect(screen.queryByTestId("milestone-allocation-amount")).not.toBeInTheDocument();
  });

  it("renders the allocation amount badge when allocationAmount is provided", () => {
    render(<MilestoneDetails milestone={baseMilestone} index={1} allocationAmount="5,000" />);
    expect(screen.getByTestId("milestone-allocation-amount")).toHaveTextContent("5,000");
  });

  it("does not render amount badge when allocationAmount is empty string", () => {
    render(<MilestoneDetails milestone={baseMilestone} index={1} allocationAmount="" />);
    expect(screen.queryByTestId("milestone-allocation-amount")).not.toBeInTheDocument();
  });

  it("threads the raw currentStatus onto the unified milestone (DEV-523 cancelled)", () => {
    // Without this the grant-store data path never sets currentStatus, so a
    // cancelled milestone falls through to a pending/past-due badge.
    render(
      <MilestoneDetails milestone={{ ...baseMilestone, currentStatus: "cancelled" }} index={1} />
    );
    expect(screen.getByTestId("unified-current-status")).toHaveTextContent("cancelled");
  });
});
