/**
 * @file Tests for ProgramContactsTab component
 * @description Tests for the program contacts tab covering local state management,
 * save button behavior, admin/finance email validation, permission checks,
 * and user interactions.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { ProgramContactsTab } from "@/components/FundingPlatform/QuestionBuilder/ProgramContactsTab";

// Mock dependencies
jest.mock("@/hooks/communities/useIsCommunityAdmin", () => ({
  useIsCommunityAdmin: jest.fn(),
}));

jest.mock("@/hooks/useFundingPlatform", () => ({
  useProgramConfig: jest.fn(),
}));

jest.mock("@/utilities/validators", () => ({
  validateEmail: jest.fn(),
}));

jest.mock("@/components/FundingPlatform/PageHeader", () => ({
  PageHeader: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="page-header">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  ),
  PAGE_HEADER_CONTENT: {},
}));

jest.mock("@/components/Utilities/Spinner", () => ({
  Spinner: ({ className }: { className?: string }) => (
    <div data-testid="spinner" role="status" className={className} />
  ),
}));

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Heroicons mock - render simple SVGs
jest.mock("@heroicons/react/24/solid", () => ({
  EnvelopeIcon: (props: any) => <svg data-testid="envelope-icon" {...props} />,
  PlusIcon: (props: any) => <svg data-testid="plus-icon" {...props} />,
  XMarkIcon: (props: any) => <svg data-testid="x-mark-icon" {...props} />,
}));

import { useIsCommunityAdmin } from "@/hooks/communities/useIsCommunityAdmin";
import { useProgramConfig } from "@/hooks/useFundingPlatform";
import { validateEmail } from "@/utilities/validators";

const mockUseIsCommunityAdmin = useIsCommunityAdmin as jest.Mock;
const mockUseProgramConfig = useProgramConfig as jest.Mock;
const mockValidateEmail = validateEmail as jest.Mock;

describe("ProgramContactsTab", () => {
  const defaultProps = {
    programId: "program-123",
    communityId: "community-456",
  };

  const mockUpdateConfig = jest.fn();

  /**
   * Helper to create a mock program data object with the given email arrays
   */
  function createProgramData(adminEmails: string[] = [], financeEmails: string[] = []) {
    return {
      applicationConfig: {
        formSchema: {
          id: "form_1",
          fields: [],
          settings: {
            adminEmails,
            financeEmails,
          },
        },
      },
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();

    // Default: admin user, no emails, not updating
    mockUseIsCommunityAdmin.mockReturnValue({
      isCommunityAdmin: true,
      isLoading: false,
      isError: false,
      error: null,
    });

    mockUseProgramConfig.mockReturnValue({
      data: createProgramData(),
      updateConfig: mockUpdateConfig,
      isUpdating: false,
    });

    // By default, all emails pass validation
    mockValidateEmail.mockReturnValue(true);
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  describe("Loading state", () => {
    it("should show spinner when admin check is loading", () => {
      mockUseIsCommunityAdmin.mockReturnValue({
        isCommunityAdmin: false,
        isLoading: true,
        isError: false,
        error: null,
      });

      render(<ProgramContactsTab {...defaultProps} />);

      expect(screen.getByTestId("spinner")).toBeInTheDocument();
      expect(screen.queryByTestId("page-header")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Permission denied
  // -------------------------------------------------------------------------

  describe("Permission denied", () => {
    it("should show no-permission message when not admin and not readOnly", () => {
      mockUseIsCommunityAdmin.mockReturnValue({
        isCommunityAdmin: false,
        isLoading: false,
        isError: false,
        error: null,
      });

      render(<ProgramContactsTab {...defaultProps} />);

      expect(screen.getByText(/don.t have permission to manage contacts/i)).toBeInTheDocument();
      expect(screen.queryByTestId("page-header")).not.toBeInTheDocument();
    });

    it("should allow readOnly access even when not admin", () => {
      mockUseIsCommunityAdmin.mockReturnValue({
        isCommunityAdmin: false,
        isLoading: false,
        isError: false,
        error: null,
      });

      render(<ProgramContactsTab {...defaultProps} readOnly />);

      expect(screen.getByTestId("page-header")).toBeInTheDocument();
      expect(screen.getByText("Program Contacts")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Page header rendering
  // -------------------------------------------------------------------------

  describe("Page header", () => {
    it("should render page header with 'Program Contacts' title", () => {
      render(<ProgramContactsTab {...defaultProps} />);

      expect(screen.getByTestId("page-header")).toBeInTheDocument();
      expect(screen.getByText("Program Contacts")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------

  describe("Empty state", () => {
    it("should show 'No email addresses added yet' for both sections when no emails exist", () => {
      render(<ProgramContactsTab {...defaultProps} />);

      const emptyMessages = screen.getAllByText("No email addresses added yet");
      expect(emptyMessages).toHaveLength(2);
    });

    it("should not show email list containers when empty", () => {
      render(<ProgramContactsTab {...defaultProps} />);

      expect(screen.queryByTestId("admin-email-list")).not.toBeInTheDocument();
      expect(screen.queryByTestId("finance-email-list")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Displaying existing emails
  // -------------------------------------------------------------------------

  describe("Displaying existing emails", () => {
    it("should display existing admin emails", () => {
      mockUseProgramConfig.mockReturnValue({
        data: createProgramData(["admin1@test.com", "admin2@test.com"]),
        updateConfig: mockUpdateConfig,
        isUpdating: false,
      });

      render(<ProgramContactsTab {...defaultProps} />);

      expect(screen.getByTestId("admin-email-list")).toBeInTheDocument();
      expect(screen.getByText("admin1@test.com")).toBeInTheDocument();
      expect(screen.getByText("admin2@test.com")).toBeInTheDocument();
    });

    it("should display existing finance emails", () => {
      mockUseProgramConfig.mockReturnValue({
        data: createProgramData([], ["finance1@test.com", "finance2@test.com"]),
        updateConfig: mockUpdateConfig,
        isUpdating: false,
      });

      render(<ProgramContactsTab {...defaultProps} />);

      expect(screen.getByTestId("finance-email-list")).toBeInTheDocument();
      expect(screen.getByText("finance1@test.com")).toBeInTheDocument();
      expect(screen.getByText("finance2@test.com")).toBeInTheDocument();
    });

    it("should render section titles for admin and finance emails", () => {
      render(<ProgramContactsTab {...defaultProps} />);

      expect(screen.getByText("Admin Emails")).toBeInTheDocument();
      expect(screen.getByText("Finance Emails")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Adding emails to local state (no API call)
  // -------------------------------------------------------------------------

  describe("Adding emails to local list", () => {
    it("should add an admin email to the local list without calling updateConfig", async () => {
      const user = userEvent.setup();

      render(<ProgramContactsTab {...defaultProps} />);

      const adminInput = screen.getByTestId("admin-email-input");
      const adminAddBtn = screen.getByTestId("admin-email-add-btn");

      await user.type(adminInput, "newadmin@test.com");
      await user.click(adminAddBtn);

      // Email should appear in the list
      expect(screen.getByText("newadmin@test.com")).toBeInTheDocument();
      // But updateConfig should NOT be called yet
      expect(mockUpdateConfig).not.toHaveBeenCalled();
    });

    it("should add a finance email to the local list without calling updateConfig", async () => {
      const user = userEvent.setup();

      render(<ProgramContactsTab {...defaultProps} />);

      const financeInput = screen.getByTestId("finance-email-input");
      const financeAddBtn = screen.getByTestId("finance-email-add-btn");

      await user.type(financeInput, "newfinance@test.com");
      await user.click(financeAddBtn);

      expect(screen.getByText("newfinance@test.com")).toBeInTheDocument();
      expect(mockUpdateConfig).not.toHaveBeenCalled();
    });

    it("should clear the input after a successful add", async () => {
      const user = userEvent.setup();

      render(<ProgramContactsTab {...defaultProps} />);

      const adminInput = screen.getByTestId("admin-email-input") as HTMLInputElement;
      await user.type(adminInput, "newadmin@test.com");
      await user.click(screen.getByTestId("admin-email-add-btn"));

      expect(adminInput.value).toBe("");
    });

    it("should add multiple emails to the same section", async () => {
      const user = userEvent.setup();

      render(<ProgramContactsTab {...defaultProps} />);

      const adminInput = screen.getByTestId("admin-email-input");
      const adminAddBtn = screen.getByTestId("admin-email-add-btn");

      await user.type(adminInput, "first@test.com");
      await user.click(adminAddBtn);
      await user.type(adminInput, "second@test.com");
      await user.click(adminAddBtn);

      expect(screen.getByText("first@test.com")).toBeInTheDocument();
      expect(screen.getByText("second@test.com")).toBeInTheDocument();
      expect(mockUpdateConfig).not.toHaveBeenCalled();
    });

    it("should add an email via Enter key without calling updateConfig", async () => {
      const user = userEvent.setup();

      render(<ProgramContactsTab {...defaultProps} />);

      const adminInput = screen.getByTestId("admin-email-input");
      await user.type(adminInput, "enter@test.com");
      await user.keyboard("{Enter}");

      expect(screen.getByText("enter@test.com")).toBeInTheDocument();
      expect(mockUpdateConfig).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Removing emails from local state (no API call)
  // -------------------------------------------------------------------------

  describe("Removing emails from local list", () => {
    it("should remove an admin email from local list without calling updateConfig", async () => {
      const user = userEvent.setup();

      mockUseProgramConfig.mockReturnValue({
        data: createProgramData(["first@test.com", "second@test.com"]),
        updateConfig: mockUpdateConfig,
        isUpdating: false,
      });

      render(<ProgramContactsTab {...defaultProps} />);

      const removeBtn = screen.getByTestId("admin-email-remove-0");
      await user.click(removeBtn);

      // first@test.com should be gone
      expect(screen.queryByText("first@test.com")).not.toBeInTheDocument();
      expect(screen.getByText("second@test.com")).toBeInTheDocument();
      // No API call yet
      expect(mockUpdateConfig).not.toHaveBeenCalled();
    });

    it("should remove a finance email from local list without calling updateConfig", async () => {
      const user = userEvent.setup();

      mockUseProgramConfig.mockReturnValue({
        data: createProgramData([], ["fin1@test.com", "fin2@test.com"]),
        updateConfig: mockUpdateConfig,
        isUpdating: false,
      });

      render(<ProgramContactsTab {...defaultProps} />);

      const removeBtn = screen.getByTestId("finance-email-remove-1");
      await user.click(removeBtn);

      expect(screen.getByText("fin1@test.com")).toBeInTheDocument();
      expect(screen.queryByText("fin2@test.com")).not.toBeInTheDocument();
      expect(mockUpdateConfig).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Save button behavior
  // -------------------------------------------------------------------------

  describe("Save button", () => {
    it("should render a 'Save Contacts' button", () => {
      render(<ProgramContactsTab {...defaultProps} />);

      expect(screen.getByTestId("save-contacts-btn")).toBeInTheDocument();
      expect(screen.getByText("Save Contacts")).toBeInTheDocument();
    });

    it("should be disabled when there are no unsaved changes", () => {
      render(<ProgramContactsTab {...defaultProps} />);

      const saveBtn = screen.getByTestId("save-contacts-btn");
      expect(saveBtn).toBeDisabled();
    });

    it("should be enabled after adding an email (unsaved changes)", async () => {
      const user = userEvent.setup();

      render(<ProgramContactsTab {...defaultProps} />);

      const adminInput = screen.getByTestId("admin-email-input");
      await user.type(adminInput, "new@test.com");
      await user.click(screen.getByTestId("admin-email-add-btn"));

      const saveBtn = screen.getByTestId("save-contacts-btn");
      expect(saveBtn).not.toBeDisabled();
    });

    it("should show 'You have unsaved changes' indicator after adding an email", async () => {
      const user = userEvent.setup();

      render(<ProgramContactsTab {...defaultProps} />);

      const adminInput = screen.getByTestId("admin-email-input");
      await user.type(adminInput, "new@test.com");
      await user.click(screen.getByTestId("admin-email-add-btn"));

      expect(screen.getByTestId("unsaved-changes")).toBeInTheDocument();
      expect(screen.getByText("You have unsaved changes")).toBeInTheDocument();
    });

    it("should call updateConfig when Save is clicked with valid data", async () => {
      const user = userEvent.setup();

      render(<ProgramContactsTab {...defaultProps} />);

      // Add one admin email
      const adminInput = screen.getByTestId("admin-email-input");
      await user.type(adminInput, "admin@test.com");
      await user.click(screen.getByTestId("admin-email-add-btn"));

      // Add one finance email
      const financeInput = screen.getByTestId("finance-email-input");
      await user.type(financeInput, "finance@test.com");
      await user.click(screen.getByTestId("finance-email-add-btn"));

      // Click save
      await user.click(screen.getByTestId("save-contacts-btn"));

      expect(mockUpdateConfig).toHaveBeenCalledTimes(1);
      const callArg = mockUpdateConfig.mock.calls[0][0];
      expect(callArg.formSchema.settings.adminEmails).toEqual(["admin@test.com"]);
      expect(callArg.formSchema.settings.financeEmails).toEqual(["finance@test.com"]);
    });

    it("should be disabled while isUpdating is true", () => {
      mockUseProgramConfig.mockReturnValue({
        data: createProgramData(),
        updateConfig: mockUpdateConfig,
        isUpdating: true,
      });

      render(<ProgramContactsTab {...defaultProps} />);

      const saveBtn = screen.getByTestId("save-contacts-btn");
      expect(saveBtn).toBeDisabled();
    });

    it("should show 'Saving...' text when isUpdating is true", () => {
      mockUseProgramConfig.mockReturnValue({
        data: createProgramData(),
        updateConfig: mockUpdateConfig,
        isUpdating: true,
      });

      render(<ProgramContactsTab {...defaultProps} />);

      expect(screen.getByText("Saving...")).toBeInTheDocument();
    });

    it("should not render save button in readOnly mode", () => {
      render(<ProgramContactsTab {...defaultProps} readOnly />);

      expect(screen.queryByTestId("save-contacts-btn")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Save validation — both admin and finance required
  // -------------------------------------------------------------------------

  describe("Save validation", () => {
    it("should show error when saving with no admin emails", async () => {
      const user = userEvent.setup();

      render(<ProgramContactsTab {...defaultProps} />);

      // Add only a finance email
      const financeInput = screen.getByTestId("finance-email-input");
      await user.type(financeInput, "finance@test.com");
      await user.click(screen.getByTestId("finance-email-add-btn"));

      await user.click(screen.getByTestId("save-contacts-btn"));

      expect(screen.getByTestId("save-error")).toBeInTheDocument();
      expect(screen.getByText("At least one admin email is required.")).toBeInTheDocument();
      expect(mockUpdateConfig).not.toHaveBeenCalled();
    });

    it("should show error when saving with no finance emails", async () => {
      const user = userEvent.setup();

      render(<ProgramContactsTab {...defaultProps} />);

      // Add only an admin email
      const adminInput = screen.getByTestId("admin-email-input");
      await user.type(adminInput, "admin@test.com");
      await user.click(screen.getByTestId("admin-email-add-btn"));

      await user.click(screen.getByTestId("save-contacts-btn"));

      expect(screen.getByTestId("save-error")).toBeInTheDocument();
      expect(screen.getByText("At least one finance email is required.")).toBeInTheDocument();
      expect(mockUpdateConfig).not.toHaveBeenCalled();
    });

    it("should clear save error when adding an email after validation failure", async () => {
      const user = userEvent.setup();

      render(<ProgramContactsTab {...defaultProps} />);

      // Add only admin, try save → finance error
      const adminInput = screen.getByTestId("admin-email-input");
      await user.type(adminInput, "admin@test.com");
      await user.click(screen.getByTestId("admin-email-add-btn"));
      await user.click(screen.getByTestId("save-contacts-btn"));

      expect(screen.getByTestId("save-error")).toBeInTheDocument();

      // Now add a finance email — error should clear
      const financeInput = screen.getByTestId("finance-email-input");
      await user.type(financeInput, "finance@test.com");
      await user.click(screen.getByTestId("finance-email-add-btn"));

      expect(screen.queryByTestId("save-error")).not.toBeInTheDocument();
    });

    it("should not show save error initially", () => {
      render(<ProgramContactsTab {...defaultProps} />);

      expect(screen.queryByTestId("save-error")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Email input validation
  // -------------------------------------------------------------------------

  describe("Email input validation", () => {
    it("should show error when email format is invalid", async () => {
      const user = userEvent.setup();
      mockValidateEmail.mockReturnValue(false);

      render(<ProgramContactsTab {...defaultProps} />);

      const adminInput = screen.getByTestId("admin-email-input");
      await user.type(adminInput, "not-an-email");
      await user.click(screen.getByTestId("admin-email-add-btn"));

      expect(screen.getByTestId("admin-email-error")).toBeInTheDocument();
      expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
    });

    it("should show error when email is a duplicate", async () => {
      const user = userEvent.setup();
      mockValidateEmail.mockReturnValue(true);

      mockUseProgramConfig.mockReturnValue({
        data: createProgramData(["existing@test.com"]),
        updateConfig: mockUpdateConfig,
        isUpdating: false,
      });

      render(<ProgramContactsTab {...defaultProps} />);

      const adminInput = screen.getByTestId("admin-email-input");
      await user.type(adminInput, "existing@test.com");
      await user.click(screen.getByTestId("admin-email-add-btn"));

      expect(screen.getByTestId("admin-email-error")).toBeInTheDocument();
      expect(screen.getByText("This email is already added")).toBeInTheDocument();
    });

    it("should not add an email when the input is empty", async () => {
      const user = userEvent.setup();

      render(<ProgramContactsTab {...defaultProps} />);

      await user.click(screen.getByTestId("admin-email-add-btn"));

      expect(screen.queryByTestId("admin-email-error")).not.toBeInTheDocument();
      // No email should appear in the list
      expect(screen.queryByTestId("admin-email-list")).not.toBeInTheDocument();
    });

    it("should clear the error message when the user types after an error", async () => {
      const user = userEvent.setup();
      mockValidateEmail.mockReturnValue(false);

      render(<ProgramContactsTab {...defaultProps} />);

      const adminInput = screen.getByTestId("admin-email-input");

      // Trigger error
      await user.type(adminInput, "bad");
      await user.click(screen.getByTestId("admin-email-add-btn"));

      expect(screen.getByTestId("admin-email-error")).toBeInTheDocument();

      // Now type again - error should clear
      mockValidateEmail.mockReturnValue(true);
      await user.type(adminInput, "a");

      expect(screen.queryByTestId("admin-email-error")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Read-only mode
  // -------------------------------------------------------------------------

  describe("Read-only mode", () => {
    it("should not show add inputs, buttons, or save button when readOnly is true", () => {
      mockUseProgramConfig.mockReturnValue({
        data: createProgramData(["admin@test.com"], ["finance@test.com"]),
        updateConfig: mockUpdateConfig,
        isUpdating: false,
      });

      render(<ProgramContactsTab {...defaultProps} readOnly />);

      // Emails should still be displayed
      expect(screen.getByText("admin@test.com")).toBeInTheDocument();
      expect(screen.getByText("finance@test.com")).toBeInTheDocument();

      // But inputs, add buttons, and save button should not exist
      expect(screen.queryByTestId("admin-email-input")).not.toBeInTheDocument();
      expect(screen.queryByTestId("admin-email-add-btn")).not.toBeInTheDocument();
      expect(screen.queryByTestId("finance-email-input")).not.toBeInTheDocument();
      expect(screen.queryByTestId("finance-email-add-btn")).not.toBeInTheDocument();
      expect(screen.queryByTestId("save-contacts-btn")).not.toBeInTheDocument();
    });

    it("should not show remove buttons in read-only mode", () => {
      mockUseProgramConfig.mockReturnValue({
        data: createProgramData(["admin@test.com"], ["finance@test.com"]),
        updateConfig: mockUpdateConfig,
        isUpdating: false,
      });

      render(<ProgramContactsTab {...defaultProps} readOnly />);

      expect(screen.queryByTestId("admin-email-remove-0")).not.toBeInTheDocument();
      expect(screen.queryByTestId("finance-email-remove-0")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Edge case: formSchema missing or malformed
  // -------------------------------------------------------------------------

  describe("Missing or malformed formSchema", () => {
    it("should handle null program data gracefully", () => {
      mockUseProgramConfig.mockReturnValue({
        data: null,
        updateConfig: mockUpdateConfig,
        isUpdating: false,
      });

      render(<ProgramContactsTab {...defaultProps} />);

      expect(screen.getByTestId("page-header")).toBeInTheDocument();
      const emptyMessages = screen.getAllByText("No email addresses added yet");
      expect(emptyMessages).toHaveLength(2);
    });

    it("should handle program data without applicationConfig", () => {
      mockUseProgramConfig.mockReturnValue({
        data: {},
        updateConfig: mockUpdateConfig,
        isUpdating: false,
      });

      render(<ProgramContactsTab {...defaultProps} />);

      expect(screen.getByTestId("page-header")).toBeInTheDocument();
    });

    it("should handle program data without settings in formSchema", () => {
      mockUseProgramConfig.mockReturnValue({
        data: {
          applicationConfig: {
            formSchema: {
              id: "form_1",
              fields: [],
            },
          },
        },
        updateConfig: mockUpdateConfig,
        isUpdating: false,
      });

      render(<ProgramContactsTab {...defaultProps} />);

      expect(screen.getByTestId("page-header")).toBeInTheDocument();
      const emptyMessages = screen.getAllByText("No email addresses added yet");
      expect(emptyMessages).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // Integration: save preserves all local emails
  // -------------------------------------------------------------------------

  describe("Save sends both admin and finance emails together", () => {
    it("should send both admin and finance emails in a single save call", async () => {
      const user = userEvent.setup();

      render(<ProgramContactsTab {...defaultProps} />);

      // Add admin emails
      const adminInput = screen.getByTestId("admin-email-input");
      await user.type(adminInput, "admin1@test.com");
      await user.click(screen.getByTestId("admin-email-add-btn"));
      await user.type(adminInput, "admin2@test.com");
      await user.click(screen.getByTestId("admin-email-add-btn"));

      // Add finance emails
      const financeInput = screen.getByTestId("finance-email-input");
      await user.type(financeInput, "finance1@test.com");
      await user.click(screen.getByTestId("finance-email-add-btn"));

      // Click save
      await user.click(screen.getByTestId("save-contacts-btn"));

      expect(mockUpdateConfig).toHaveBeenCalledTimes(1);
      const callArg = mockUpdateConfig.mock.calls[0][0];
      expect(callArg.formSchema.settings.adminEmails).toEqual([
        "admin1@test.com",
        "admin2@test.com",
      ]);
      expect(callArg.formSchema.settings.financeEmails).toEqual(["finance1@test.com"]);
    });

    it("should preserve existing server emails and add new ones on save", async () => {
      const user = userEvent.setup();

      mockUseProgramConfig.mockReturnValue({
        data: createProgramData(["existing-admin@test.com"], ["existing-finance@test.com"]),
        updateConfig: mockUpdateConfig,
        isUpdating: false,
      });

      render(<ProgramContactsTab {...defaultProps} />);

      // Add another admin email
      const adminInput = screen.getByTestId("admin-email-input");
      await user.type(adminInput, "new-admin@test.com");
      await user.click(screen.getByTestId("admin-email-add-btn"));

      // Click save
      await user.click(screen.getByTestId("save-contacts-btn"));

      expect(mockUpdateConfig).toHaveBeenCalledTimes(1);
      const callArg = mockUpdateConfig.mock.calls[0][0];
      expect(callArg.formSchema.settings.adminEmails).toEqual([
        "existing-admin@test.com",
        "new-admin@test.com",
      ]);
      expect(callArg.formSchema.settings.financeEmails).toEqual(["existing-finance@test.com"]);
    });
  });
});
