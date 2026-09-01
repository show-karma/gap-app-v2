import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MilestoneDetails } from "@/components/Pages/GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/MilestoneDetails";
import { useProjectAuthorization } from "@/hooks/useProjectAuthorization";

vi.mock("@/components/Shared/ActivityCard", () => ({
  ActivityCard: ({ activity, isAuthorized }: { activity?: any; isAuthorized?: boolean }) => (
    <div
      data-testid="activity-card"
      data-is-authorized={String(Boolean(isAuthorized))}
      data-cancellation-reason={activity?.data?.cancellation?.reason ?? ""}
    />
  ),
}));

vi.mock("@/store/grant", () => ({
  useGrantStore: vi.fn((selector: any) => selector({ grant: { communityUID: "0xcommunity" } })),
}));

// Authorization is resolved by the tri-state hook (composition is unit-tested
// in useProjectAuthorization.test.ts); here we verify MilestoneDetails forwards
// the grant's communityUID and the resolved decision to ActivityCard.
vi.mock("@/hooks/useProjectAuthorization", () => ({
  useProjectAuthorization: vi.fn(() => ({ isAuthorized: false, isLoading: false })),
}));

const mockUseProjectAuthorization = vi.mocked(useProjectAuthorization);

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
    mockUseProjectAuthorization.mockReturnValue({ isAuthorized: false, isLoading: false });
  });

  it("should_resolve_authorization_with_the_grant_communityUID", () => {
    renderComponent();

    expect(mockUseProjectAuthorization).toHaveBeenCalledWith("0xcommunity");
  });

  it("should_authorize_when_the_hook_resolves_authorized", () => {
    mockUseProjectAuthorization.mockReturnValue({ isAuthorized: true, isLoading: false });

    renderComponent();

    expect(screen.getByTestId("activity-card")).toHaveAttribute("data-is-authorized", "true");
  });

  it("should_not_authorize_when_the_hook_resolves_denied", () => {
    renderComponent();

    expect(screen.getByTestId("activity-card")).toHaveAttribute("data-is-authorized", "false");
  });

  it("should_thread_cancellation_derived_from_statusHistory_onto_the_unified_milestone", () => {
    render(
      <MilestoneDetails
        milestone={
          {
            ...baseMilestone,
            currentStatus: "cancelled",
            statusHistory: [
              { status: "pending", updatedAt: "2026-06-03T14:36:45.000Z" },
              {
                status: "cancelled",
                updatedAt: "2026-07-22T20:54:02.000Z",
                updatedBy: "0x8353",
                statusReason: "This work carried over into Batch 2 contract tracking",
              },
            ],
          } as any
        }
      />
    );

    expect(screen.getByTestId("activity-card")).toHaveAttribute(
      "data-cancellation-reason",
      "This work carried over into Batch 2 contract tracking"
    );
  });

  it("should_not_thread_cancellation_for_a_non_cancelled_milestone", () => {
    renderComponent();

    expect(screen.getByTestId("activity-card")).toHaveAttribute("data-cancellation-reason", "");
  });
});
