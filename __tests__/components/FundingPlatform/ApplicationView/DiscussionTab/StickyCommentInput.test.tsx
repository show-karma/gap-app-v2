import { render, screen } from "@testing-library/react";
import { StickyCommentInput } from "@/components/FundingPlatform/ApplicationView/DiscussionTab/StickyCommentInput";

// Mock CommentInput
jest.mock("@/components/FundingPlatform/ApplicationView/CommentInput", () => ({
  __esModule: true,
  default: ({ onSubmit, disabled, placeholder }: any) => (
    <div data-testid="comment-input">
      <textarea data-testid="comment-textarea" placeholder={placeholder} disabled={disabled} />
      <button
        type="button"
        data-testid="submit-btn"
        onClick={() => onSubmit("test content")}
        disabled={disabled}
      >
        Submit
      </button>
    </div>
  ),
}));

describe("StickyCommentInput", () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  describe("Rendering", () => {
    it("renders the comment input", () => {
      render(<StickyCommentInput onSubmit={mockOnSubmit} />);

      expect(screen.getByTestId("comment-input")).toBeInTheDocument();
    });

    it("has sticky positioning classes", () => {
      const { container } = render(<StickyCommentInput onSubmit={mockOnSubmit} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("sticky", "bottom-0");
    });

    it("has visual separation styling", () => {
      const { container } = render(<StickyCommentInput onSubmit={mockOnSubmit} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("border-t", "shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]");
    });
  });

  describe("Placeholder", () => {
    it("uses admin placeholder when isAdmin is true", () => {
      render(<StickyCommentInput onSubmit={mockOnSubmit} isAdmin={true} />);

      expect(screen.getByTestId("comment-textarea")).toHaveAttribute(
        "placeholder",
        "Add an admin comment..."
      );
    });

    it("uses default placeholder when isAdmin is false", () => {
      render(<StickyCommentInput onSubmit={mockOnSubmit} isAdmin={false} />);

      expect(screen.getByTestId("comment-textarea")).toHaveAttribute(
        "placeholder",
        "Add a comment for this application..."
      );
    });

    it("uses custom placeholder when provided", () => {
      render(<StickyCommentInput onSubmit={mockOnSubmit} placeholder="Custom placeholder" />);

      expect(screen.getByTestId("comment-textarea")).toHaveAttribute(
        "placeholder",
        "Custom placeholder"
      );
    });
  });

  describe("Disabled State", () => {
    it("passes disabled state to CommentInput", () => {
      render(<StickyCommentInput onSubmit={mockOnSubmit} disabled={true} />);

      expect(screen.getByTestId("comment-textarea")).toBeDisabled();
      expect(screen.getByTestId("submit-btn")).toBeDisabled();
    });

    it("is not disabled by default", () => {
      render(<StickyCommentInput onSubmit={mockOnSubmit} />);

      expect(screen.getByTestId("comment-textarea")).not.toBeDisabled();
    });
  });
});
