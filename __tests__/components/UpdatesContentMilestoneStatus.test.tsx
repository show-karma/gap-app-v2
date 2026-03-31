import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { MilestoneStatusFilter } from "@/services/milestone-status-filter.service";

// Track URL operations
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
  useParams: () => ({ projectId: "test-project" }),
}));

vi.mock("@/hooks/v2/useProjectProfile", () => ({
  useProjectProfile: () => ({
    allUpdates: [],
    milestonesCount: 0,
    completedCount: 0,
  }),
}));

vi.mock("@/store", () => ({
  useOwnerStore: vi.fn((selector) => {
    const state = { isOwner: false };
    return selector ? selector(state) : state;
  }),
  useProjectStore: vi.fn((selector) => {
    const state = { isProjectAdmin: false };
    return selector ? selector(state) : state;
  }),
}));

vi.mock("@/services/project-profile.service", () => ({
  getActivityFilterType: vi.fn(() => "milestones"),
}));

// Mock the child components to observe props
vi.mock("@/components/Pages/Project/v2/MainContent/ActivityFilters", () => ({
  ActivityFilters: (props: any) => (
    <div data-testid="activity-filters">
      <span data-testid="milestone-status-value">{props.milestoneStatusFilter ?? "none"}</span>
      <button
        type="button"
        data-testid="trigger-status-change"
        onClick={() => props.onMilestoneStatusChange?.("completed")}
      />
    </div>
  ),
}));

vi.mock("@/components/Pages/Project/v2/MainContent/ActivityFeed", () => ({
  ActivityFeed: (props: any) => (
    <div data-testid="activity-feed">
      <span data-testid="feed-milestone-status">{props.milestoneStatusFilter ?? "none"}</span>
    </div>
  ),
}));

vi.mock("@/components/Pages/Project/v2/Skeletons", () => ({
  ActivityFeedSkeleton: () => <div data-testid="activity-feed-skeleton" />,
}));

describe("UpdatesContent - milestone status filter URL sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("reads milestoneStatus from URL search params", async () => {
    mockSearchParams = new URLSearchParams("milestoneStatus=completed");

    const { UpdatesContent } = await import("@/components/Pages/Project/v2/Content/UpdatesContent");
    render(<UpdatesContent />);

    expect(screen.getByTestId("milestone-status-value")).toHaveTextContent("completed");
  });

  it("defaults to 'all' when milestoneStatus param is not in URL", async () => {
    mockSearchParams = new URLSearchParams();

    const { UpdatesContent } = await import("@/components/Pages/Project/v2/Content/UpdatesContent");
    render(<UpdatesContent />);

    expect(screen.getByTestId("milestone-status-value")).toHaveTextContent("all");
  });

  it("passes milestoneStatusFilter to ActivityFeed", async () => {
    mockSearchParams = new URLSearchParams("milestoneStatus=verified");

    const { UpdatesContent } = await import("@/components/Pages/Project/v2/Content/UpdatesContent");
    render(<UpdatesContent />);

    expect(screen.getByTestId("feed-milestone-status")).toHaveTextContent("verified");
  });
});
