import { fireEvent, render, screen } from "@testing-library/react";
import { TableStatusActionButtons } from "@/components/FundingPlatform/ApplicationList/TableStatusActionButtons";

// Mock Button component
jest.mock("@/components/Utilities/Button", () => ({
  Button: ({ onClick, disabled, children, className, variant }: any) => {
    // Extract text from children (could be icon + text or just text)
    const getButtonText = (children: any): string => {
      if (typeof children === "string") return children;
      if (Array.isArray(children)) {
        return children
          .map((child) => (typeof child === "string" ? child : child?.props?.children || ""))
          .join("")
          .trim();
      }
      if (children?.props?.children) {
        return getButtonText(children.props.children);
      }
      return String(children);
    };

    const buttonText = getButtonText(children);
    const testId = buttonText ? `action-button-${buttonText}` : "action-button";

    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={className}
        data-variant={variant}
        data-testid={testId}
      >
        {children}
      </button>
    );
  },
}));

// Mock Heroicons
jest.mock("@heroicons/react/24/outline", () => ({
  CheckIcon: (props: any) => {
    const { className, ...restProps } = props;
    return <svg data-testid="check-icon" className={className} {...restProps} />;
  },
  XMarkIcon: (props: any) => {
    const { className, ...restProps } = props;
    return <svg data-testid="xmark-icon" className={className} {...restProps} />;
  },
}));

describe("TableStatusActionButtons", () => {
  const defaultProps = {
    applicationId: "app-123",
    currentStatus: "pending" as const,
    onStatusChange: jest.fn(),
    isUpdating: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("TableStatusActionButton Component", () => {
    it("should render button with correct label", () => {
      render(<TableStatusActionButtons {...defaultProps} currentStatus="pending" />);

      expect(screen.getByTestId("action-button-Review")).toBeInTheDocument();
    });

    it("should call onStatusChange with correct parameters when clicked", () => {
      const onStatusChange = jest.fn();
      render(
        <TableStatusActionButtons
          {...defaultProps}
          currentStatus="pending"
          onStatusChange={onStatusChange}
        />
      );

      const reviewButton = screen.getByTestId("action-button-Review");
      fireEvent.click(reviewButton);

      expect(onStatusChange).toHaveBeenCalledWith("app-123", "under_review", expect.any(Object));
    });

    it("should disable button when isUpdating is true", () => {
      render(
        <TableStatusActionButtons {...defaultProps} currentStatus="pending" isUpdating={true} />
      );

      const reviewButton = screen.getByTestId("action-button-Review");
      expect(reviewButton).toBeDisabled();
    });

    it("should render icon when provided", () => {
      render(<TableStatusActionButtons {...defaultProps} currentStatus="under_review" />);

      // CheckIcon should be present for Approve button
      expect(screen.getByTestId("check-icon")).toBeInTheDocument();
      // XMarkIcon should be present for Reject button
      expect(screen.getByTestId("xmark-icon")).toBeInTheDocument();
    });

    it("should apply correct className from transition config", () => {
      render(<TableStatusActionButtons {...defaultProps} currentStatus="pending" />);

      const reviewButton = screen.getByTestId("action-button-Review");
      expect(reviewButton.className).toContain("text-purple-600");
      expect(reviewButton.className).toContain("border-purple-200");
    });
  });

  describe("TableStatusActionButtons Component - Status Transitions", () => {
    describe("pending status", () => {
      it("should render Review button for pending status", () => {
        render(<TableStatusActionButtons {...defaultProps} currentStatus="pending" />);

        expect(screen.getByTestId("action-button-Review")).toBeInTheDocument();
        expect(screen.queryByTestId("action-button-Approve")).not.toBeInTheDocument();
        expect(screen.queryByTestId("action-button-Reject")).not.toBeInTheDocument();
        expect(screen.queryByTestId("action-button-Request Revision")).not.toBeInTheDocument();
      });

      it("should call onStatusChange with under_review when Review clicked", () => {
        const onStatusChange = jest.fn();
        render(
          <TableStatusActionButtons
            {...defaultProps}
            currentStatus="pending"
            onStatusChange={onStatusChange}
          />
        );

        const reviewButton = screen.getByTestId("action-button-Review");
        fireEvent.click(reviewButton);

        expect(onStatusChange).toHaveBeenCalledWith("app-123", "under_review", expect.any(Object));
      });
    });

    describe("under_review status", () => {
      it("should render all three action buttons for under_review status", () => {
        render(<TableStatusActionButtons {...defaultProps} currentStatus="under_review" />);

        expect(screen.getByTestId("action-button-Request Revision")).toBeInTheDocument();
        expect(screen.getByTestId("action-button-Approve")).toBeInTheDocument();
        expect(screen.getByTestId("action-button-Reject")).toBeInTheDocument();
      });

      it("should call onStatusChange with revision_requested when Request Revision clicked", () => {
        const onStatusChange = jest.fn();
        render(
          <TableStatusActionButtons
            {...defaultProps}
            currentStatus="under_review"
            onStatusChange={onStatusChange}
          />
        );

        const revisionButton = screen.getByTestId("action-button-Request Revision");
        fireEvent.click(revisionButton);

        expect(onStatusChange).toHaveBeenCalledWith(
          "app-123",
          "revision_requested",
          expect.any(Object)
        );
      });

      it("should call onStatusChange with approved when Approve clicked", () => {
        const onStatusChange = jest.fn();
        render(
          <TableStatusActionButtons
            {...defaultProps}
            currentStatus="under_review"
            onStatusChange={onStatusChange}
          />
        );

        const approveButton = screen.getByTestId("action-button-Approve");
        fireEvent.click(approveButton);

        expect(onStatusChange).toHaveBeenCalledWith("app-123", "approved", expect.any(Object));
      });

      it("should call onStatusChange with rejected when Reject clicked", () => {
        const onStatusChange = jest.fn();
        render(
          <TableStatusActionButtons
            {...defaultProps}
            currentStatus="under_review"
            onStatusChange={onStatusChange}
          />
        );

        const rejectButton = screen.getByTestId("action-button-Reject");
        fireEvent.click(rejectButton);

        expect(onStatusChange).toHaveBeenCalledWith("app-123", "rejected", expect.any(Object));
      });

      it("should render icons for Approve and Reject buttons", () => {
        render(<TableStatusActionButtons {...defaultProps} currentStatus="under_review" />);

        expect(screen.getByTestId("check-icon")).toBeInTheDocument();
        expect(screen.getByTestId("xmark-icon")).toBeInTheDocument();
      });
    });

    describe("revision_requested status", () => {
      it("should render Review button for revision_requested status", () => {
        render(<TableStatusActionButtons {...defaultProps} currentStatus="revision_requested" />);

        expect(screen.getByTestId("action-button-Review")).toBeInTheDocument();
        expect(screen.queryByTestId("action-button-Approve")).not.toBeInTheDocument();
        expect(screen.queryByTestId("action-button-Reject")).not.toBeInTheDocument();
      });

      it("should call onStatusChange with under_review when Review clicked", () => {
        const onStatusChange = jest.fn();
        render(
          <TableStatusActionButtons
            {...defaultProps}
            currentStatus="revision_requested"
            onStatusChange={onStatusChange}
          />
        );

        const reviewButton = screen.getByTestId("action-button-Review");
        fireEvent.click(reviewButton);

        expect(onStatusChange).toHaveBeenCalledWith("app-123", "under_review", expect.any(Object));
      });
    });

    describe("approved status", () => {
      it("should render nothing for approved status (final state)", () => {
        const { container } = render(
          <TableStatusActionButtons {...defaultProps} currentStatus="approved" />
        );

        expect(container.firstChild).toBeNull();
        expect(screen.queryByTestId("action-button-Review")).not.toBeInTheDocument();
        expect(screen.queryByTestId("action-button-Approve")).not.toBeInTheDocument();
        expect(screen.queryByTestId("action-button-Reject")).not.toBeInTheDocument();
      });
    });

    describe("rejected status", () => {
      it("should render nothing for rejected status (final state)", () => {
        const { container } = render(
          <TableStatusActionButtons {...defaultProps} currentStatus="rejected" />
        );

        expect(container.firstChild).toBeNull();
        expect(screen.queryByTestId("action-button-Review")).not.toBeInTheDocument();
        expect(screen.queryByTestId("action-button-Approve")).not.toBeInTheDocument();
        expect(screen.queryByTestId("action-button-Reject")).not.toBeInTheDocument();
      });
    });
  });

  describe("Status Transition Configuration Validation", () => {
    it("should validate that pending only transitions to under_review", () => {
      render(<TableStatusActionButtons {...defaultProps} currentStatus="pending" />);

      const buttons = screen.queryAllByTestId(/action-button-/);
      expect(buttons).toHaveLength(1);
      expect(buttons[0]).toHaveTextContent("Review");
    });

    it("should validate that under_review has three transition options", () => {
      render(<TableStatusActionButtons {...defaultProps} currentStatus="under_review" />);

      const buttons = screen.queryAllByTestId(/action-button-/);
      expect(buttons).toHaveLength(3);
      expect(buttons.map((b) => b.textContent)).toEqual(
        expect.arrayContaining(["Request Revision", "Approve", "Reject"])
      );
    });

    it("should validate that revision_requested only transitions to under_review", () => {
      render(<TableStatusActionButtons {...defaultProps} currentStatus="revision_requested" />);

      const buttons = screen.queryAllByTestId(/action-button-/);
      expect(buttons).toHaveLength(1);
      expect(buttons[0]).toHaveTextContent("Review");
    });

    it("should validate that approved has no transitions (empty array)", () => {
      const { container } = render(
        <TableStatusActionButtons {...defaultProps} currentStatus="approved" />
      );

      expect(container.firstChild).toBeNull();
    });

    it("should validate that rejected has no transitions (empty array)", () => {
      const { container } = render(
        <TableStatusActionButtons {...defaultProps} currentStatus="rejected" />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe("Button Rendering for Each Status", () => {
    it("should render buttons in a flex container with gap", () => {
      render(<TableStatusActionButtons {...defaultProps} currentStatus="under_review" />);

      const buttons = screen.queryAllByTestId(/action-button-/);
      expect(buttons.length).toBeGreaterThan(0);

      // Check parent container has flex and gap classes
      const parent = buttons[0].parentElement;
      expect(parent?.className).toContain("flex");
      expect(parent?.className).toContain("gap-1");
    });

    it("should render multiple buttons side by side for under_review", () => {
      render(<TableStatusActionButtons {...defaultProps} currentStatus="under_review" />);

      const buttons = screen.queryAllByTestId(/action-button-/);
      expect(buttons).toHaveLength(3);

      // All buttons should be siblings
      const parent = buttons[0].parentElement;
      buttons.forEach((button) => {
        expect(button.parentElement).toBe(parent);
      });
    });
  });

  describe("Click Handlers", () => {
    it("should pass correct event object to onStatusChange", () => {
      const onStatusChange = jest.fn();
      render(
        <TableStatusActionButtons
          {...defaultProps}
          currentStatus="pending"
          onStatusChange={onStatusChange}
        />
      );

      const reviewButton = screen.getByTestId("action-button-Review");
      const mockEvent = { preventDefault: jest.fn() } as any;
      fireEvent.click(reviewButton, mockEvent);

      expect(onStatusChange).toHaveBeenCalled();
      const callArgs = onStatusChange.mock.calls[0];
      expect(callArgs[0]).toBe("app-123");
      expect(callArgs[1]).toBe("under_review");
      expect(callArgs[2]).toBeInstanceOf(Object); // Event object
    });

    it("should handle rapid clicks correctly", () => {
      const onStatusChange = jest.fn();
      render(
        <TableStatusActionButtons
          {...defaultProps}
          currentStatus="under_review"
          onStatusChange={onStatusChange}
        />
      );

      const approveButton = screen.getByTestId("action-button-Approve");
      fireEvent.click(approveButton);
      fireEvent.click(approveButton);
      fireEvent.click(approveButton);

      expect(onStatusChange).toHaveBeenCalledTimes(3);
    });
  });

  describe("Disabled State", () => {
    it("should disable all buttons when isUpdating is true", () => {
      render(
        <TableStatusActionButtons
          {...defaultProps}
          currentStatus="under_review"
          isUpdating={true}
        />
      );

      const buttons = screen.queryAllByTestId(/action-button-/);
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it("should enable buttons when isUpdating is false", () => {
      render(
        <TableStatusActionButtons
          {...defaultProps}
          currentStatus="under_review"
          isUpdating={false}
        />
      );

      const buttons = screen.queryAllByTestId(/action-button-/);
      buttons.forEach((button) => {
        expect(button).not.toBeDisabled();
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle different application IDs", () => {
      const onStatusChange = jest.fn();
      render(
        <TableStatusActionButtons
          applicationId="app-456"
          currentStatus="pending"
          onStatusChange={onStatusChange}
          isUpdating={false}
        />
      );

      const reviewButton = screen.getByTestId("action-button-Review");
      fireEvent.click(reviewButton);

      expect(onStatusChange).toHaveBeenCalledWith("app-456", "under_review", expect.any(Object));
    });

    it("should handle empty transitions array gracefully", () => {
      // This tests the case where TABLE_STATUS_TRANSITIONS[currentStatus] returns undefined
      // The component should handle this by checking availableTransitions.length === 0
      const { container } = render(
        <TableStatusActionButtons {...defaultProps} currentStatus="approved" />
      );

      // Should return null for empty transitions
      expect(container.firstChild).toBeNull();
    });

    it("should handle status not in transitions config", () => {
      // TypeScript would prevent this, but testing runtime behavior
      const { container } = render(
        <TableStatusActionButtons
          {...defaultProps}
          currentStatus={"unknown" as any}
          onStatusChange={jest.fn()}
        />
      );

      // Should return null when no transitions available
      expect(container.firstChild).toBeNull();
    });
  });

  describe("Button Styling", () => {
    it("should apply correct styling to Review button for pending", () => {
      render(<TableStatusActionButtons {...defaultProps} currentStatus="pending" />);

      const reviewButton = screen.getByTestId("action-button-Review");
      expect(reviewButton.className).toContain("text-purple-600");
      expect(reviewButton.className).toContain("border-purple-200");
    });

    it("should apply correct styling to Approve button", () => {
      render(<TableStatusActionButtons {...defaultProps} currentStatus="under_review" />);

      const approveButton = screen.getByTestId("action-button-Approve");
      expect(approveButton.className).toContain("text-green-600");
      expect(approveButton.className).toContain("border-green-200");
      expect(approveButton.className).toContain("flex");
      expect(approveButton.className).toContain("items-center");
      expect(approveButton.className).toContain("gap-1");
    });

    it("should apply correct styling to Reject button", () => {
      render(<TableStatusActionButtons {...defaultProps} currentStatus="under_review" />);

      const rejectButton = screen.getByTestId("action-button-Reject");
      expect(rejectButton.className).toContain("text-red-600");
      expect(rejectButton.className).toContain("border-red-200");
      expect(rejectButton.className).toContain("flex");
      expect(rejectButton.className).toContain("items-center");
      expect(rejectButton.className).toContain("gap-1");
    });

    it("should apply correct styling to Request Revision button", () => {
      render(<TableStatusActionButtons {...defaultProps} currentStatus="under_review" />);

      const revisionButton = screen.getByTestId("action-button-Request Revision");
      expect(revisionButton.className).toContain("border-gray-200");
    });
  });

  describe("Icon Rendering", () => {
    it("should render CheckIcon for Approve button", () => {
      render(<TableStatusActionButtons {...defaultProps} currentStatus="under_review" />);

      const checkIcon = screen.getByTestId("check-icon");
      expect(checkIcon).toBeInTheDocument();
      const className = checkIcon.getAttribute("class") || "";
      expect(className).toContain("w-3");
      expect(className).toContain("h-3");
    });

    it("should render XMarkIcon for Reject button", () => {
      render(<TableStatusActionButtons {...defaultProps} currentStatus="under_review" />);

      const xmarkIcon = screen.getByTestId("xmark-icon");
      expect(xmarkIcon).toBeInTheDocument();
      const className = xmarkIcon.getAttribute("class") || "";
      expect(className).toContain("w-3");
      expect(className).toContain("h-3");
    });

    it("should not render icons for buttons without icon config", () => {
      render(<TableStatusActionButtons {...defaultProps} currentStatus="pending" />);

      expect(screen.queryByTestId("check-icon")).not.toBeInTheDocument();
      expect(screen.queryByTestId("xmark-icon")).not.toBeInTheDocument();
    });
  });
});
