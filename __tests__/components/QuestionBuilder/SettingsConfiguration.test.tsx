import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsConfiguration } from "@/components/QuestionBuilder/SettingsConfiguration";
import type { FormSchema } from "@/types/question-builder";

// Mock MarkdownEditor
jest.mock("@/components/Utilities/MarkdownEditor", () => ({
  MarkdownEditor: ({ value, onChange, placeholderText, disabled, id }: any) => (
    <textarea
      data-testid={`markdown-editor-${id || 'default'}`}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholderText}
      disabled={disabled}
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
      render(
        <SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} />
      );

      expect(screen.getByText("Approval Email Template")).toBeInTheDocument();
    });

    it("should display existing approval email template value", () => {
      const schemaWithTemplate: FormSchema = {
        ...mockSchema,
        settings: {
          approvalEmailTemplate: "Custom approval template",
        },
      };

      render(
        <SettingsConfiguration schema={schemaWithTemplate} onUpdate={mockOnUpdate} />
      );

      const editors = screen.getAllByTestId(/markdown-editor/);
      const approvalEditor = editors.find((editor) => 
        (editor as HTMLTextAreaElement).value === "Custom approval template"
      );
      expect(approvalEditor).toBeInTheDocument();
      expect(approvalEditor).toHaveValue("Custom approval template");
    });

    it("should call onUpdate when approval email template changes", () => {
      render(
        <SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} />
      );

      const editors = screen.getAllByTestId(/markdown-editor/);
      // Find the approval editor by checking which one triggers approvalEmailTemplate update
      const approvalEditor = editors[0];

      fireEvent.change(approvalEditor, {
        target: { value: "New approval template" },
      });

      expect(mockOnUpdate).toHaveBeenCalled();
      const updatedSchema = mockOnUpdate.mock.calls[0][0] as FormSchema;
      expect(updatedSchema.settings?.approvalEmailTemplate).toBe("New approval template");
    });

    it("should show placeholder text for approval email template", () => {
      render(
        <SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} />
      );

      const editors = screen.getAllByTestId(/markdown-editor/);
      expect(editors.length).toBeGreaterThan(0);
      editors.forEach((editor) => {
        expect(editor).toHaveAttribute("placeholder");
      });
    });

    it("should show available placeholders information", () => {
      render(
        <SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} />
      );

      expect(screen.getByText(/Available placeholders:/)).toBeInTheDocument();
      expect(screen.getByText(/{{applicantName}}/)).toBeInTheDocument();
      expect(screen.getByText(/{{programName}}/)).toBeInTheDocument();
      expect(screen.getByText(/{{reason}}/)).toBeInTheDocument();
    });

    it("should not show projectName or postApprovalFormDescription in placeholders", () => {
      render(
        <SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} />
      );

      const placeholderText = screen.getByText(/Available placeholders:/).textContent;
      expect(placeholderText).not.toContain("{{projectName}}");
      expect(placeholderText).not.toContain("{{postApprovalFormDescription}}");
    });
  });

  describe("Rejection Email Template", () => {
    it("should render rejection email template editor", () => {
      render(
        <SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} />
      );

      expect(screen.getByText("Rejection Email Template")).toBeInTheDocument();
    });

    it("should display existing rejection email template value", () => {
      const schemaWithTemplate: FormSchema = {
        ...mockSchema,
        settings: {
          rejectionEmailTemplate: "Custom rejection template",
        },
      };

      render(
        <SettingsConfiguration schema={schemaWithTemplate} onUpdate={mockOnUpdate} />
      );

      const editors = screen.getAllByTestId(/markdown-editor/);
      const rejectionEditor = editors.find((editor) => 
        (editor as HTMLTextAreaElement).value === "Custom rejection template"
      );
      expect(rejectionEditor).toBeInTheDocument();
      expect(rejectionEditor).toHaveValue("Custom rejection template");
    });

    it("should call onUpdate when rejection email template changes", () => {
      render(
        <SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} />
      );

      const editors = screen.getAllByTestId(/markdown-editor/);
      // The second editor should be the rejection one
      const rejectionEditor = editors.length > 1 ? editors[1] : editors[0];

      fireEvent.change(rejectionEditor, {
        target: { value: "New rejection template" },
      });

      expect(mockOnUpdate).toHaveBeenCalled();
      // Check all calls to find the one with rejectionEmailTemplate
      const rejectionCall = mockOnUpdate.mock.calls.find((call) => {
        const schema = call[0] as FormSchema;
        return schema.settings?.rejectionEmailTemplate === "New rejection template";
      });
      expect(rejectionCall).toBeDefined();
    });

    it("should show placeholder text for rejection email template", () => {
      render(
        <SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} />
      );

      const editors = screen.getAllByTestId(/markdown-editor/);
      expect(editors.length).toBeGreaterThan(0);
      editors.forEach((editor) => {
        expect(editor).toHaveAttribute("placeholder");
      });
    });
  });

  describe("Email Templates Section", () => {
    it("should render email templates section with heading", () => {
      render(
        <SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} />
      );

      expect(screen.getByText("Email Templates")).toBeInTheDocument();
    });

    it("should show description about email templates", () => {
      render(
        <SettingsConfiguration schema={mockSchema} onUpdate={mockOnUpdate} />
      );

      expect(
        screen.getByText(/Customize the emails sent to applicants/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/application info section of the email/)
      ).toBeInTheDocument();
    });

    it("should disable editors when readOnly is true", () => {
      render(
        <SettingsConfiguration
          schema={mockSchema}
          onUpdate={mockOnUpdate}
          readOnly={true}
        />
      );

      const editors = screen.getAllByTestId(/markdown-editor/);
      editors.forEach((editor) => {
        expect(editor).toBeDisabled();
      });
    });

    it("should enable editors when readOnly is false", () => {
      render(
        <SettingsConfiguration
          schema={mockSchema}
          onUpdate={mockOnUpdate}
          readOnly={false}
        />
      );

      const editors = screen.getAllByTestId(/markdown-editor/);
      editors.forEach((editor) => {
        expect(editor).not.toBeDisabled();
      });
    });
  });

  describe("Template Persistence", () => {
    it("should preserve other settings when updating approval email template", () => {
      const schemaWithOtherSettings: FormSchema = {
        ...mockSchema,
        settings: {
          submitButtonText: "Submit Application",
          confirmationMessage: "Thank you!",
          approvalEmailTemplate: "Old approval template",
        },
      };

      render(
        <SettingsConfiguration
          schema={schemaWithOtherSettings}
          onUpdate={mockOnUpdate}
        />
      );

      const editors = screen.getAllByTestId(/markdown-editor/);
      const approvalEditor = editors[0];

      fireEvent.change(approvalEditor, {
        target: { value: "New approval template" },
      });

      // Find the call that updated approvalEmailTemplate
      const approvalCall = mockOnUpdate.mock.calls.find((call) => {
        const schema = call[0] as FormSchema;
        return schema.settings?.approvalEmailTemplate === "New approval template";
      });
      expect(approvalCall).toBeDefined();
      const updatedSchema = approvalCall![0] as FormSchema;
      expect(updatedSchema.settings?.submitButtonText).toBe("Submit Application");
      expect(updatedSchema.settings?.confirmationMessage).toBe("Thank you!");
      expect(updatedSchema.settings?.approvalEmailTemplate).toBe("New approval template");
    });

    it("should preserve other settings when updating rejection email template", () => {
      const schemaWithOtherSettings: FormSchema = {
        ...mockSchema,
        settings: {
          submitButtonText: "Submit Application",
          rejectionEmailTemplate: "Old rejection template",
        },
      };

      render(
        <SettingsConfiguration
          schema={schemaWithOtherSettings}
          onUpdate={mockOnUpdate}
        />
      );

      const editors = screen.getAllByTestId(/markdown-editor/);
      const rejectionEditor = editors.length > 1 ? editors[1] : editors[0];

      fireEvent.change(rejectionEditor, {
        target: { value: "New rejection template" },
      });

      // Find the call that updated rejectionEmailTemplate
      const rejectionCall = mockOnUpdate.mock.calls.find((call) => {
        const schema = call[0] as FormSchema;
        return schema.settings?.rejectionEmailTemplate === "New rejection template";
      });
      expect(rejectionCall).toBeDefined();
      const updatedSchema = rejectionCall![0] as FormSchema;
      expect(updatedSchema.settings?.submitButtonText).toBe("Submit Application");
      expect(updatedSchema.settings?.rejectionEmailTemplate).toBe("New rejection template");
    });
  });
});

