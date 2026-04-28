import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

// Track URL operations
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();
const MOCK_PATHNAME = "/project/test-project";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
  useParams: () => ({ projectId: "test-project" }),
  usePathname: () => MOCK_PATHNAME,
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
        data-testid="trigger-milestones-filter"
        onClick={() => props.onFilterToggle?.("milestones")}
      />
      <button
        type="button"
        data-testid="trigger-funding-filter"
        onClick={() => props.onFilterToggle?.("funding")}
      />
      <button
        type="button"
        data-testid="trigger-status-change"
        onClick={() => props.onMilestoneStatusChange?.("completed")}
      />
      <button
        type="button"
        data-testid="trigger-status-all"
        onClick={() => props.onMilestoneStatusChange?.("all")}
      />
    </div>
  ),
}));

vi.mock("@/components/Pages/Project/v2/MainContent/ActivityFeed", () => ({
  ActivityFeed: () => <div data-testid="activity-feed" />,
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

  it("defaults to 'all' when milestone filters are not active", async () => {
    mockSearchParams = new URLSearchParams();

    const { UpdatesContent } = await import("@/components/Pages/Project/v2/Content/UpdatesContent");
    render(<UpdatesContent />);

    expect(screen.getByTestId("milestone-status-value")).toHaveTextContent("all");
  });

  it("keeps 'all' when milestones are active without an explicit status in the URL", async () => {
    mockSearchParams = new URLSearchParams("filter=milestones");

    const { UpdatesContent } = await import("@/components/Pages/Project/v2/Content/UpdatesContent");
    render(<UpdatesContent />);

    expect(screen.getByTestId("milestone-status-value")).toHaveTextContent("all");
  });

  it("adds completed milestoneStatus when milestones filter is enabled from the default view", async () => {
    mockSearchParams = new URLSearchParams();

    const { UpdatesContent } = await import("@/components/Pages/Project/v2/Content/UpdatesContent");
    render(<UpdatesContent />);

    await userEvent.click(screen.getByTestId("trigger-milestones-filter"));

    expect(mockReplace).toHaveBeenCalledWith("?filter=milestones&milestoneStatus=completed", {
      scroll: false,
    });
  });

  it("writes an explicit all-status choice when users switch milestones back to all statuses", async () => {
    mockSearchParams = new URLSearchParams("filter=milestones&milestoneStatus=completed");

    const { UpdatesContent } = await import("@/components/Pages/Project/v2/Content/UpdatesContent");
    render(<UpdatesContent />);

    await userEvent.click(screen.getByTestId("trigger-status-all"));

    expect(mockReplace).toHaveBeenCalledWith("?filter=milestones&milestoneStatus=all", {
      scroll: false,
    });
  });

  it("preserves an explicit all-status choice when other filters change", async () => {
    mockSearchParams = new URLSearchParams("filter=milestones&milestoneStatus=all");

    const { UpdatesContent } = await import("@/components/Pages/Project/v2/Content/UpdatesContent");
    render(<UpdatesContent />);

    await userEvent.click(screen.getByTestId("trigger-funding-filter"));

    expect(mockReplace).toHaveBeenCalledWith("?filter=milestones%2Cfunding&milestoneStatus=all", {
      scroll: false,
    });
  });

  it("passes milestoneStatusFilter to ActivityFilters dropdown", async () => {
    mockSearchParams = new URLSearchParams("milestoneStatus=verified");

    const { UpdatesContent } = await import("@/components/Pages/Project/v2/Content/UpdatesContent");
    render(<UpdatesContent />);

    // The milestone status value flows to ActivityFilters (for the dropdown display)
    expect(screen.getByTestId("milestone-status-value")).toHaveTextContent("verified");
  });

  it("writes an explicit all-status param when selecting all statuses from the default view", async () => {
    mockSearchParams = new URLSearchParams();

    const { UpdatesContent } = await import("@/components/Pages/Project/v2/Content/UpdatesContent");
    render(<UpdatesContent />);

    const button = screen.getByTestId("trigger-status-all");
    await userEvent.click(button);

    expect(mockReplace).toHaveBeenCalledWith("?milestoneStatus=all", { scroll: false });
  });
});
