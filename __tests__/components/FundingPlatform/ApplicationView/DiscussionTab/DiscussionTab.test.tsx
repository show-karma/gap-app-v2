import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiscussionTab } from "@/components/FundingPlatform/ApplicationView/DiscussionTab";

// Mock child components
jest.mock("@/components/FundingPlatform/ApplicationView/DiscussionTab/TimelineContainer", () => ({
  TimelineContainer: ({
    comments,
    statusHistory,
    versionHistory,
    isLoading,
    onVersionClick,
  }: any) => (
    <div data-testid="timeline-container">
      <span data-testid="comment-count">{comments?.length || 0}</span>
      <span data-testid="status-count">{statusHistory?.length || 0}</span>
      <span data-testid="version-count">{versionHistory?.length || 0}</span>
      {isLoading && <span data-testid="loading">Loading...</span>}
      {onVersionClick && (
        <button type="button" data-testid="version-click-btn" onClick={() => onVersionClick("v1")}>
          View Version
        </button>
      )}
    </div>
  ),
}));

jest.mock("@/components/FundingPlatform/ApplicationView/CommentInput", () => ({
  __esModule: true,
  default: ({ onSubmit, disabled, placeholder }: any) => (
    <div data-testid="comment-input">
      <textarea data-testid="comment-textarea" placeholder={placeholder} disabled={disabled} />
      <button
        type="button"
        data-testid="add-comment-btn"
        onClick={() => onSubmit("New comment")}
        disabled={disabled}
      >
        Add Comment
      </button>
    </div>
  ),
}));

describe("DiscussionTab", () => {
  const mockProps = {
    applicationId: "app-123",
    comments: [{ id: "c1", content: "Test comment", createdAt: new Date().toISOString() }],
    statusHistory: [{ status: "pending", timestamp: new Date().toISOString() }],
    versionHistory: [{ id: "v1", versionNumber: 0, createdAt: new Date().toISOString() }],
    currentStatus: "pending" as const,
    isAdmin: true,
    currentUserAddress: "0x123",
    onCommentAdd: jest.fn(),
    onCommentEdit: jest.fn(),
    onCommentDelete: jest.fn(),
    onVersionClick: jest.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders comment input at top and timeline below", () => {
      render(<DiscussionTab {...mockProps} />);

      expect(screen.getByTestId("comment-input")).toBeInTheDocument();
      expect(screen.getByTestId("timeline-container")).toBeInTheDocument();
    });

    it("passes data to TimelineContainer", () => {
      render(<DiscussionTab {...mockProps} />);

      expect(screen.getByTestId("comment-count")).toHaveTextContent("1");
      expect(screen.getByTestId("status-count")).toHaveTextContent("1");
      expect(screen.getByTestId("version-count")).toHaveTextContent("1");
    });

    it("uses admin placeholder when isAdmin is true", () => {
      render(<DiscussionTab {...mockProps} />);

      expect(screen.getByTestId("comment-textarea")).toHaveAttribute(
        "placeholder",
        "Add an admin comment..."
      );
    });

    it("uses default placeholder when isAdmin is false", () => {
      render(<DiscussionTab {...mockProps} isAdmin={false} />);

      expect(screen.getByTestId("comment-textarea")).toHaveAttribute(
        "placeholder",
        "Add a comment for this application..."
      );
    });
  });

  describe("Loading State", () => {
    it("passes loading state to TimelineContainer", () => {
      render(<DiscussionTab {...mockProps} isLoading={true} />);

      expect(screen.getByTestId("loading")).toBeInTheDocument();
    });
  });

  describe("Adding Comments", () => {
    it("calls onCommentAdd when comment is submitted", async () => {
      const user = userEvent.setup();
      render(<DiscussionTab {...mockProps} />);

      await user.click(screen.getByTestId("add-comment-btn"));

      await waitFor(() => {
        expect(mockProps.onCommentAdd).toHaveBeenCalledWith("New comment");
      });
    });

    it("disables input while adding comment", async () => {
      const user = userEvent.setup();
      const slowAdd = jest.fn(() => new Promise((resolve) => setTimeout(resolve, 100)));
      render(<DiscussionTab {...mockProps} onCommentAdd={slowAdd} />);

      await user.click(screen.getByTestId("add-comment-btn"));

      expect(screen.getByTestId("add-comment-btn")).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByTestId("add-comment-btn")).not.toBeDisabled();
      });
    });
  });

  describe("Version Click", () => {
    it("calls onVersionClick when version is clicked", async () => {
      const user = userEvent.setup();
      render(<DiscussionTab {...mockProps} />);

      await user.click(screen.getByTestId("version-click-btn"));

      expect(mockProps.onVersionClick).toHaveBeenCalledWith("v1");
    });
  });

  describe("Empty States", () => {
    it("renders with empty comments", () => {
      render(<DiscussionTab {...mockProps} comments={[]} />);

      expect(screen.getByTestId("comment-count")).toHaveTextContent("0");
    });

    it("renders without statusHistory", () => {
      render(<DiscussionTab {...mockProps} statusHistory={undefined} />);

      expect(screen.getByTestId("status-count")).toHaveTextContent("0");
    });

    it("renders without versionHistory", () => {
      render(<DiscussionTab {...mockProps} versionHistory={undefined} />);

      expect(screen.getByTestId("version-count")).toHaveTextContent("0");
    });
  });
});
