import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

      expect(screen.getByText("Approval Email Body")).toBeInTheDocument();
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

    it("should call onUpdate when approval email template changes", () => {
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

      expect(mockOnUpdate).toHaveBeenCalled();
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

      expect(screen.getAllByText(/Available placeholders:/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/{{applicantName}}/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/{{programName}}/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/{{reason}}/).length).toBeGreaterThan(0);
    });

    it("should not show projectName or postApprovalFormDescription in placeholders", () => {
      render(<SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} />);

      const placeholderTexts = screen.getAllByText(/Available placeholders:/);
      // Check all placeholder texts (both approval and rejection sections)
      placeholderTexts.forEach((element) => {
        const text = element.textContent || "";
        expect(text).not.toContain("{{projectName}}");
        expect(text).not.toContain("{{postApprovalFormDescription}}");
      });
    });
  });

  describe("Rejection Email Template", () => {
    it("should render rejection email template editor", () => {
      render(<SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} />);

      expect(screen.getByText("Rejection Email Body")).toBeInTheDocument();
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

    it("should call onUpdate when rejection email template changes", () => {
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

      expect(mockOnUpdate).toHaveBeenCalled();
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
      expect(screen.getByText(/application info section of the email/)).toBeInTheDocument();
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
