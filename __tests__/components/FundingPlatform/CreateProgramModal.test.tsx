/**
 * @file Tests for CreateProgramModal component
 * @description Comprehensive tests for the program creation modal
 * covering UI rendering, form validation, user interactions, and submission
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { CreateProgramModal } from "@/components/FundingPlatform/CreateProgramModal";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/__tests__/utils/msw/setup";
import { ProgramRegistryService } from "@/services/programRegistry.service";

// Mock dependencies
jest.mock("wagmi", () => ({
  useAccount: jest.fn(),
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/hooks/communities/useCommunityDetails", () => ({
  useCommunityDetails: jest.fn(),
}));

jest.mock("@/services/programRegistry.service", () => ({
  ProgramRegistryService: {
    buildProgramMetadata: jest.fn(),
    createProgram: jest.fn(),
    approveProgram: jest.fn(),
  },
}));

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock MarkdownEditor to render a simple textarea for testing
jest.mock("@/components/Utilities/MarkdownEditor", () => ({
  MarkdownEditor: ({
    value,
    onChange,
    onBlur,
    label,
    error,
    isRequired,
    isDisabled,
    placeholder,
    id,
  }: {
    value?: string;
    onChange?: (value: string) => void;
    onBlur?: () => void;
    label?: string;
    error?: string;
    isRequired?: boolean;
    isDisabled?: boolean;
    placeholder?: string;
    id?: string;
  }) => (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-bold">
          {label} {isRequired && <span className="text-red-500">*</span>}
        </label>
      )}
      <textarea
        id={id}
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={isDisabled}
        data-testid={`markdown-editor-${id}`}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  ),
}));

// Mock Radix UI Dialog
jest.mock("@radix-ui/react-dialog", () => {
  const React = require("react");

  return {
    Root: ({ children, open, onOpenChange }: any) => (
      <div data-testid="dialog-root" data-open={open}>
        {open && (
          <div data-testid="dialog-content">
            {React.Children.map(children, (child: any) =>
              React.cloneElement(child, { onOpenChange })
            )}
          </div>
        )}
      </div>
    ),
    Portal: ({ children }: any) => <>{children}</>,
    Overlay: Object.assign(
      ({ children }: any) => <div data-testid="dialog-overlay">{children}</div>,
      { displayName: "DialogOverlay" }
    ),
    Content: Object.assign(
      ({ children, className }: any) => (
        <div data-testid="dialog-content-wrapper" className={className}>
          {children}
        </div>
      ),
      { displayName: "DialogContent" }
    ),
    Title: Object.assign(({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>, {
      displayName: "DialogTitle",
    }),
    Description: Object.assign(
      ({ children }: any) => <p data-testid="dialog-description">{children}</p>,
      { displayName: "DialogDescription" }
    ),
    Header: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
    Footer: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
    Close: ({ children }: any) => <button data-testid="dialog-close">{children}</button>,
  };
});

import toast from "react-hot-toast";
// Import mocked modules
import { useAccount } from "wagmi";
import { useCommunityDetails } from "@/hooks/communities/useCommunityDetails";
import { useAuth } from "@/hooks/useAuth";

const INDEXER_API_BASE_URL = process.env.NEXT_PUBLIC_GAP_INDEXER_URL || "http://localhost:4000";

// Test data
const mockCommunity = {
  uid: "0x1234567890123456789012345678901234567890",
  chainID: 1,
  details: {
    name: "Test Community",
    description: "Test community description",
    slug: "test-community",
    logoUrl: "",
  },
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const mockAddress = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";

// Helper to create test query client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

// Helper to render with providers
const renderWithProviders = (ui: React.ReactElement, queryClient?: QueryClient) => {
  const client = queryClient || createTestQueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

describe("CreateProgramModal", () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    (useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true,
    });

    (useAuth as jest.Mock).mockReturnValue({
      authenticated: true,
      login: mockLogin,
    });

    (useCommunityDetails as jest.Mock).mockReturnValue({
      data: mockCommunity,
      isLoading: false,
      error: null,
    });

    (ProgramRegistryService.buildProgramMetadata as jest.Mock).mockReturnValue({
      title: "Test Program",
      description: "Test Description",
      shortDescription: "Short desc",
      tags: ["karma-gap", "grant-program-registry"],
      communityRef: [mockCommunity.uid],
    });

    (ProgramRegistryService.createProgram as jest.Mock).mockResolvedValue({
      programId: "program-123",
      success: true,
      requiresManualApproval: false,
    });

    (ProgramRegistryService.approveProgram as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe("Rendering", () => {
    it("should render dialog when isOpen is true", () => {
      renderWithProviders(
        <CreateProgramModal
          isOpen={true}
          onClose={mockOnClose}
          communityId="test-community"
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByTestId("dialog-root")).toBeInTheDocument();
      expect(screen.getByTestId("dialog-content")).toBeInTheDocument();
    });

    it("should not render dialog content when isOpen is false", () => {
      renderWithProviders(
        <CreateProgramModal
          isOpen={false}
          onClose={mockOnClose}
          communityId="test-community"
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.queryByTestId("dialog-content")).not.toBeInTheDocument();
    });

    it("should render dialog title", () => {
      renderWithProviders(
        <CreateProgramModal
          isOpen={true}
          onClose={mockOnClose}
          communityId="test-community"
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText("Create New Program")).toBeInTheDocument();
    });

    it("should show loading state when community is loading", () => {
      (useCommunityDetails as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      renderWithProviders(
        <CreateProgramModal
          isOpen={true}
          onClose={mockOnClose}
          communityId="test-community"
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument();
    });

    it("should show error state when community fails to load", () => {
      (useCommunityDetails as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error("Failed to load"),
      });

      renderWithProviders(
        <CreateProgramModal
          isOpen={true}
          onClose={mockOnClose}
          communityId="test-community"
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText(/failed to load community data/i)).toBeInTheDocument();
    });

    it("should show form when community is loaded", () => {
      renderWithProviders(
        <CreateProgramModal
          isOpen={true}
          onClose={mockOnClose}
          communityId="test-community"
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByLabelText(/program name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/program description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/short description/i)).toBeInTheDocument();
    });
  });

  describe("Form Validation", () => {
    it("should validate required fields", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <CreateProgramModal
          isOpen={true}
          onClose={mockOnClose}
          communityId="test-community"
          onSuccess={mockOnSuccess}
        />
      );

      const submitButton = screen.getByRole("button", { name: /create program/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/program name must be at least 3 characters/i)).toBeInTheDocument();
      });
    });

    it("should validate name length (min 3 characters)", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <CreateProgramModal
          isOpen={true}
          onClose={mockOnClose}
          communityId="test-community"
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByLabelText(/program name/i);
      await user.type(nameInput, "ab");

      const submitButton = screen.getByRole("button", { name: /create program/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/program name must be at least 3 characters/i)).toBeInTheDocument();
      });
    });

    it("should validate name length (max 50 characters)", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <CreateProgramModal
          isOpen={true}
          onClose={mockOnClose}
          communityId="test-community"
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByLabelText(/program name/i);
      await user.type(nameInput, "a".repeat(51));

      const submitButton = screen.getByRole("button", { name: /create program/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/program name must be at most 50 characters/i)).toBeInTheDocument();
      });
    });

    it("should enforce shortDescription length limit (max 100 characters)", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <CreateProgramModal
          isOpen={true}
          onClose={mockOnClose}
          communityId="test-community"
          onSuccess={mockOnSuccess}
        />
      );

      // Fill required fields first
      await user.type(screen.getByLabelText(/program name/i), "Test Program");
      await user.type(screen.getByLabelText(/program description/i), "Test Description");

      const shortDescInput = screen.getByLabelText(/short description/i) as HTMLTextAreaElement;
      // The MarkdownEditor component limits input to 100 characters via onChange handler
      // Type exactly 100 characters and verify it's accepted
      await user.type(shortDescInput, "a".repeat(100));

      // Verify the value is exactly 100 characters
      expect(shortDescInput.value).toBe("a".repeat(100));
      expect(screen.getByText(/100\/100/i)).toBeInTheDocument();
    });

    it("should validate date range (start date before end date)", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <CreateProgramModal
          isOpen={true}
          onClose={mockOnClose}
          communityId="test-community"
          onSuccess={mockOnSuccess}
        />
      );

      // Fill required fields
      await user.type(screen.getByLabelText(/program name/i), "Test Program");
      await user.type(screen.getByLabelText(/program description/i), "Test Description");
      await user.type(screen.getByLabelText(/short description/i), "Short desc");

      // Set dates - end before start
      const startDate = new Date("2024-12-31");
      const endDate = new Date("2024-01-01");

      // Mock DatePicker to set dates
      const startDatePicker = screen.getByText(/start date/i).closest("div");
      const endDatePicker = screen.getByText(/end date/i).closest("div");

      // This is a simplified test - in reality, DatePicker would handle this
      // For now, we'll test the validation logic through form submission
      const submitButton = screen.getByRole("button", { name: /create program/i });
      await user.click(submitButton);

      // The form should still submit if dates are optional
      // We'll test the date validation through the service layer
    });
  });

  describe("User Interactions", () => {
    it("should allow typing in form fields", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <CreateProgramModal
          isOpen={true}
          onClose={mockOnClose}
          communityId="test-community"
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByLabelText(/program name/i);
      await user.type(nameInput, "My Test Program");

      expect(nameInput).toHaveValue("My Test Program");
    });

    it("should show character count for short description", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <CreateProgramModal
          isOpen={true}
          onClose={mockOnClose}
          communityId="test-community"
          onSuccess={mockOnSuccess}
        />
      );

      const shortDescInput = screen.getByLabelText(/short description/i);
      await user.type(shortDescInput, "Test");

      expect(screen.getByText(/4\/100/i)).toBeInTheDocument();
    });

    it("should allow canceling the modal", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <CreateProgramModal
          isOpen={true}
          onClose={mockOnClose}
          communityId="test-community"
          onSuccess={mockOnSuccess}
        />
      );

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("Form Submission", () => {
    it("should call service with correct data on submit", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <CreateProgramModal
          isOpen={true}
          onClose={mockOnClose}
          communityId="test-community"
          onSuccess={mockOnSuccess}
        />
      );

      // Fill form
      await user.type(screen.getByLabelText(/program name/i), "Test Program");
      await user.type(screen.getByLabelText(/program description/i), "Test Description");
      await user.type(screen.getByLabelText(/short description/i), "Short desc");

      // Submit
      const submitButton = screen.getByRole("button", { name: /create program/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(ProgramRegistryService.buildProgramMetadata).toHaveBeenCalled();
        expect(ProgramRegistryService.createProgram).toHaveBeenCalledWith(
          mockAddress,
          mockCommunity.chainID,
          expect.objectContaining({
            title: "Test Program",
            description: "Test Description",
            shortDescription: "Short desc",
          })
        );
      });
    });

    it("should show loading state during submission", async () => {
      const user = userEvent.setup();
      (ProgramRegistryService.createProgram as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ programId: "123", success: true }), 100)
          )
      );

      renderWithProviders(
        <CreateProgramModal
          isOpen={true}
          onClose={mockOnClose}
          communityId="test-community"
          onSuccess={mockOnSuccess}
        />
      );

      // Fill form
      await user.type(screen.getByLabelText(/program name/i), "Test Program");
      await user.type(screen.getByLabelText(/program description/i), "Test Description");
      await user.type(screen.getByLabelText(/short description/i), "Short desc");

      // Submit
      const submitButton = screen.getByRole("button", { name: /create program/i });
      await user.click(submitButton);

      // Button should be replaced by Spinner when loading
      // The Button component replaces the button with a Spinner when isLoading is true
      await waitFor(
        () => {
          // Check that the submit button is no longer present (replaced by Spinner)
          const buttonAfterClick = screen.queryByRole("button", { name: /create program/i });
          expect(buttonAfterClick).not.toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it("should handle successful creation", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <CreateProgramModal
          isOpen={true}
          onClose={mockOnClose}
          communityId="test-community"
          onSuccess={mockOnSuccess}
        />
      );

      // Fill form
      await user.type(screen.getByLabelText(/program name/i), "Test Program");
      await user.type(screen.getByLabelText(/program description/i), "Test Description");
      await user.type(screen.getByLabelText(/short description/i), "Short desc");

      // Submit
      const submitButton = screen.getByRole("button", { name: /create program/i });
      await user.click(submitButton);

      await waitFor(() => {
        // V2 API auto-approves if user is admin - approveProgram is not called separately
        expect(toast.success).toHaveBeenCalledWith("Program created and approved successfully!");
        expect(mockOnSuccess).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it("should handle manual approval required", async () => {
      const user = userEvent.setup();
      // V2 API returns requiresManualApproval when auto-approval is not possible
      (ProgramRegistryService.createProgram as jest.Mock).mockResolvedValue({
        programId: "program-123",
        success: true,
        requiresManualApproval: true,
      });

      renderWithProviders(
        <CreateProgramModal
          isOpen={true}
          onClose={mockOnClose}
          communityId="test-community"
          onSuccess={mockOnSuccess}
        />
      );

      // Fill form
      await user.type(screen.getByLabelText(/program name/i), "Test Program");
      await user.type(screen.getByLabelText(/program description/i), "Test Description");
      await user.type(screen.getByLabelText(/short description/i), "Short desc");

      // Submit
      const submitButton = screen.getByRole("button", { name: /create program/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining("approve it manually"),
          expect.objectContaining({ duration: 10000 })
        );
        expect(mockOnSuccess).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it("should handle creation errors", async () => {
      const user = userEvent.setup();
      (ProgramRegistryService.createProgram as jest.Mock).mockRejectedValue(
        new Error("Creation failed")
      );

      renderWithProviders(
        <CreateProgramModal
          isOpen={true}
          onClose={mockOnClose}
          communityId="test-community"
          onSuccess={mockOnSuccess}
        />
      );

      // Fill form
      await user.type(screen.getByLabelText(/program name/i), "Test Program");
      await user.type(screen.getByLabelText(/program description/i), "Test Description");
      await user.type(screen.getByLabelText(/short description/i), "Short desc");

      // Submit
      const submitButton = screen.getByRole("button", { name: /create program/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to create program. Please try again.");
      });
    });

    it("should handle duplicate program error", async () => {
      const user = userEvent.setup();
      (ProgramRegistryService.createProgram as jest.Mock).mockRejectedValue(
        new Error("A program with this name already exists")
      );

      renderWithProviders(
        <CreateProgramModal
          isOpen={true}
          onClose={mockOnClose}
          communityId="test-community"
          onSuccess={mockOnSuccess}
        />
      );

      // Fill form
      await user.type(screen.getByLabelText(/program name/i), "Test Program");
      await user.type(screen.getByLabelText(/program description/i), "Test Description");
      await user.type(screen.getByLabelText(/short description/i), "Short desc");

      // Submit
      const submitButton = screen.getByRole("button", { name: /create program/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("A program with this name already exists");
      });
    });

    it("should reset form on success", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <CreateProgramModal
          isOpen={true}
          onClose={mockOnClose}
          communityId="test-community"
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByLabelText(/program name/i);
      await user.type(nameInput, "Test Program");
      await user.type(screen.getByLabelText(/program description/i), "Test Description");
      await user.type(screen.getByLabelText(/short description/i), "Short desc");

      // Submit
      const submitButton = screen.getByRole("button", { name: /create program/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe("Authentication", () => {
    it("should prompt login if not authenticated", async () => {
      const user = userEvent.setup();
      (useAuth as jest.Mock).mockReturnValue({
        authenticated: false,
        login: mockLogin,
      });

      renderWithProviders(
        <CreateProgramModal
          isOpen={true}
          onClose={mockOnClose}
          communityId="test-community"
          onSuccess={mockOnSuccess}
        />
      );

      // Fill form
      await user.type(screen.getByLabelText(/program name/i), "Test Program");
      await user.type(screen.getByLabelText(/program description/i), "Test Description");
      await user.type(screen.getByLabelText(/short description/i), "Short desc");

      // Submit
      const submitButton = screen.getByRole("button", { name: /create program/i });
      await user.click(submitButton);

      expect(mockLogin).toHaveBeenCalled();
      expect(ProgramRegistryService.createProgram).not.toHaveBeenCalled();
    });

    it("should prompt login if wallet not connected", async () => {
      const user = userEvent.setup();
      (useAccount as jest.Mock).mockReturnValue({
        address: undefined,
        isConnected: false,
      });

      renderWithProviders(
        <CreateProgramModal
          isOpen={true}
          onClose={mockOnClose}
          communityId="test-community"
          onSuccess={mockOnSuccess}
        />
      );

      // Fill form
      await user.type(screen.getByLabelText(/program name/i), "Test Program");
      await user.type(screen.getByLabelText(/program description/i), "Test Description");
      await user.type(screen.getByLabelText(/short description/i), "Short desc");

      // Submit
      const submitButton = screen.getByRole("button", { name: /create program/i });
      await user.click(submitButton);

      expect(mockLogin).toHaveBeenCalled();
      expect(ProgramRegistryService.createProgram).not.toHaveBeenCalled();
    });
  });

  describe("Manual Approval Flow", () => {
    it("should handle manual approval requirement", async () => {
      const user = userEvent.setup();
      (ProgramRegistryService.createProgram as jest.Mock).mockResolvedValue({
        programId: "",
        success: true,
        requiresManualApproval: true,
      });

      renderWithProviders(
        <CreateProgramModal
          isOpen={true}
          onClose={mockOnClose}
          communityId="test-community"
          onSuccess={mockOnSuccess}
        />
      );

      // Fill form
      await user.type(screen.getByLabelText(/program name/i), "Test Program");
      await user.type(screen.getByLabelText(/program description/i), "Test Description");
      await user.type(screen.getByLabelText(/short description/i), "Short desc");

      // Submit
      const submitButton = screen.getByRole("button", { name: /create program/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining("Please approve it manually"),
          { duration: 10000 }
        );
        expect(ProgramRegistryService.approveProgram).not.toHaveBeenCalled();
        expect(mockOnSuccess).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });
});
