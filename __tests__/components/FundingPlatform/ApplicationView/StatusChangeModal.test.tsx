import { fireEvent, render, screen } from "@testing-library/react";
import StatusChangeModal from "@/components/FundingPlatform/ApplicationView/StatusChangeModal";

// Mock Headless UI Dialog components
jest.mock("@headlessui/react", () => {
  const MockDialog = ({ children, onClose, ...props }: any) => (
    <div data-testid="dialog" data-open={props.show} {...props}>
      {children}
    </div>
  );
  MockDialog.Panel = ({ children, ...props }: any) => (
    <div data-testid="dialog-panel" {...props}>
      {children}
    </div>
  );
  MockDialog.Title = ({ children, as, ...props }: any) => {
    const Component = as || "h3";
    return <Component {...props}>{children}</Component>;
  };

  const MockTransitionRoot = ({ show, children, as }: any) => {
    if (!show) return null;
    const Component = as || "div";
    return <Component>{children}</Component>;
  };

  const MockTransitionChild = ({ children, as }: any) => {
    const Component = as || "div";
    return <Component>{children}</Component>;
  };

  return {
    Dialog: MockDialog,
    Transition: {
      Root: MockTransitionRoot,
      Child: MockTransitionChild,
    },
    Fragment: ({ children }: any) => <>{children}</>,
  };
});

// Mock Heroicons
jest.mock("@heroicons/react/24/outline", () => ({
  XMarkIcon: (props: any) => {
    const { "aria-hidden": ariaHidden, className, ...restProps } = props;
    return (
      <svg
        role="img"
        aria-label="Close"
        aria-hidden={ariaHidden}
        className={className}
        {...restProps}
        data-testid="xmark-icon"
      />
    );
  },
  ExclamationTriangleIcon: (props: any) => {
    const { "aria-hidden": ariaHidden, className, ...restProps } = props;
    return (
      <svg
        role="img"
        aria-hidden={ariaHidden}
        className={className}
        {...restProps}
        data-testid="warning-icon"
      />
    );
  },
}));

// Mock Button component
jest.mock("@/components/Utilities/Button", () => ({
  Button: ({ onClick, disabled, children, className, variant }: any) => {
    const testId =
      children === "Confirm" || children === "Processing..." ? "confirm-button" : "cancel-button";
    return (
      <button
        onClick={disabled ? undefined : onClick}
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

describe("StatusChangeModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    status: "approved",
    isSubmitting: false,
    isReasonRequired: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render modal when isOpen is true", () => {
      render(<StatusChangeModal {...defaultProps} />);

      expect(screen.getByTestId("dialog")).toBeInTheDocument();
      expect(screen.getByText("Approve")).toBeInTheDocument();
    });

    it("should not render modal when isOpen is false", () => {
      render(<StatusChangeModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    });

    it("should display correct label for revision_requested status", () => {
      render(<StatusChangeModal {...defaultProps} status="revision_requested" />);

      expect(screen.getByText("Request Revision")).toBeInTheDocument();
    });

    it("should display correct label for rejected status", () => {
      render(<StatusChangeModal {...defaultProps} status="rejected" />);

      expect(screen.getByText("Reject")).toBeInTheDocument();
    });

    it("should display correct label for pending status", () => {
      render(<StatusChangeModal {...defaultProps} status="pending" />);

      expect(screen.getByText("Set as Pending")).toBeInTheDocument();
    });

    it("should display reason textarea", () => {
      render(<StatusChangeModal {...defaultProps} />);

      const textarea = screen.getByLabelText(/reason/i);
      expect(textarea).toBeInTheDocument();
    });
  });

  describe("Reason Validation - Critical Missing Coverage", () => {
    it("should require reason for revision_requested status (isReasonActuallyRequired)", () => {
      render(<StatusChangeModal {...defaultProps} status="revision_requested" />);

      const confirmButton = screen.getByTestId("confirm-button");
      expect(confirmButton).toBeDisabled();

      const textarea = screen.getByLabelText(/reason/i);
      expect(textarea).toBeInTheDocument();
      // Check for required asterisk in label
      const label = screen.getByText(/reason/i);
      expect(label.textContent).toMatch(/\*/);
    });

    it("should require reason for rejected status (isReasonActuallyRequired)", () => {
      render(<StatusChangeModal {...defaultProps} status="rejected" />);

      const confirmButton = screen.getByTestId("confirm-button");
      expect(confirmButton).toBeDisabled();

      // Find label element specifically - use getByLabelText which is more specific
      const label = screen.getByText(/^Reason/);
      expect(label.textContent).toMatch(/\*/); // Required asterisk
    });

    it("should not require reason for approved status when isReasonRequired is false", () => {
      render(<StatusChangeModal {...defaultProps} status="approved" isReasonRequired={false} />);

      // Fill in required amount and currency fields for approved status
      const amountInput = screen.getByLabelText(/approved amount/i);
      const currencyInput = screen.getByLabelText(/approved currency/i);
      fireEvent.change(amountInput, { target: { value: "1000" } });
      fireEvent.change(currencyInput, { target: { value: "USD" } });

      const confirmButton = screen.getByTestId("confirm-button");
      expect(confirmButton).not.toBeDisabled();

      // Check for optional text in label
      const label = screen.getByText(/^Reason/);
      expect(label.textContent).toMatch(/optional/i);
    });

    it("should require reason when isReasonRequired prop is true", () => {
      render(<StatusChangeModal {...defaultProps} status="approved" isReasonRequired={true} />);

      const confirmButton = screen.getByTestId("confirm-button");
      expect(confirmButton).toBeDisabled();

      // Find label element and check for required asterisk
      const label = screen.getByText(/^Reason/);
      expect(label.textContent).toMatch(/\*/);
    });

    it("should prevent submission with empty reason when required (handleConfirm validation)", () => {
      const onConfirm = jest.fn();
      render(
        <StatusChangeModal {...defaultProps} status="revision_requested" onConfirm={onConfirm} />
      );

      const confirmButton = screen.getByTestId("confirm-button");
      expect(confirmButton).toBeDisabled();

      // Try to click disabled button
      fireEvent.click(confirmButton);

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it("should prevent submission with whitespace-only reason when required", () => {
      const onConfirm = jest.fn();
      render(<StatusChangeModal {...defaultProps} status="rejected" onConfirm={onConfirm} />);

      const textarea = screen.getByLabelText(/reason/i);
      fireEvent.change(textarea, { target: { value: "   " } });

      const confirmButton = screen.getByTestId("confirm-button");
      expect(confirmButton).toBeDisabled();

      fireEvent.click(confirmButton);
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it("should allow submission with valid reason when required", () => {
      const onConfirm = jest.fn();
      render(
        <StatusChangeModal {...defaultProps} status="revision_requested" onConfirm={onConfirm} />
      );

      const textarea = screen.getByLabelText(/reason/i);
      fireEvent.change(textarea, { target: { value: "Please update section 3" } });

      const confirmButton = screen.getByTestId("confirm-button");
      expect(confirmButton).not.toBeDisabled();

      fireEvent.click(confirmButton);
      // For non-approval statuses, amount and currency are undefined
      expect(onConfirm).toHaveBeenCalledWith("Please update section 3", undefined, undefined);
    });

    it("should allow submission without reason when not required", () => {
      const onConfirm = jest.fn();
      render(<StatusChangeModal {...defaultProps} status="approved" onConfirm={onConfirm} />);

      // Fill in required amount and currency fields for approved status
      const amountInput = screen.getByLabelText(/approved amount/i);
      const currencyInput = screen.getByLabelText(/approved currency/i);
      fireEvent.change(amountInput, { target: { value: "1000" } });
      fireEvent.change(currencyInput, { target: { value: "USD" } });

      const confirmButton = screen.getByTestId("confirm-button");
      expect(confirmButton).not.toBeDisabled();
      fireEvent.click(confirmButton);

      expect(onConfirm).toHaveBeenCalledWith(undefined, "1000", "USD");
    });
  });

  describe("Reason Field Reset - Missing Coverage", () => {
    it("should reset reason field on close (handleClose)", () => {
      const { rerender } = render(<StatusChangeModal {...defaultProps} />);

      const textarea = screen.getByLabelText(/reason/i) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "Test reason" } });
      expect(textarea.value).toBe("Test reason");

      // Close modal
      const cancelButton = screen.getByTestId("cancel-button");
      fireEvent.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalled();

      // Reopen modal
      rerender(<StatusChangeModal {...defaultProps} isOpen={true} />);

      const newTextarea = screen.getByLabelText(/reason/i) as HTMLTextAreaElement;
      expect(newTextarea.value).toBe("");
    });

    it("should reset reason field after successful confirmation", () => {
      const onConfirm = jest.fn();
      const { rerender } = render(<StatusChangeModal {...defaultProps} onConfirm={onConfirm} />);

      const textarea = screen.getByLabelText(/reason/i) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "Test reason" } });

      // Fill in required amount and currency fields for approved status
      const amountInput = screen.getByLabelText(/approved amount/i);
      const currencyInput = screen.getByLabelText(/approved currency/i);
      fireEvent.change(amountInput, { target: { value: "1000" } });
      fireEvent.change(currencyInput, { target: { value: "USD" } });

      const confirmButton = screen.getByTestId("confirm-button");
      expect(confirmButton).not.toBeDisabled();
      fireEvent.click(confirmButton);

      expect(onConfirm).toHaveBeenCalled();

      // After confirmation, reason should be reset (component resets state)
      // This tests the setReason("") call in handleConfirm
      rerender(<StatusChangeModal {...defaultProps} isOpen={true} />);
      const newTextarea = screen.getByLabelText(/reason/i) as HTMLTextAreaElement;
      expect(newTextarea.value).toBe("");
    });
  });

  describe("Submission State Handling - Missing Coverage", () => {
    it("should disable close when isSubmitting is true (handleClose check)", () => {
      const onClose = jest.fn();
      render(<StatusChangeModal {...defaultProps} onClose={onClose} isSubmitting={true} />);

      const cancelButtons = screen.getAllByTestId("cancel-button");
      expect(cancelButtons.length).toBeGreaterThan(0);
      cancelButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });

      // Try clicking close icon
      const closeIcon = screen.getByTestId("xmark-icon");
      const closeButton = closeIcon.closest("button");
      if (closeButton) {
        expect(closeButton).toBeDisabled();
      }
    });

    it("should prevent close during submission", () => {
      const onClose = jest.fn();
      render(<StatusChangeModal {...defaultProps} onClose={onClose} isSubmitting={true} />);

      const cancelButtons = screen.getAllByTestId("cancel-button");
      // Click the actual Cancel button (not the Processing... button)
      const cancelButton = cancelButtons.find((btn) => btn.textContent === "Cancel");
      if (cancelButton) {
        fireEvent.click(cancelButton);
      }

      // onClose should not be called when submitting
      expect(onClose).not.toHaveBeenCalled();
    });

    it('should show "Processing..." text when isSubmitting is true', () => {
      render(<StatusChangeModal {...defaultProps} isSubmitting={true} />);

      expect(screen.getByText("Processing...")).toBeInTheDocument();
      expect(screen.queryByText("Confirm")).not.toBeInTheDocument();
    });

    it("should disable confirm button when isSubmitting is true", () => {
      render(<StatusChangeModal {...defaultProps} isSubmitting={true} />);

      const confirmButton = screen.getByTestId("confirm-button");
      expect(confirmButton).toBeDisabled();
    });

    it("should disable textarea when isSubmitting is true", () => {
      render(<StatusChangeModal {...defaultProps} isSubmitting={true} />);

      const textarea = screen.getByLabelText(/reason/i);
      expect(textarea).toBeDisabled();
    });
  });

  describe("Status-specific Behavior", () => {
    it("should show correct placeholder for revision_requested", () => {
      render(<StatusChangeModal {...defaultProps} status="revision_requested" />);

      const textarea = screen.getByLabelText(/reason/i);
      expect(textarea).toHaveAttribute("placeholder", "Explain what needs to be revised...");
    });

    it("should show correct placeholder for rejected", () => {
      render(<StatusChangeModal {...defaultProps} status="rejected" />);

      const textarea = screen.getByLabelText(/reason/i);
      expect(textarea).toHaveAttribute("placeholder", "Explain why the application is rejected...");
    });

    it("should show correct placeholder for other statuses", () => {
      render(<StatusChangeModal {...defaultProps} status="approved" />);

      const textarea = screen.getByLabelText(/reason/i);
      expect(textarea).toHaveAttribute("placeholder", "Add any notes about this decision...");
    });

    it("should show correct help text for revision_requested", () => {
      render(<StatusChangeModal {...defaultProps} status="revision_requested" />);

      expect(
        screen.getByText(/the applicant will see this message and can update their application/i)
      ).toBeInTheDocument();
    });

    it("should show correct help text for rejected", () => {
      render(<StatusChangeModal {...defaultProps} status="rejected" />);

      expect(
        screen.getByText(/this reason will be recorded and may be shared with the applicant/i)
      ).toBeInTheDocument();
    });

    it("should show correct help text for other statuses", () => {
      render(<StatusChangeModal {...defaultProps} status="approved" />);

      expect(
        screen.getByText(/this reason will be recorded in the status history/i)
      ).toBeInTheDocument();
    });

    it("should apply correct button styling for approved status", () => {
      render(<StatusChangeModal {...defaultProps} status="approved" />);

      const confirmButton = screen.getByTestId("confirm-button");
      expect(confirmButton.className).toContain("bg-green-600");
    });

    it("should apply correct button styling for rejected status", () => {
      render(<StatusChangeModal {...defaultProps} status="rejected" />);

      const confirmButton = screen.getByTestId("confirm-button");
      expect(confirmButton.className).toContain("bg-red-600");
    });
  });

  describe("User Interactions", () => {
    it("should call onConfirm with reason when provided", () => {
      const onConfirm = jest.fn();
      render(<StatusChangeModal {...defaultProps} onConfirm={onConfirm} />);

      const textarea = screen.getByLabelText(/reason/i);
      fireEvent.change(textarea, { target: { value: "Approved because it meets criteria" } });

      // Fill in required amount and currency fields for approved status
      const amountInput = screen.getByLabelText(/approved amount/i);
      const currencyInput = screen.getByLabelText(/approved currency/i);
      fireEvent.change(amountInput, { target: { value: "1000" } });
      fireEvent.change(currencyInput, { target: { value: "USD" } });

      const confirmButton = screen.getByTestId("confirm-button");
      expect(confirmButton).not.toBeDisabled();
      fireEvent.click(confirmButton);

      expect(onConfirm).toHaveBeenCalledWith("Approved because it meets criteria", "1000", "USD");
    });

    it("should call onConfirm with undefined when reason not provided and not required", () => {
      const onConfirm = jest.fn();
      render(<StatusChangeModal {...defaultProps} onConfirm={onConfirm} />);

      // Fill in required amount and currency fields for approved status
      const amountInput = screen.getByLabelText(/approved amount/i);
      const currencyInput = screen.getByLabelText(/approved currency/i);
      fireEvent.change(amountInput, { target: { value: "1000" } });
      fireEvent.change(currencyInput, { target: { value: "USD" } });

      const confirmButton = screen.getByTestId("confirm-button");
      expect(confirmButton).not.toBeDisabled();
      fireEvent.click(confirmButton);

      expect(onConfirm).toHaveBeenCalledWith(undefined, "1000", "USD");
    });

    it("should call onClose when cancel button is clicked", () => {
      const onClose = jest.fn();
      render(<StatusChangeModal {...defaultProps} onClose={onClose} />);

      const cancelButtons = screen.getAllByTestId("cancel-button");
      const cancelButton = cancelButtons.find((btn) => btn.textContent === "Cancel");
      if (cancelButton) {
        onClose.mockClear();
        fireEvent.click(cancelButton);
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    });

    it("should call onClose when close icon is clicked", () => {
      const onClose = jest.fn();
      render(<StatusChangeModal {...defaultProps} onClose={onClose} />);

      const closeIcon = screen.getByTestId("xmark-icon");
      const closeButton = closeIcon.closest("button");
      if (closeButton) {
        // Clear any previous calls from setup
        onClose.mockClear();
        fireEvent.click(closeButton);
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe("Icon Colors by Status", () => {
    it("should show green icon for approved status", () => {
      const { container } = render(<StatusChangeModal {...defaultProps} status="approved" />);

      const icon = screen.getByTestId("warning-icon");
      // Check that icon has green color class
      expect(icon.getAttribute("class")).toContain("text-green-600");
    });

    it("should show red icon for rejected status", () => {
      render(<StatusChangeModal {...defaultProps} status="rejected" />);

      const icon = screen.getByTestId("warning-icon");
      expect(icon.getAttribute("class")).toContain("text-red-600");
    });

    it("should show yellow icon for other statuses", () => {
      render(<StatusChangeModal {...defaultProps} status="revision_requested" />);

      const icon = screen.getByTestId("warning-icon");
      expect(icon.getAttribute("class")).toContain("text-yellow-600");
    });
  });

  describe("Edge Cases", () => {
    it("should handle unknown status gracefully", () => {
      render(<StatusChangeModal {...defaultProps} status="unknown_status" />);

      expect(screen.getByText("Change Status")).toBeInTheDocument();
      expect(screen.getByText("Change the status of this application.")).toBeInTheDocument();
    });

    it("should handle very long reason text", () => {
      const longReason = "A".repeat(1000);
      const onConfirm = jest.fn();
      render(<StatusChangeModal {...defaultProps} onConfirm={onConfirm} />);

      const textarea = screen.getByLabelText(/reason/i);
      fireEvent.change(textarea, { target: { value: longReason } });

      // Fill in required amount and currency fields for approved status
      const amountInput = screen.getByLabelText(/approved amount/i);
      const currencyInput = screen.getByLabelText(/approved currency/i);
      fireEvent.change(amountInput, { target: { value: "1000" } });
      fireEvent.change(currencyInput, { target: { value: "USD" } });

      const confirmButton = screen.getByTestId("confirm-button");
      expect(confirmButton).not.toBeDisabled();
      fireEvent.click(confirmButton);

      expect(onConfirm).toHaveBeenCalledWith(longReason, "1000", "USD");
    });

    it("should handle special characters in reason", () => {
      const specialReason = 'Reason with <script>alert("xss")</script> & special chars';
      const onConfirm = jest.fn();
      render(<StatusChangeModal {...defaultProps} onConfirm={onConfirm} />);

      const textarea = screen.getByLabelText(/reason/i);
      fireEvent.change(textarea, { target: { value: specialReason } });

      // Fill in required amount and currency fields for approved status
      const amountInput = screen.getByLabelText(/approved amount/i);
      const currencyInput = screen.getByLabelText(/approved currency/i);
      fireEvent.change(amountInput, { target: { value: "1000" } });
      fireEvent.change(currencyInput, { target: { value: "USD" } });

      const confirmButton = screen.getByTestId("confirm-button");
      expect(confirmButton).not.toBeDisabled();
      fireEvent.click(confirmButton);

      expect(onConfirm).toHaveBeenCalledWith(specialReason, "1000", "USD");
    });
  });
});
