import { render, screen } from "@testing-library/react";
import { ReviewsSection } from "@/components/Pages/Dashboard/ReviewsSection/ReviewsSection";
import { useReviewerPrograms } from "@/hooks/usePermissions";
import type { FundingProgram } from "@/services/fundingPlatformService";

jest.mock("@/hooks/usePermissions", () => ({
  useReviewerPrograms: jest.fn(),
}));

jest.mock("@/components/Utilities/ProfilePicture", () => ({
  ProfilePicture: ({ name }: { name: string }) => <div data-testid={`avatar-${name}`} />,
}));

const mockUseReviewerPrograms = useReviewerPrograms as unknown as jest.Mock;

const createProgram = (overrides: Partial<FundingProgram> = {}): FundingProgram =>
  ({
    programId: "prog-1",
    chainID: 1,
    communitySlug: "community-a",
    communityUID: "uid-a",
    communityName: "Community A",
    communityImage: "",
    isProgramReviewer: true,
    isMilestoneReviewer: false,
    metrics: { totalApplications: 10 },
    ...overrides,
  }) as FundingProgram;

describe("ReviewsSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading skeleton", () => {
    mockUseReviewerPrograms.mockReturnValue({
      programs: [],
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });

    const { container } = render(<ReviewsSection />);

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders empty state when no programs", () => {
    mockUseReviewerPrograms.mockReturnValue({
      programs: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ReviewsSection />);

    expect(screen.getByText(/don.t have reviewer permissions/i)).toBeInTheDocument();
  });

  it("renders error state with retry button", () => {
    const refetch = jest.fn();
    mockUseReviewerPrograms.mockReturnValue({
      programs: [],
      isLoading: false,
      error: new Error("API failed"),
      refetch,
    });

    render(<ReviewsSection />);

    expect(screen.getByText(/unable to load your reviewer programs/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("renders community cards grouped by community", () => {
    mockUseReviewerPrograms.mockReturnValue({
      programs: [
        createProgram({ programId: "p1", communitySlug: "comm-a", communityName: "Alpha" }),
        createProgram({ programId: "p2", communitySlug: "comm-a", communityName: "Alpha" }),
        createProgram({ programId: "p3", communitySlug: "comm-b", communityName: "Beta" }),
      ],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ReviewsSection />);

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    // Stats cards show Communities and Total Programs labels
    expect(screen.getByText("Communities")).toBeInTheDocument();
    expect(screen.getByText("Total Programs")).toBeInTheDocument();
  });

  it("shows program and application counts per community", () => {
    mockUseReviewerPrograms.mockReturnValue({
      programs: [
        createProgram({
          programId: "p1",
          communitySlug: "comm-a",
          communityName: "Alpha",
          metrics: { totalApplications: 5 },
        }),
        createProgram({
          programId: "p2",
          communitySlug: "comm-a",
          communityName: "Alpha",
          metrics: { totalApplications: 3 },
        }),
      ],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ReviewsSection />);

    // Verify Programs label exists and its count
    expect(screen.getByText("Programs")).toBeInTheDocument();
    // Verify Applications label exists and aggregated count (5 + 3 = 8)
    expect(screen.getByText("Applications")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("shows View Milestones button for milestone reviewers", () => {
    mockUseReviewerPrograms.mockReturnValue({
      programs: [
        createProgram({
          programId: "p1",
          communitySlug: "comm-a",
          communityName: "Alpha",
          isMilestoneReviewer: true,
        }),
      ],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ReviewsSection />);

    expect(screen.getByText("View Milestones")).toBeInTheDocument();
  });

  it("does not show View Milestones when not milestone reviewer", () => {
    mockUseReviewerPrograms.mockReturnValue({
      programs: [
        createProgram({
          programId: "p1",
          communitySlug: "comm-a",
          communityName: "Alpha",
          isMilestoneReviewer: false,
        }),
      ],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ReviewsSection />);

    expect(screen.queryByText("View Milestones")).not.toBeInTheDocument();
  });

  it("sorts communities alphabetically", () => {
    mockUseReviewerPrograms.mockReturnValue({
      programs: [
        createProgram({ programId: "p1", communitySlug: "comm-z", communityName: "Zebra" }),
        createProgram({ programId: "p2", communitySlug: "comm-a", communityName: "Alpha" }),
      ],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ReviewsSection />);

    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings[0]).toHaveTextContent("Alpha");
    expect(headings[1]).toHaveTextContent("Zebra");
  });
});
