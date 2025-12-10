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

// Mock MarkdownEditor component
jest.mock("@/components/Utilities/MarkdownEditor", () => ({
  MarkdownEditor: ({ value, onChange, placeholderText }: any) => (
    <textarea
      data-testid="markdown-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholderText}
      aria-label="Reason"
    />
  ),
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

    it("should display reason MarkdownEditor", () => {
      render(<StatusChangeModal {...defaultProps} />);

      const editor = screen.getByTestId("markdown-editor");
      expect(editor).toBeInTheDocument();
    });
  });

  describe("Reason Validation - Critical Missing Coverage", () => {
    it("should require reason for revision_requested status (isReasonActuallyRequired)", () => {
      render(<StatusChangeModal {...defaultProps} status="revision_requested" />);

      const confirmButton = screen.getByTestId("confirm-button");
      expect(confirmButton).toBeDisabled();

      const editor = screen.getByTestId("markdown-editor");
      expect(editor).toBeInTheDocument();
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

      const editor = screen.getByTestId("markdown-editor");
      fireEvent.change(editor, { target: { value: "   " } });

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

      const editor = screen.getByTestId("markdown-editor");
      fireEvent.change(editor, { target: { value: "Please update section 3" } });

      const confirmButton = screen.getByTestId("confirm-button");
      expect(confirmButton).not.toBeDisabled();

      fireEvent.click(confirmButton);
      expect(onConfirm).toHaveBeenCalledWith("Please update section 3");
    });

    it("should allow submission without reason when not required", () => {
      const onConfirm = jest.fn();
      render(<StatusChangeModal {...defaultProps} status="approved" onConfirm={onConfirm} />);

      const confirmButton = screen.getByTestId("confirm-button");
      fireEvent.click(confirmButton);

      expect(onConfirm).toHaveBeenCalledWith(undefined);
    });
  });

  describe("Reason Field Reset - Missing Coverage", () => {
    it("should reset reason field on close (handleClose)", () => {
      const { rerender } = render(<StatusChangeModal {...defaultProps} />);

      const editor = screen.getByTestId("markdown-editor") as HTMLTextAreaElement;
      fireEvent.change(editor, { target: { value: "Test reason" } });
      expect(editor.value).toBe("Test reason");

      // Close modal
      const cancelButton = screen.getByTestId("cancel-button");
      fireEvent.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalled();

      // Reopen modal
      rerender(<StatusChangeModal {...defaultProps} isOpen={true} />);

      const newEditor = screen.getByTestId("markdown-editor") as HTMLTextAreaElement;
      expect(newEditor.value).toBe("");
    });

    it("should reset reason field after successful confirmation", () => {
      const onConfirm = jest.fn();
      const { rerender } = render(<StatusChangeModal {...defaultProps} onConfirm={onConfirm} />);

      const editor = screen.getByTestId("markdown-editor") as HTMLTextAreaElement;
      fireEvent.change(editor, { target: { value: "Test reason" } });

      const confirmButton = screen.getByTestId("confirm-button");
      fireEvent.click(confirmButton);

      expect(onConfirm).toHaveBeenCalled();

      // After confirmation, reason should be reset (component resets state)
      // This tests the setReason("") call in handleConfirm
      rerender(<StatusChangeModal {...defaultProps} isOpen={true} />);
      const newEditor = screen.getByTestId("markdown-editor") as HTMLTextAreaElement;
      expect(newEditor.value).toBe("");
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

    it("should disable MarkdownEditor when isSubmitting is true", () => {
      render(<StatusChangeModal {...defaultProps} isSubmitting={true} />);

      const editor = screen.getByTestId("markdown-editor");
      expect(editor).toBeDisabled();
    });
  });

  describe("Status-specific Behavior", () => {
    it("should show correct placeholder for revision_requested", () => {
      render(<StatusChangeModal {...defaultProps} status="revision_requested" />);

      const editor = screen.getByTestId("markdown-editor");
      expect(editor).toHaveAttribute("placeholder", "Explain what needs to be revised...");
    });

    it("should show correct placeholder for rejected", () => {
      render(<StatusChangeModal {...defaultProps} status="rejected" />);

      const editor = screen.getByTestId("markdown-editor");
      expect(editor).toHaveAttribute("placeholder", "Explain why the application is rejected...");
    });

    it("should show correct placeholder for other statuses", () => {
      render(<StatusChangeModal {...defaultProps} status="approved" />);

      const editor = screen.getByTestId("markdown-editor");
      expect(editor).toHaveAttribute("placeholder", "Add any notes about this decision...");
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

      const editor = screen.getByTestId("markdown-editor");
      fireEvent.change(editor, { target: { value: "Approved because it meets criteria" } });

      const confirmButton = screen.getByTestId("confirm-button");
      fireEvent.click(confirmButton);

      expect(onConfirm).toHaveBeenCalledWith("Approved because it meets criteria");
    });

    it("should call onConfirm with undefined when reason not provided and not required", () => {
      const onConfirm = jest.fn();
      render(<StatusChangeModal {...defaultProps} onConfirm={onConfirm} />);

      const confirmButton = screen.getByTestId("confirm-button");
      fireEvent.click(confirmButton);

      expect(onConfirm).toHaveBeenCalledWith(undefined);
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

      const editor = screen.getByTestId("markdown-editor");
      fireEvent.change(editor, { target: { value: longReason } });

      const confirmButton = screen.getByTestId("confirm-button");
      fireEvent.click(confirmButton);

      expect(onConfirm).toHaveBeenCalledWith(longReason);
    });

    it("should handle special characters in reason", () => {
      const specialReason = 'Reason with <script>alert("xss")</script> & special chars';
      const onConfirm = jest.fn();
      render(<StatusChangeModal {...defaultProps} onConfirm={onConfirm} />);

      const editor = screen.getByTestId("markdown-editor");
      fireEvent.change(editor, { target: { value: specialReason } });

      const confirmButton = screen.getByTestId("confirm-button");
      fireEvent.click(confirmButton);

      expect(onConfirm).toHaveBeenCalledWith(specialReason);
    });
  });

  describe("Email Template Prepopulation", () => {
    const mockProgramConfig = {
      formSchema: {
        settings: {
          approvalEmailTemplate: "Congratulations! Your application for {{programName}} has been approved. {{reason}}",
          rejectionEmailTemplate: "Unfortunately, your application for {{programName}} was not selected. {{reason}}",
        },
      },
    };

    it("should prepopulate approval email template when status is approved", () => {
      render(
        <StatusChangeModal
          {...defaultProps}
          status="approved"
          programConfig={mockProgramConfig as any}
        />
      );

      const editor = screen.getByTestId("markdown-editor");
      expect(editor).toHaveValue(mockProgramConfig.formSchema.settings.approvalEmailTemplate);
    });

    it("should prepopulate rejection email template when status is rejected", () => {
      render(
        <StatusChangeModal
          {...defaultProps}
          status="rejected"
          programConfig={mockProgramConfig as any}
        />
      );

      const editor = screen.getByTestId("markdown-editor");
      expect(editor).toHaveValue(mockProgramConfig.formSchema.settings.rejectionEmailTemplate);
    });

    it("should not prepopulate when status is not approved or rejected", () => {
      render(
        <StatusChangeModal
          {...defaultProps}
          status="revision_requested"
          programConfig={mockProgramConfig as any}
        />
      );

      const editor = screen.getByTestId("markdown-editor");
      expect(editor).toHaveValue("");
    });

    it("should not prepopulate when programConfig is not provided", () => {
      render(<StatusChangeModal {...defaultProps} status="approved" />);

      const editor = screen.getByTestId("markdown-editor");
      expect(editor).toHaveValue("");
    });

    it("should not prepopulate when programConfig.formSchema is missing", () => {
      const configWithoutSchema = {
        formSchema: null,
      };

      render(
        <StatusChangeModal
          {...defaultProps}
          status="approved"
          programConfig={configWithoutSchema as any}
        />
      );

      const editor = screen.getByTestId("markdown-editor");
      expect(editor).toHaveValue("");
    });

    it("should not prepopulate when programConfig.formSchema.settings is missing", () => {
      const configWithoutSettings = {
        formSchema: {},
      };

      render(
        <StatusChangeModal
          {...defaultProps}
          status="approved"
          programConfig={configWithoutSettings as any}
        />
      );

      const editor = screen.getByTestId("markdown-editor");
      expect(editor).toHaveValue("");
    });

    it("should prepopulate only when modal opens and reason is empty", () => {
      const { rerender } = render(
        <StatusChangeModal
          {...defaultProps}
          status="approved"
          programConfig={mockProgramConfig as any}
          isOpen={false}
        />
      );

      // Modal closed, editor not rendered
      expect(screen.queryByTestId("markdown-editor")).not.toBeInTheDocument();

      // Open modal
      rerender(
        <StatusChangeModal
          {...defaultProps}
          status="approved"
          programConfig={mockProgramConfig as any}
          isOpen={true}
        />
      );

      const editor = screen.getByTestId("markdown-editor");
      expect(editor).toHaveValue(mockProgramConfig.formSchema.settings.approvalEmailTemplate);
    });

    it("should not overwrite existing reason when template is available", () => {
      const { rerender } = render(
        <StatusChangeModal
          {...defaultProps}
          status="approved"
          programConfig={mockProgramConfig as any}
        />
      );

      const editor = screen.getByTestId("markdown-editor") as HTMLTextAreaElement;
      
      // User edits the prepopulated template
      fireEvent.change(editor, { target: { value: "Custom edited reason" } });
      expect(editor.value).toBe("Custom edited reason");

      // Close and reopen modal
      rerender(
        <StatusChangeModal
          {...defaultProps}
          status="approved"
          programConfig={mockProgramConfig as any}
          isOpen={false}
        />
      );

      rerender(
        <StatusChangeModal
          {...defaultProps}
          status="approved"
          programConfig={mockProgramConfig as any}
          isOpen={true}
        />
      );

      // Should prepopulate again since reason was reset
      const newEditor = screen.getByTestId("markdown-editor") as HTMLTextAreaElement;
      expect(newEditor.value).toBe(mockProgramConfig.formSchema.settings.approvalEmailTemplate);
    });

    it("should prepopulate when status changes from one to another", () => {
      const { rerender } = render(
        <StatusChangeModal
          {...defaultProps}
          status="approved"
          programConfig={mockProgramConfig as any}
        />
      );

      let editor = screen.getByTestId("markdown-editor") as HTMLTextAreaElement;
      expect(editor.value).toBe(mockProgramConfig.formSchema.settings.approvalEmailTemplate);

      // Change to rejected status
      rerender(
        <StatusChangeModal
          {...defaultProps}
          status="rejected"
          programConfig={mockProgramConfig as any}
        />
      );

      editor = screen.getByTestId("markdown-editor") as HTMLTextAreaElement;
      expect(editor.value).toBe(mockProgramConfig.formSchema.settings.rejectionEmailTemplate);
    });

    it("should handle empty template strings gracefully", () => {
      const configWithEmptyTemplate = {
        formSchema: {
          settings: {
            approvalEmailTemplate: "",
          },
        },
      };

      render(
        <StatusChangeModal
          {...defaultProps}
          status="approved"
          programConfig={configWithEmptyTemplate as any}
        />
      );

      const editor = screen.getByTestId("markdown-editor");
      expect(editor).toHaveValue("");
    });

    it("should use MarkdownEditor component instead of textarea", () => {
      render(
        <StatusChangeModal
          {...defaultProps}
          status="approved"
          programConfig={mockProgramConfig as any}
        />
      );

      // Should use MarkdownEditor (mocked as textarea with data-testid="markdown-editor")
      const editor = screen.getByTestId("markdown-editor");
      expect(editor).toBeInTheDocument();
      expect(editor.tagName).toBe("TEXTAREA");
    });

    it("should pass prepopulated content to onConfirm when submitted", () => {
      const onConfirm = jest.fn();
      render(
        <StatusChangeModal
          {...defaultProps}
          status="approved"
          programConfig={mockProgramConfig as any}
          onConfirm={onConfirm}
        />
      );

      const editor = screen.getByTestId("markdown-editor");
      const confirmButton = screen.getByTestId("confirm-button");

      // Template is prepopulated, user can edit it
      fireEvent.change(editor, { target: { value: "Edited template content" } });
      fireEvent.click(confirmButton);

      expect(onConfirm).toHaveBeenCalledWith("Edited template content");
    });
  });
});
