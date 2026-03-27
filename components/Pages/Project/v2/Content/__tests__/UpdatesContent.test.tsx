import { render, screen } from "@testing-library/react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useProjectProfile } from "@/hooks/v2/useProjectProfile";
import { useOwnerStore, useProjectStore } from "@/store";
import { UpdatesContent } from "../UpdatesContent";

// Mock dependencies
vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock("@/hooks/v2/useProjectProfile", () => ({
  useProjectProfile: vi.fn(),
}));

vi.mock("@/store", () => ({
  useOwnerStore: vi.fn(),
  useProjectStore: vi.fn(),
}));

vi.mock("@/components/Pages/Project/v2/MainContent/ActivityFeed", () => ({
  ActivityFeed: vi.fn(({ isAuthorized }) => (
    <div data-testid="activity-feed" data-authorized={isAuthorized}>
      Mock Activity Feed
    </div>
  )),
}));

vi.mock("@/components/Pages/Project/v2/MainContent/ActivityFilters", () => ({
  ActivityFilters: vi.fn(() => <div data-testid="activity-filters">Mock Filters</div>),
}));

describe("UpdatesContent", () => {
  const mockRouter = { replace: vi.fn() };
  const mockSearchParams = new URLSearchParams();

  beforeEach(() => {
    vi.clearAllMocks();
    (useParams as vi.Mock).mockReturnValue({ projectId: "test-project" });
    (useRouter as vi.Mock).mockReturnValue(mockRouter);
    (useSearchParams as vi.Mock).mockReturnValue(mockSearchParams);
    (useProjectProfile as vi.Mock).mockReturnValue({
      allUpdates: [],
      milestonesCount: 0,
      completedCount: 0,
    });
  });

  it("should pass isAuthorized=true to ActivityFeed when user is owner", () => {
    (useOwnerStore as unknown as vi.Mock).mockImplementation((selector) =>
      selector({ isOwner: true })
    );
    (useProjectStore as unknown as vi.Mock).mockImplementation((selector) =>
      selector({ isProjectAdmin: false })
    );

    render(<UpdatesContent />);

    const activityFeed = screen.getByTestId("activity-feed");
    expect(activityFeed).toHaveAttribute("data-authorized", "true");
  });

  it("should pass isAuthorized=true to ActivityFeed when user is project admin", () => {
    (useOwnerStore as unknown as vi.Mock).mockImplementation((selector) =>
      selector({ isOwner: false })
    );
    (useProjectStore as unknown as vi.Mock).mockImplementation((selector) =>
      selector({ isProjectAdmin: true })
    );

    render(<UpdatesContent />);

    const activityFeed = screen.getByTestId("activity-feed");
    expect(activityFeed).toHaveAttribute("data-authorized", "true");
  });

  it("should pass isAuthorized=true when user is both owner and admin", () => {
    (useOwnerStore as unknown as vi.Mock).mockImplementation((selector) =>
      selector({ isOwner: true })
    );
    (useProjectStore as unknown as vi.Mock).mockImplementation((selector) =>
      selector({ isProjectAdmin: true })
    );

    render(<UpdatesContent />);

    const activityFeed = screen.getByTestId("activity-feed");
    expect(activityFeed).toHaveAttribute("data-authorized", "true");
  });

  it("should pass isAuthorized=false to ActivityFeed when user is neither owner nor admin", () => {
    (useOwnerStore as unknown as vi.Mock).mockImplementation((selector) =>
      selector({ isOwner: false })
    );
    (useProjectStore as unknown as vi.Mock).mockImplementation((selector) =>
      selector({ isProjectAdmin: false })
    );

    render(<UpdatesContent />);

    const activityFeed = screen.getByTestId("activity-feed");
    expect(activityFeed).toHaveAttribute("data-authorized", "false");
  });

  it("should render activity filters", () => {
    (useOwnerStore as unknown as vi.Mock).mockImplementation((selector) =>
      selector({ isOwner: false })
    );
    (useProjectStore as unknown as vi.Mock).mockImplementation((selector) =>
      selector({ isProjectAdmin: false })
    );

    render(<UpdatesContent />);

    expect(screen.getByTestId("activity-filters")).toBeInTheDocument();
    expect(screen.getByTestId("activity-feed")).toBeInTheDocument();
  });
});
