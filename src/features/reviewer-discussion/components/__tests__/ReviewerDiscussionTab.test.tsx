import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUseReviewerComments = vi.fn();
vi.mock("../../hooks/use-reviewer-comments", () => ({
  useReviewerComments: (...args: unknown[]) => mockUseReviewerComments(...args),
}));

const mockTimeline = vi.fn();
vi.mock("@/components/FundingPlatform/ApplicationView/CommentsTimeline", () => ({
  default: (props: Record<string, unknown>) => {
    mockTimeline(props);
    return <div data-testid="timeline">{String(props.title)}</div>;
  },
}));

import { ReviewerDiscussionTab } from "../ReviewerDiscussionTab";

const hookState = (overrides = {}) => ({
  comments: [],
  isLoading: false,
  error: null,
  refetch: vi.fn(),
  addComment: vi.fn(),
  editComment: vi.fn(),
  deleteComment: vi.fn(),
  ...overrides,
});

describe("ReviewerDiscussionTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseReviewerComments.mockReturnValue(hookState());
  });

  it("renders nothing and fetches nothing for applicants and the public", () => {
    const { container } = render(
      <ReviewerDiscussionTab referenceNumber="REF-1" canView={false} isAdmin={false} />
    );

    expect(container).toBeEmptyDOMElement();
    expect(mockUseReviewerComments).not.toHaveBeenCalled();
  });

  it("renders the thread without grantee mentions or a separate draft", () => {
    render(<ReviewerDiscussionTab referenceNumber="REF-1" programId="959" canView isAdmin />);

    expect(screen.getByTestId("timeline")).toHaveTextContent("Reviewer Discussion");
    const props = mockTimeline.mock.calls[0][0];
    expect(props.referenceNumber).toBeUndefined();
    expect(props.statusHistory).toEqual([]);
    expect(props.draftKey).toBe("reviewer-discussion:REF-1");
    expect(props.isAdmin).toBe(true);
    expect(props.programId).toBe("959");
  });

  it("shows an error with a retry", async () => {
    const refetch = vi.fn();
    mockUseReviewerComments.mockReturnValue(hookState({ error: new Error("403"), refetch }));

    render(<ReviewerDiscussionTab referenceNumber="REF-1" canView isAdmin={false} />);

    expect(screen.getByText("Failed to load the reviewer discussion.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(refetch).toHaveBeenCalled();
  });
});
