import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import type { MilestoneStatusFilter } from "@/services/milestone-status-filter.service";

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

  it("defaults to 'all' when milestoneStatus param is not in URL", async () => {
    mockSearchParams = new URLSearchParams();

    const { UpdatesContent } = await import("@/components/Pages/Project/v2/Content/UpdatesContent");
    render(<UpdatesContent />);

    expect(screen.getByTestId("milestone-status-value")).toHaveTextContent("all");
  });

  it("passes milestoneStatusFilter to ActivityFilters dropdown", async () => {
    mockSearchParams = new URLSearchParams("milestoneStatus=verified");

    const { UpdatesContent } = await import("@/components/Pages/Project/v2/Content/UpdatesContent");
    render(<UpdatesContent />);

    // The milestone status value flows to ActivityFilters (for the dropdown display)
    expect(screen.getByTestId("milestone-status-value")).toHaveTextContent("verified");
  });

  it("uses pathname from usePathname when clearing all params", async () => {
    mockSearchParams = new URLSearchParams();

    const { UpdatesContent } = await import("@/components/Pages/Project/v2/Content/UpdatesContent");
    render(<UpdatesContent />);

    const button = screen.getByTestId("trigger-status-all");
    await userEvent.click(button);

    // The router.replace call should use the pathname from usePathname ("/project/test-project"),
    // not window.location.pathname which returns "/" in jsdom
    expect(mockReplace).toHaveBeenCalledWith("/project/test-project", { scroll: false });
  });
});
