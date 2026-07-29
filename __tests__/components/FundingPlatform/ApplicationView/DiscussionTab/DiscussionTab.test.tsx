/**
 * DiscussionTab renders the REAL TimelineContainer. An earlier revision of this
 * suite stubbed the timeline and asserted its own stub's button, which kept
 * passing for months while the shipped "View changes" button did nothing.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiscussionTab } from "@/components/FundingPlatform/ApplicationView/DiscussionTab";

// Leaf components with their own data hooks — not what this suite exercises.
vi.mock("@/components/EthereumAddressToProfileName", () => ({
  __esModule: true,
  default: ({ address }: { address: string }) => <span>{address}</span>,
}));

vi.mock("@/components/FundingPlatform/ApplicationView/CommentItem", () => ({
  __esModule: true,
  default: ({ comment }: { comment: { id: string; content: string } }) => (
    <div data-testid={`comment-${comment.id}`}>{comment.content}</div>
  ),
}));

vi.mock("@/src/features/application-comments/components/CommentInput", () => ({
  CommentInput: ({
    onSubmit,
    onChange,
    disabled,
    isLoading,
    placeholder,
  }: {
    onSubmit: () => void;
    onChange: (value: string) => void;
    disabled?: boolean;
    isLoading?: boolean;
    placeholder?: string;
  }) => (
    <div data-testid="comment-input">
      <textarea
        data-testid="comment-textarea"
        placeholder={placeholder}
        disabled={disabled || isLoading}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        data-testid="add-comment-btn"
        onClick={() => {
          onChange("New comment");
          onSubmit();
        }}
        disabled={disabled || isLoading}
      >
        Add Comment
      </button>
    </div>
  ),
}));

const initialVersion = {
  id: "v1",
  versionNumber: 0,
  submittedBy: "0xowner",
  currentStatus: "pending" as const,
  createdAt: "2026-01-01T10:00:00.000Z",
  hasChanges: false,
  changeCount: 0,
};

const editedVersion = {
  id: "v2",
  versionNumber: 1,
  submittedBy: "0xowner",
  currentStatus: "pending" as const,
  createdAt: "2026-01-02T10:00:00.000Z",
  hasChanges: true,
  changeCount: 2,
  diffFromPrevious: {
    changedFields: [
      { fieldLabel: "Title", oldValue: "a", newValue: "b" },
      { fieldLabel: "Budget", oldValue: "1", newValue: "2" },
    ],
  },
};

const mockProps = {
  applicationId: "app-123",
  comments: [
    {
      id: "c1",
      applicationId: "app-123",
      authorAddress: "0xabc",
      authorRole: "admin" as const,
      content: "Test comment",
      isDeleted: false,
      createdAt: "2026-01-03T10:00:00.000Z",
      updatedAt: "2026-01-03T10:00:00.000Z",
    },
  ],
  statusHistory: [{ status: "pending" as const, timestamp: "2026-01-01T09:00:00.000Z" }],
  versionHistory: [initialVersion, editedVersion],
  currentStatus: "pending" as const,
  isAdmin: true,
  currentUserAddress: "0x123",
  onCommentAdd: vi.fn(),
  onCommentEdit: vi.fn(),
  onCommentDelete: vi.fn(),
  onVersionClick: vi.fn(),
  isLoading: false,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DiscussionTab", () => {
  describe("Rendering", () => {
    it("renders comment input at top and the activity timeline below", () => {
      render(<DiscussionTab {...mockProps} />);

      expect(screen.getByTestId("comment-input")).toBeInTheDocument();
      expect(screen.getByText("Activity Timeline")).toBeInTheDocument();
    });

    it("renders every comment, status, and version entry", () => {
      render(<DiscussionTab {...mockProps} />);

      expect(screen.getByTestId("comment-c1")).toHaveTextContent("Test comment");
      expect(screen.getByText(/Status changed to Pending Review/)).toBeInTheDocument();
      expect(screen.getByText("Initial application submitted")).toBeInTheDocument();
      expect(screen.getByText("Application edited")).toBeInTheDocument();
      expect(screen.getByText("4 items")).toBeInTheDocument();
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
    it("renders the spinner instead of the timeline while loading", () => {
      render(<DiscussionTab {...mockProps} isLoading={true} />);

      expect(screen.queryByText("Activity Timeline")).not.toBeInTheDocument();
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
      const slowAdd = vi.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 100)));
      render(<DiscussionTab {...mockProps} onCommentAdd={slowAdd} />);

      await user.click(screen.getByTestId("add-comment-btn"));

      expect(screen.getByTestId("add-comment-btn")).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByTestId("add-comment-btn")).not.toBeDisabled();
      });
    });
  });

  describe("Version Click", () => {
    it("calls onVersionClick with the version id when the real View changes button is clicked", async () => {
      const user = userEvent.setup();
      render(<DiscussionTab {...mockProps} />);

      await user.click(screen.getByRole("button", { name: /View changes/i }));

      expect(mockProps.onVersionClick).toHaveBeenCalledWith(editedVersion.id);
    });

    it("labels the initial version's button View details and wires it to that version", async () => {
      const user = userEvent.setup();
      render(<DiscussionTab {...mockProps} />);

      await user.click(screen.getByRole("button", { name: /View details/i }));

      expect(mockProps.onVersionClick).toHaveBeenCalledWith(initialVersion.id);
    });

    it("renders no version buttons when onVersionClick is not supplied", () => {
      render(<DiscussionTab {...mockProps} onVersionClick={undefined} />);

      expect(screen.queryByRole("button", { name: /View changes/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /View details/i })).not.toBeInTheDocument();
    });
  });

  describe("Empty States", () => {
    it("renders the empty timeline state when there is no activity", () => {
      render(<DiscussionTab {...mockProps} comments={[]} statusHistory={[]} versionHistory={[]} />);

      expect(screen.getByText("No activity yet")).toBeInTheDocument();
    });

    it("renders without statusHistory", () => {
      render(<DiscussionTab {...mockProps} statusHistory={undefined} />);

      expect(screen.queryByText(/Status changed to/)).not.toBeInTheDocument();
      expect(screen.getByText("3 items")).toBeInTheDocument();
    });

    it("renders without versionHistory", () => {
      render(<DiscussionTab {...mockProps} versionHistory={undefined} />);

      expect(screen.queryByText("Application edited")).not.toBeInTheDocument();
      expect(screen.getByText("2 items")).toBeInTheDocument();
    });
  });
});
