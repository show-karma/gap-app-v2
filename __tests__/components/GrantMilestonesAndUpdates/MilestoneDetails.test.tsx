import { render, screen } from "@testing-library/react";
import { MilestoneDetails } from "@/components/Pages/GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/MilestoneDetails";
import type { GrantMilestone } from "@/types/v2/grant";

vi.mock("@/store", () => ({
  useProjectStore: vi.fn((selector: (s: any) => any) =>
    selector({ isProjectOwner: false, isProjectAdmin: false })
  ),
  useOwnerStore: vi.fn((selector: (s: any) => any) => selector({ isOwner: false })),
}));

vi.mock("@/src/core/rbac/context/permission-context", () => ({
  useIsCommunityAdmin: () => false,
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
});
