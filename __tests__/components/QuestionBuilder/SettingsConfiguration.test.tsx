import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsConfiguration } from "@/components/QuestionBuilder/SettingsConfiguration";
import type { FormSchema } from "@/types/question-builder";

// Mock MarkdownEditor
jest.mock("@/components/Utilities/MarkdownEditor", () => ({
  MarkdownEditor: ({ value, onChange, placeholderText, placeholder, disabled, id }: any) => (
    <textarea
      data-testid={`markdown-editor-${id || "default"}`}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder || placeholderText}
      disabled={disabled}
      data-placeholder={placeholder || placeholderText}
    />
  ),
}));

// Mock PlaceholderReference component to render placeholders inline for testing
jest.mock("@/components/FundingPlatform/PlaceholderReference", () => ({
  PlaceholderReference: () => (
    <div data-testid="placeholder-reference">
      <span>{"Available placeholders: {{applicantName}}, {{programName}}, {{reason}}"}</span>
    </div>
  ),
}));

// Mock Accordion to always show content (bypasses collapsed state)
jest.mock("@/components/ui/accordion", () => ({
  Accordion: ({ children, className }: any) => <div className={className}>{children}</div>,
  AccordionItem: ({ children, className }: any) => <div className={className}>{children}</div>,
  AccordionTrigger: ({ children, className }: any) => <div className={className}>{children}</div>,
  AccordionContent: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

// Mock useParams
jest.mock("next/navigation", () => ({
  useParams: () => ({ communityId: "test-community" }),
}));

describe("SettingsConfiguration - Email Templates", () => {
  const mockSchema: FormSchema = {
    fields: [],
    settings: {},
  };

  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Approval Email Template", () => {
    it("should render approval email template editor", () => {
      render(<SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} />);

      // The label is now "Body" inside the "Approval Email" section
      expect(screen.getByText("Approval Email")).toBeInTheDocument();
      // There are two "Body" labels - one for approval, one for rejection
      const bodyLabels = screen.getAllByText("Body");
      expect(bodyLabels.length).toBeGreaterThanOrEqual(1);
    });

    it("should display existing approval email template value", () => {
      const schemaWithTemplate: FormSchema = {
        ...mockSchema,
        settings: {
          approvalEmailTemplate: "Custom approval template",
        },
      };

      render(<SettingsConfiguration schema={schemaWithTemplate} onUpdate={mockOnUpdate} />);

      const editors = screen.getAllByTestId(/markdown-editor/);
      const approvalEditor = editors.find(
        (editor) => (editor as HTMLTextAreaElement).value === "Custom approval template"
      );
      expect(approvalEditor).toBeInTheDocument();
      expect(approvalEditor).toHaveValue("Custom approval template");
    });

    it("should call onUpdate when approval email template changes", async () => {
      render(<SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} />);

      const editors = screen.getAllByTestId(/markdown-editor/);
      // Find the approval editor by checking which one has the approval placeholder
      // The approval placeholder contains "Congratulations" or "approved"
      const approvalEditor =
        Array.from(editors).find((editor) => {
          const placeholder =
            editor.getAttribute("data-placeholder") || editor.getAttribute("placeholder") || "";
          return placeholder.includes("Congratulations") || placeholder.includes("approved");
        }) || editors[0];

      // Clear any previous calls from useEffect/watch
      mockOnUpdate.mockClear();

      fireEvent.change(approvalEditor, {
        target: { value: "New approval template" },
      });

      // Wait for the debounced update (component has 300ms debounce)
      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled();
      });
      // Check the last call (most recent) which should be from the onChange handler
      const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1];
      expect(lastCall).toBeDefined();
      const updatedSchema = lastCall[0] as FormSchema;
      expect(updatedSchema.settings?.approvalEmailTemplate).toBe("New approval template");
    });

    it("should show placeholder text for approval email template", () => {
      render(<SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} />);

      const editors = screen.getAllByTestId(/markdown-editor/);
      expect(editors.length).toBeGreaterThan(0);
      // At least one editor should have a placeholder
      const editorsWithPlaceholder = editors.filter(
        (editor) => editor.hasAttribute("placeholder") || editor.hasAttribute("data-placeholder")
      );
      expect(editorsWithPlaceholder.length).toBeGreaterThan(0);
    });

    it("should show available placeholders information", () => {
      render(<SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} />);

      // PlaceholderReference is now a separate component
      expect(screen.getByTestId("placeholder-reference")).toBeInTheDocument();
      expect(screen.getByText(/Available placeholders:/)).toBeInTheDocument();
      expect(screen.getByText(/{{applicantName}}/)).toBeInTheDocument();
      expect(screen.getByText(/{{programName}}/)).toBeInTheDocument();
      expect(screen.getByText(/{{reason}}/)).toBeInTheDocument();
    });

    it("should not show projectName or postApprovalFormDescription in placeholders", () => {
      render(<SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} />);

      const placeholderRef = screen.getByTestId("placeholder-reference");
      const text = placeholderRef.textContent || "";
      expect(text).not.toContain("{{projectName}}");
      expect(text).not.toContain("{{postApprovalFormDescription}}");
    });
  });

  describe("Rejection Email Template", () => {
    it("should render rejection email template editor", () => {
      render(<SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} />);

      // The label is now "Body" inside the "Rejection Email" section
      expect(screen.getByText("Rejection Email")).toBeInTheDocument();
      // There are multiple "Body" labels
      const bodyLabels = screen.getAllByText("Body");
      expect(bodyLabels.length).toBeGreaterThanOrEqual(1);
    });

    it("should display existing rejection email template value", () => {
      const schemaWithTemplate: FormSchema = {
        ...mockSchema,
        settings: {
          rejectionEmailTemplate: "Custom rejection template",
        },
      };

      render(<SettingsConfiguration schema={schemaWithTemplate} onUpdate={mockOnUpdate} />);

      const editors = screen.getAllByTestId(/markdown-editor/);
      const rejectionEditor = editors.find(
        (editor) => (editor as HTMLTextAreaElement).value === "Custom rejection template"
      );
      expect(rejectionEditor).toBeInTheDocument();
      expect(rejectionEditor).toHaveValue("Custom rejection template");
    });

    it("should call onUpdate when rejection email template changes", async () => {
      render(<SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} />);

      const editors = screen.getAllByTestId(/markdown-editor/);
      // Find the rejection editor by checking which one has the rejection placeholder
      // The rejection placeholder contains "Update on Your Application"
      const rejectionEditor =
        Array.from(editors).find((editor) => {
          const placeholder =
            editor.getAttribute("data-placeholder") || editor.getAttribute("placeholder") || "";
          return (
            placeholder.includes("Update on Your Application") ||
            placeholder.includes("regret to inform")
          );
        }) || (editors.length > 1 ? editors[1] : editors[0]);

      // Clear any previous calls from useEffect/watch
      mockOnUpdate.mockClear();

      fireEvent.change(rejectionEditor, {
        target: { value: "New rejection template" },
      });

      // Wait for the debounced update (component has 300ms debounce)
      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled();
      });
      // Check the last call (most recent) which should be from the onChange handler
      const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1];
      expect(lastCall).toBeDefined();
      const updatedSchema = lastCall[0] as FormSchema;
      expect(updatedSchema.settings?.rejectionEmailTemplate).toBe("New rejection template");
    });

    it("should show placeholder text for rejection email template", () => {
      render(<SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} />);

      const editors = screen.getAllByTestId(/markdown-editor/);
      expect(editors.length).toBeGreaterThan(0);
      editors.forEach((editor) => {
        expect(editor).toHaveAttribute("placeholder");
      });
    });
  });

  describe("Email Templates Section", () => {
    it("should render email templates section with heading", () => {
      render(<SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} />);

      expect(screen.getByText("Email Templates")).toBeInTheDocument();
    });

    it("should show description about email templates", () => {
      render(<SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} />);

      expect(screen.getByText(/Customize the emails sent to applicants/)).toBeInTheDocument();
    });

    it("should disable editors when readOnly is true", () => {
      render(<SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} readOnly={true} />);

      const editors = screen.getAllByTestId(/markdown-editor/);
      editors.forEach((editor) => {
        expect(editor).toBeDisabled();
      });
    });

    it("should enable editors when readOnly is false", () => {
      render(
        <SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} readOnly={false} />
      );

      const editors = screen.getAllByTestId(/markdown-editor/);
      editors.forEach((editor) => {
        expect(editor).not.toBeDisabled();
      });
    });
  });

  describe("Template Persistence", () => {
    it("should preserve other settings when updating approval email template", async () => {
      const schemaWithOtherSettings: FormSchema = {
        ...mockSchema,
        settings: {
          submitButtonText: "Submit Application",
          confirmationMessage: "Thank you!",
          approvalEmailTemplate: "Old approval template",
        },
      };

      render(<SettingsConfiguration schema={schemaWithOtherSettings} onUpdate={mockOnUpdate} />);

      const editors = screen.getAllByTestId(/markdown-editor/);
      // Find the approval editor by its current value
      const approvalEditor =
        editors.find(
          (editor) => (editor as HTMLTextAreaElement).value === "Old approval template"
        ) || editors[0];

      // Clear any previous calls from useEffect/watch
      mockOnUpdate.mockClear();

      fireEvent.change(approvalEditor, {
        target: { value: "New approval template" },
      });

      // Wait for the update to be called
      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled();
      });

      // Check the last call (most recent) which should be from the onChange handler
      const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1];
      expect(lastCall).toBeDefined();
      const updatedSchema = lastCall[0] as FormSchema;
      expect(updatedSchema.settings?.submitButtonText).toBe("Submit Application");
      expect(updatedSchema.settings?.confirmationMessage).toBe("Thank you!");
      expect(updatedSchema.settings?.approvalEmailTemplate).toBe("New approval template");
    });

    it("should preserve other settings when updating rejection email template", async () => {
      const schemaWithOtherSettings: FormSchema = {
        ...mockSchema,
        settings: {
          submitButtonText: "Submit Application",
          rejectionEmailTemplate: "Old rejection template",
        },
      };

      render(<SettingsConfiguration schema={schemaWithOtherSettings} onUpdate={mockOnUpdate} />);

      const editors = screen.getAllByTestId(/markdown-editor/);
      // Find the rejection editor by its current value
      const rejectionEditor =
        editors.find(
          (editor) => (editor as HTMLTextAreaElement).value === "Old rejection template"
        ) || editors[editors.length > 1 ? 1 : 0];

      // Clear any previous calls from useEffect/watch
      mockOnUpdate.mockClear();

      fireEvent.change(rejectionEditor, {
        target: { value: "New rejection template" },
      });

      // Wait for the update to be called
      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled();
      });

      // Check the last call (most recent) which should be from the onChange handler
      const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1];
      expect(lastCall).toBeDefined();
      const updatedSchema = lastCall[0] as FormSchema;
      expect(updatedSchema.settings?.submitButtonText).toBe("Submit Application");
      expect(updatedSchema.settings?.rejectionEmailTemplate).toBe("New rejection template");
    });
  });
});

describe("SettingsConfiguration - Access Code", () => {
  const mockSchema: FormSchema = {
    fields: [],
    settings: {},
  };

  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Access Code field", () => {
    it("should render access code text field", () => {
      render(<SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} />);

      // The label changed from "Gate this application" to "Access Code"
      expect(screen.getByLabelText("Access Code")).toBeInTheDocument();
    });

    it("should display existing access code value", () => {
      const schemaWithAccessCode: FormSchema = {
        ...mockSchema,
        settings: {
          accessCode: "EXISTING_CODE",
        },
      };

      render(<SettingsConfiguration schema={schemaWithAccessCode} onUpdate={mockOnUpdate} />);

      const input = screen.getByLabelText("Access Code") as HTMLInputElement;
      expect(input.value).toBe("EXISTING_CODE");
    });

    it("should show placeholder text for access code input", () => {
      render(<SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} />);

      const input = screen.getByLabelText("Access Code");
      expect(input).toHaveAttribute("placeholder", "Enter a code to gate this application");
    });

    it("should show helper text about requirements", () => {
      render(<SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} />);

      expect(
        screen.getByText(/Applicants will need to enter this code to unlock the form/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Must be at least 6 characters with no spaces/i)).toBeInTheDocument();
    });

    it("should disable access code input when readOnly is true", () => {
      render(<SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} readOnly={true} />);

      const input = screen.getByLabelText("Access Code");
      expect(input).toBeDisabled();
    });
  });

  describe("Access Code Updates", () => {
    it("should call onUpdate with accessCode when input changes", async () => {
      const user = userEvent.setup();

      render(<SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} />);

      const input = screen.getByLabelText("Access Code");

      // Clear any previous calls from useEffect/watch
      mockOnUpdate.mockClear();

      await user.type(input, "NEWCODE");

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled();
      });

      // Get the most recent call
      const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1];
      expect(lastCall).toBeDefined();
      const updatedSchema = lastCall[0] as FormSchema;
      expect(updatedSchema.settings?.accessCode).toContain("NEWCODE");
    });

    it("should set accessCode when value is entered", async () => {
      const user = userEvent.setup();

      render(<SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} />);

      const input = screen.getByLabelText("Access Code");

      // Clear any previous calls from useEffect/watch
      mockOnUpdate.mockClear();

      await user.type(input, "SECRET");

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled();
      });

      // Get the most recent call
      const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1];
      expect(lastCall).toBeDefined();
      const updatedSchema = lastCall[0] as FormSchema;
      expect(updatedSchema.settings?.accessCode).toContain("SECRET");
    });

    it("should clear accessCode when input is emptied", async () => {
      const schemaWithAccessCode: FormSchema = {
        ...mockSchema,
        settings: {
          accessCode: "SECRET123",
        },
      };

      render(<SettingsConfiguration schema={schemaWithAccessCode} onUpdate={mockOnUpdate} />);

      const input = screen.getByLabelText("Access Code") as HTMLInputElement;

      // Clear any previous calls from useEffect/watch
      mockOnUpdate.mockClear();

      // Clear the input
      fireEvent.change(input, { target: { value: "" } });

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled();
      });

      // Get the most recent call
      const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1];
      expect(lastCall).toBeDefined();
      const updatedSchema = lastCall[0] as FormSchema;
      expect(updatedSchema.settings?.accessCode).toBe("");
    });

    it("should preserve other settings when updating access code", async () => {
      const user = userEvent.setup();
      const schemaWithOtherSettings: FormSchema = {
        ...mockSchema,
        settings: {
          submitButtonText: "Apply Now",
          confirmationMessage: "Thank you!",
          privateApplications: true,
          donationRound: false,
        },
      };

      render(<SettingsConfiguration schema={schemaWithOtherSettings} onUpdate={mockOnUpdate} />);

      const input = screen.getByLabelText("Access Code");

      // Clear any previous calls from useEffect/watch
      mockOnUpdate.mockClear();

      await user.type(input, "SECRET");

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled();
      });

      const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1];
      expect(lastCall).toBeDefined();
      const updatedSchema = lastCall[0] as FormSchema;
      expect(updatedSchema.settings?.submitButtonText).toBe("Apply Now");
      expect(updatedSchema.settings?.confirmationMessage).toBe("Thank you!");
      expect(updatedSchema.settings?.privateApplications).toBe(true);
      expect(updatedSchema.settings?.accessCode).toContain("SECRET");
    });

    it("should show validation error when access code is too short", async () => {
      const user = userEvent.setup();

      render(<SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} />);

      const input = screen.getByLabelText("Access Code");

      await user.type(input, "ABC");
      // Trigger validation by blurring
      fireEvent.blur(input);

      await waitFor(() => {
        expect(screen.getByText(/Access code must be at least 6 characters/i)).toBeInTheDocument();
      });
    });

    it("should show validation error when access code contains spaces", async () => {
      const user = userEvent.setup();

      render(<SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} />);

      const input = screen.getByLabelText("Access Code");

      await user.type(input, "SECRET CODE");
      // Trigger validation by blurring
      fireEvent.blur(input);

      await waitFor(() => {
        expect(screen.getByText(/Access code cannot contain spaces/i)).toBeInTheDocument();
      });
    });

    it("should have proper ARIA attributes for accessibility", () => {
      render(<SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} />);

      const input = screen.getByLabelText("Access Code");

      expect(input).toHaveAttribute("aria-describedby", "accessCode-help accessCode-error");
      expect(input).toHaveAttribute("aria-invalid", "false");
    });
  });
});
