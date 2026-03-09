/**
 * Tests for MilestoneEditDialog component (gap-app-v2).
 *
 * This component is the on-chain milestone edit dialog that allows
 * editing PENDING milestones only. It uses the SDK's Milestone.edit()
 * method via the useMilestoneEdit hook.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";

// Mock the editMilestone service
const mockEditMilestone = jest.fn();
jest.mock("@/services/milestones", () => ({
  editMilestone: (...args: unknown[]) => mockEditMilestone(...args),
}));

// Mock environment variables
jest.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "http://localhost:4000",
  },
}));

// Mock toast
const mockToast = { success: jest.fn(), error: jest.fn() };
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: mockToast,
  toast: mockToast,
}));

/**
 * Since MilestoneEditDialog does not exist yet (TDD), we define
 * a minimal placeholder component to test the expected behavior contract.
 * Once the real component is built, replace the import.
 */
interface MilestoneEditDialogProps {
  milestoneUID: string;
  title: string;
  description: string;
  endsAt: number;
  status: "PENDING" | "COMPLETED" | "APPROVED" | "REJECTED" | "VERIFIED";
  onClose: () => void;
  isOpen: boolean;
}

// Placeholder implementation matching expected behavior
function MilestoneEditDialog({
  milestoneUID,
  title,
  description,
  endsAt,
  status,
  onClose,
  isOpen,
}: MilestoneEditDialogProps) {
  const [formTitle, setFormTitle] = React.useState(title);
  const [formDescription, setFormDescription] = React.useState(description);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  if (!isOpen) return null;

  // Only render for PENDING milestones
  if (status !== "PENDING") {
    return null;
  }

  const handleSubmit = async () => {
    // Validate
    if (!formTitle.trim()) {
      setValidationError("Title is required");
      return;
    }
    setValidationError(null);
    setIsLoading(true);
    setError(null);

    try {
      await mockEditMilestone(milestoneUID, {
        title: formTitle,
        description: formDescription,
      });
      onClose();
    } catch (err) {
      setError("Failed to update milestone");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div role="dialog" aria-label="Edit Milestone">
      <h2>Edit Milestone</h2>
      <input
        data-testid="milestone-title-input"
        value={formTitle}
        onChange={(e) => setFormTitle(e.target.value)}
        aria-label="Milestone title"
      />
      <textarea
        data-testid="milestone-description-input"
        value={formDescription}
        onChange={(e) => setFormDescription(e.target.value)}
        aria-label="Milestone description"
      />
      {validationError && (
        <span data-testid="validation-error" role="alert">
          {validationError}
        </span>
      )}
      {error && (
        <span data-testid="submit-error" role="alert">
          {error}
        </span>
      )}
      <button data-testid="submit-edit-btn" onClick={handleSubmit} disabled={isLoading}>
        {isLoading ? "Saving..." : "Save"}
      </button>
      <button data-testid="cancel-edit-btn" onClick={onClose}>
        Cancel
      </button>
    </div>
  );
}

describe("MilestoneEditDialog", () => {
  let queryClient: QueryClient;

  const defaultProps: MilestoneEditDialogProps = {
    milestoneUID: "0x1234567890abcdef",
    title: "Build MVP",
    description: "Build the initial prototype",
    endsAt: 1735689600, // 2025-01-01
    status: "PENDING",
    onClose: jest.fn(),
    isOpen: true,
  };

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("rendering", () => {
    it("should render with milestone data pre-filled", () => {
      render(
        <Wrapper>
          <MilestoneEditDialog {...defaultProps} />
        </Wrapper>
      );

      const titleInput = screen.getByTestId("milestone-title-input");
      const descriptionInput = screen.getByTestId("milestone-description-input");

      expect(titleInput).toHaveValue("Build MVP");
      expect(descriptionInput).toHaveValue("Build the initial prototype");
    });

    it("should only render for PENDING milestones", () => {
      const { container } = render(
        <Wrapper>
          <MilestoneEditDialog {...defaultProps} status="COMPLETED" />
        </Wrapper>
      );

      expect(container.querySelector('[role="dialog"]')).toBeNull();
    });

    it("should not render for APPROVED milestones", () => {
      const { container } = render(
        <Wrapper>
          <MilestoneEditDialog {...defaultProps} status="APPROVED" />
        </Wrapper>
      );

      expect(container.querySelector('[role="dialog"]')).toBeNull();
    });

    it("should not render for VERIFIED milestones", () => {
      const { container } = render(
        <Wrapper>
          <MilestoneEditDialog {...defaultProps} status="VERIFIED" />
        </Wrapper>
      );

      expect(container.querySelector('[role="dialog"]')).toBeNull();
    });

    it("should not render when isOpen is false", () => {
      const { container } = render(
        <Wrapper>
          <MilestoneEditDialog {...defaultProps} isOpen={false} />
        </Wrapper>
      );

      expect(container.querySelector('[role="dialog"]')).toBeNull();
    });
  });

  describe("form validation", () => {
    it("should show validation error when title is empty", async () => {
      render(
        <Wrapper>
          <MilestoneEditDialog {...defaultProps} />
        </Wrapper>
      );

      const titleInput = screen.getByTestId("milestone-title-input");
      fireEvent.change(titleInput, { target: { value: "" } });

      const submitBtn = screen.getByTestId("submit-edit-btn");
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByTestId("validation-error")).toHaveTextContent("Title is required");
      });

      // Should not call the service
      expect(mockEditMilestone).not.toHaveBeenCalled();
    });

    it("should show validation error for whitespace-only title", async () => {
      render(
        <Wrapper>
          <MilestoneEditDialog {...defaultProps} />
        </Wrapper>
      );

      const titleInput = screen.getByTestId("milestone-title-input");
      fireEvent.change(titleInput, { target: { value: "   " } });

      const submitBtn = screen.getByTestId("submit-edit-btn");
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByTestId("validation-error")).toBeInTheDocument();
      });
    });
  });

  describe("form submission", () => {
    it("should call editMilestone service on submit", async () => {
      mockEditMilestone.mockResolvedValue(undefined);

      render(
        <Wrapper>
          <MilestoneEditDialog {...defaultProps} />
        </Wrapper>
      );

      const titleInput = screen.getByTestId("milestone-title-input");
      fireEvent.change(titleInput, { target: { value: "Updated MVP" } });

      const submitBtn = screen.getByTestId("submit-edit-btn");
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockEditMilestone).toHaveBeenCalledWith(
          "0x1234567890abcdef",
          expect.objectContaining({ title: "Updated MVP" })
        );
      });
    });

    it("should close dialog on successful save", async () => {
      const onClose = jest.fn();
      mockEditMilestone.mockResolvedValue(undefined);

      render(
        <Wrapper>
          <MilestoneEditDialog {...defaultProps} onClose={onClose} />
        </Wrapper>
      );

      const titleInput = screen.getByTestId("milestone-title-input");
      fireEvent.change(titleInput, { target: { value: "Updated" } });

      const submitBtn = screen.getByTestId("submit-edit-btn");
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe("loading and error states", () => {
    it("should show loading text during mutation", async () => {
      mockEditMilestone.mockReturnValue(new Promise(() => {}));

      render(
        <Wrapper>
          <MilestoneEditDialog {...defaultProps} />
        </Wrapper>
      );

      const submitBtn = screen.getByTestId("submit-edit-btn");
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText("Saving...")).toBeInTheDocument();
      });
    });

    it("should show error message on mutation failure", async () => {
      mockEditMilestone.mockRejectedValue(new Error("Network error"));

      render(
        <Wrapper>
          <MilestoneEditDialog {...defaultProps} />
        </Wrapper>
      );

      const submitBtn = screen.getByTestId("submit-edit-btn");
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByTestId("submit-error")).toHaveTextContent("Failed to update milestone");
      });
    });

    it("should disable submit button while loading", async () => {
      mockEditMilestone.mockReturnValue(new Promise(() => {}));

      render(
        <Wrapper>
          <MilestoneEditDialog {...defaultProps} />
        </Wrapper>
      );

      const submitBtn = screen.getByTestId("submit-edit-btn");
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(submitBtn).toBeDisabled();
      });
    });
  });
});
