import { fireEvent, render, screen } from "@testing-library/react";
import HeaderActions from "@/components/FundingPlatform/ApplicationView/HeaderActions";

// Mock the Button component from ui
jest.mock("@/components/ui/button", () => ({
  Button: ({ onClick, disabled, children, className, variant, size }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-variant={variant}
      data-size={size}
    >
      {children}
    </button>
  ),
}));

describe("HeaderActions", () => {
  const defaultProps = {
    currentStatus: "pending" as const,
    onStatusChange: jest.fn(),
    isUpdating: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Pending Status", () => {
    it("should show Start Review button for pending status", () => {
      render(<HeaderActions {...defaultProps} currentStatus="pending" />);

      expect(screen.getByRole("button", { name: /start review/i })).toBeInTheDocument();
    });

    it("should call onStatusChange with under_review when Start Review is clicked", () => {
      const onStatusChange = jest.fn();
      render(
        <HeaderActions {...defaultProps} currentStatus="pending" onStatusChange={onStatusChange} />
      );

      fireEvent.click(screen.getByRole("button", { name: /start review/i }));

      expect(onStatusChange).toHaveBeenCalledWith("under_review");
    });
  });

  describe("Resubmitted Status", () => {
    it("should show Start Review button for resubmitted status", () => {
      render(<HeaderActions {...defaultProps} currentStatus="resubmitted" />);

      expect(screen.getByRole("button", { name: /start review/i })).toBeInTheDocument();
    });

    it("should call onStatusChange with under_review when Start Review is clicked", () => {
      const onStatusChange = jest.fn();
      render(
        <HeaderActions
          {...defaultProps}
          currentStatus="resubmitted"
          onStatusChange={onStatusChange}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /start review/i }));

      expect(onStatusChange).toHaveBeenCalledWith("under_review");
    });
  });

  describe("Under Review Status", () => {
    it("should show Approve, Request Revision, and Reject buttons for under_review status", () => {
      render(<HeaderActions {...defaultProps} currentStatus="under_review" />);

      expect(screen.getByRole("button", { name: /approve/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /request revision/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /reject/i })).toBeInTheDocument();
    });

    it("should call onStatusChange with approved when Approve is clicked", () => {
      const onStatusChange = jest.fn();
      render(
        <HeaderActions
          {...defaultProps}
          currentStatus="under_review"
          onStatusChange={onStatusChange}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /approve/i }));

      expect(onStatusChange).toHaveBeenCalledWith("approved");
    });

    it("should call onStatusChange with revision_requested when Request Revision is clicked", () => {
      const onStatusChange = jest.fn();
      render(
        <HeaderActions
          {...defaultProps}
          currentStatus="under_review"
          onStatusChange={onStatusChange}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /request revision/i }));

      expect(onStatusChange).toHaveBeenCalledWith("revision_requested");
    });

    it("should call onStatusChange with rejected when Reject is clicked", () => {
      const onStatusChange = jest.fn();
      render(
        <HeaderActions
          {...defaultProps}
          currentStatus="under_review"
          onStatusChange={onStatusChange}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /reject/i }));

      expect(onStatusChange).toHaveBeenCalledWith("rejected");
    });
  });

  describe("Revision Requested Status", () => {
    it("should show Review button for revision_requested status", () => {
      render(<HeaderActions {...defaultProps} currentStatus="revision_requested" />);

      expect(screen.getByRole("button", { name: /review/i })).toBeInTheDocument();
    });

    it("should call onStatusChange with under_review when Review is clicked", () => {
      const onStatusChange = jest.fn();
      render(
        <HeaderActions
          {...defaultProps}
          currentStatus="revision_requested"
          onStatusChange={onStatusChange}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /review/i }));

      expect(onStatusChange).toHaveBeenCalledWith("under_review");
    });
  });

  describe("Terminal Statuses", () => {
    it("should not render any buttons for approved status", () => {
      const { container } = render(<HeaderActions {...defaultProps} currentStatus="approved" />);

      expect(container.querySelector("button")).not.toBeInTheDocument();
    });

    it("should not render any buttons for rejected status", () => {
      const { container } = render(<HeaderActions {...defaultProps} currentStatus="rejected" />);

      expect(container.querySelector("button")).not.toBeInTheDocument();
    });
  });

  describe("Updating State", () => {
    it("should disable all buttons when isUpdating is true", () => {
      render(<HeaderActions {...defaultProps} currentStatus="under_review" isUpdating={true} />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it("should enable all buttons when isUpdating is false", () => {
      render(<HeaderActions {...defaultProps} currentStatus="under_review" isUpdating={false} />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).not.toBeDisabled();
      });
    });
  });

  describe("Button Styling", () => {
    it("should apply green styling to Approve button", () => {
      render(<HeaderActions {...defaultProps} currentStatus="under_review" />);

      const approveButton = screen.getByRole("button", { name: /approve/i });
      expect(approveButton.className).toContain("emerald");
    });

    it("should apply red styling to Reject button", () => {
      render(<HeaderActions {...defaultProps} currentStatus="under_review" />);

      const rejectButton = screen.getByRole("button", { name: /reject/i });
      expect(rejectButton.className).toContain("red");
    });

    it("should use small size for buttons", () => {
      render(<HeaderActions {...defaultProps} currentStatus="under_review" />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button.getAttribute("data-size")).toBe("sm");
      });
    });
  });

  describe("Layout", () => {
    it("should render buttons in a flex container", () => {
      const { container } = render(
        <HeaderActions {...defaultProps} currentStatus="under_review" />
      );

      const flexContainer = container.querySelector(".flex");
      expect(flexContainer).toBeInTheDocument();
    });

    it("should have gap between buttons", () => {
      const { container } = render(
        <HeaderActions {...defaultProps} currentStatus="under_review" />
      );

      const flexContainer = container.querySelector(".gap-2");
      expect(flexContainer).toBeInTheDocument();
    });
  });
});
