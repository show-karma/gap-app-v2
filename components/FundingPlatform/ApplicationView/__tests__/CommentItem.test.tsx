import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ApplicationComment } from "@/types/funding-platform";
import CommentItem from "../CommentItem";

// Mock DeleteDialog to avoid @headlessui/react dependency in tests
jest.mock("@/components/DeleteDialog", () => ({
  DeleteDialog: ({
    title,
    deleteFunction,
    isLoading,
    externalIsOpen,
    externalSetIsOpen,
  }: {
    title: string;
    deleteFunction: () => Promise<void>;
    isLoading: boolean;
    externalIsOpen?: boolean;
    externalSetIsOpen?: (isOpen: boolean) => void;
  }) => {
    if (!externalIsOpen) return null;
    return (
      <div data-testid="delete-dialog">
        <p>{title}</p>
        <button onClick={() => externalSetIsOpen?.(false)}>Cancel</button>
        <button
          onClick={async () => {
            await deleteFunction();
            externalSetIsOpen?.(false);
          }}
          disabled={isLoading}
        >
          Continue
        </button>
      </div>
    );
  },
}));

// Mock dependencies
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      address: "0x1234567890abcdef1234567890abcdef12345678",
    },
  }),
}));

jest.mock("@/hooks/useMentionEditor", () => ({
  useMentionEditor: () => ({
    isAutocompleteOpen: false,
    filterText: "",
    selectedIndex: 0,
    caretPosition: { top: 0, left: 0 },
    handleContentChange: jest.fn(),
    handleSelectReviewer: jest.fn(),
    handleInvitedReviewer: jest.fn(),
    handleKeyDown: jest.fn(),
    handleOpenInviteModal: jest.fn(),
    handleCloseInviteModal: jest.fn(),
    handleCloseAutocomplete: jest.fn(),
    isInviteModalOpen: false,
  }),
}));

jest.mock("@/hooks/useMilestoneReviewers", () => ({
  useMilestoneReviewers: () => ({ data: [] }),
}));

jest.mock("@/utilities/auth/compare-all-wallets", () => ({
  compareAllWallets: (user: { address: string }, address: string) =>
    user.address.toLowerCase() === address.toLowerCase(),
}));

jest.mock("@/components/Utilities/MarkdownEditor", () => ({
  MarkdownEditor: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea
      data-testid="markdown-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

jest.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source }: { source: string }) => (
    <div data-testid="markdown-preview">{source}</div>
  ),
}));

jest.mock("@/utilities/mentions", () => ({
  renderMentionsAsMarkdown: (content: string) => content,
}));

const createMockComment = (overrides?: Partial<ApplicationComment>): ApplicationComment => ({
  id: "comment-1",
  content: "Test comment content",
  authorAddress: "0x1234567890abcdef1234567890abcdef12345678",
  authorName: "Test User",
  authorRole: "applicant",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  isDeleted: false,
  ...overrides,
});

function renderCommentItem(props: Partial<React.ComponentProps<typeof CommentItem>> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const defaultProps = {
    comment: createMockComment(),
    isAdmin: false,
    currentUserAddress: "0x1234567890abcdef1234567890abcdef12345678",
    ...props,
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <CommentItem {...defaultProps} />
    </QueryClientProvider>
  );
}

describe("CommentItem", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("delete confirmation", () => {
    it("should show a DeleteDialog instead of using window.confirm()", async () => {
      const onDelete = jest.fn().mockResolvedValue(undefined);

      renderCommentItem({ onDelete });

      // Hover to reveal action buttons
      const deleteButton = screen.getByTitle("Delete comment");
      fireEvent.click(deleteButton);

      // Should NOT call window.confirm - instead should show a dialog
      // The DeleteDialog renders a modal with "Continue" and "Cancel" buttons
      await waitFor(() => {
        expect(screen.getByText("Cancel")).toBeInTheDocument();
        expect(screen.getByText("Continue")).toBeInTheDocument();
      });

      // onDelete should NOT have been called yet (waiting for dialog confirmation)
      expect(onDelete).not.toHaveBeenCalled();
    });

    it("should call onDelete when dialog is confirmed", async () => {
      const onDelete = jest.fn().mockResolvedValue(undefined);

      renderCommentItem({ onDelete });

      const deleteButton = screen.getByTitle("Delete comment");
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText("Continue")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Continue"));

      await waitFor(() => {
        expect(onDelete).toHaveBeenCalledWith("comment-1");
      });
    });

    it("should not call onDelete when dialog is cancelled", async () => {
      const onDelete = jest.fn().mockResolvedValue(undefined);

      renderCommentItem({ onDelete });

      const deleteButton = screen.getByTitle("Delete comment");
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText("Cancel")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Cancel"));

      expect(onDelete).not.toHaveBeenCalled();
    });

    it("should show admin-specific message when admin deletes another user's comment", async () => {
      const onDelete = jest.fn().mockResolvedValue(undefined);

      renderCommentItem({
        comment: createMockComment({
          authorAddress: "0xdifferentAddress1234567890abcdef12345678",
          authorName: "Other User",
        }),
        isAdmin: true,
        onDelete,
      });

      const deleteButton = screen.getByTitle("Delete comment");
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/delete this comment.*audit purposes/i)).toBeInTheDocument();
      });
    });

    it("should show regular message when user deletes their own comment", async () => {
      const onDelete = jest.fn().mockResolvedValue(undefined);

      renderCommentItem({ onDelete });

      const deleteButton = screen.getByTitle("Delete comment");
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/delete your comment.*cannot be undone/i)).toBeInTheDocument();
      });
    });
  });
});
