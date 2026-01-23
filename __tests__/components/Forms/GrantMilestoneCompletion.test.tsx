/**
 * @file Tests for GrantMilestoneCompletionForm component
 * @description Tests for grant milestone completion form component covering rendering, validation, and submission
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GrantMilestoneCompletionForm } from "@/components/Forms/GrantMilestoneCompletion";
import { useMilestone } from "@/hooks/useMilestone";
import type { UnifiedMilestone } from "@/types/roadmap";

jest.mock("@/hooks/useMilestone", () => ({
  useMilestone: jest.fn(),
}));

jest.mock("@/components/Forms/Outputs/OutputsSection", () => ({
  OutputsSection: () => <div data-testid="outputs-section">Outputs Section</div>,
}));

jest.mock("@/components/Utilities/MarkdownEditor", () => ({
  MarkdownEditor: ({ value, onChange, placeholderText }: any) => (
    <textarea
      data-testid="markdown-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholderText}
    />
  ),
}));

jest.mock("@/components/Utilities/Button", () => ({
  Button: ({ children, onClick, disabled, isLoading, type, className }: any) => (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      type={type}
      className={className}
      data-loading={isLoading}
    >
      {isLoading ? "Loading..." : children}
    </button>
  ),
}));

const mockUseMilestone = useMilestone as jest.MockedFunction<typeof useMilestone>;

describe("GrantMilestoneCompletionForm", () => {
  const mockMilestone: UnifiedMilestone = {
    uid: "milestone-123",
    title: "Test Milestone",
    type: "grant",
  } as UnifiedMilestone;

  const mockHandleCompleting = jest.fn();
  const mockCompleteMilestone = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMilestone.mockReturnValue({
      completeMilestone: mockCompleteMilestone,
    } as any);
  });

  it("should render form with all fields", () => {
    render(
      <GrantMilestoneCompletionForm
        milestone={mockMilestone}
        handleCompleting={mockHandleCompleting}
      />
    );

    expect(screen.getByText("Description (optional)")).toBeInTheDocument();
    expect(screen.getByText("What % of your grant is complete? (optional)")).toBeInTheDocument();
    expect(screen.getByTestId("outputs-section")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Complete")).toBeInTheDocument();
  });

  it("should render markdown editor for description", () => {
    render(
      <GrantMilestoneCompletionForm
        milestone={mockMilestone}
        handleCompleting={mockHandleCompleting}
      />
    );

    const editor = screen.getByTestId("markdown-editor");
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveAttribute("placeholder", "Describe what has been completed...");
  });

  it("should update description when markdown editor changes", () => {
    render(
      <GrantMilestoneCompletionForm
        milestone={mockMilestone}
        handleCompleting={mockHandleCompleting}
      />
    );

    const editor = screen.getByTestId("markdown-editor");
    fireEvent.change(editor, { target: { value: "Test description" } });

    expect(editor).toHaveValue("Test description");
  });

  it("should accept valid completion percentage", async () => {
    mockCompleteMilestone.mockResolvedValue(undefined);

    render(
      <GrantMilestoneCompletionForm
        milestone={mockMilestone}
        handleCompleting={mockHandleCompleting}
      />
    );

    // Fill in description to make form valid
    const descriptionEditor = screen.getByTestId("markdown-editor");
    fireEvent.change(descriptionEditor, { target: { value: "Test description" } });

    // Wait for form to become valid
    await waitFor(() => {
      const submitButton = screen.getByText("Complete");
      expect(submitButton).not.toBeDisabled();
    });

    // Enter valid percentage
    const percentageInput = screen.getByPlaceholderText("0-100");
    fireEvent.change(percentageInput, { target: { value: "75" } });

    const submitButton = screen.getByText("Complete");
    fireEvent.click(submitButton);

    // Should submit successfully with valid percentage
    await waitFor(() => {
      expect(mockCompleteMilestone).toHaveBeenCalledWith(
        mockMilestone,
        expect.objectContaining({
          completionPercentage: "75",
        })
      );
    });
  });

  it("should call completeMilestone on form submission", async () => {
    mockCompleteMilestone.mockResolvedValue(undefined);

    render(
      <GrantMilestoneCompletionForm
        milestone={mockMilestone}
        handleCompleting={mockHandleCompleting}
      />
    );

    // Form needs valid data - description with at least 3 characters
    const descriptionEditor = screen.getByTestId("markdown-editor");
    fireEvent.change(descriptionEditor, { target: { value: "Completed milestone" } });

    // Wait for form to become valid
    await waitFor(() => {
      const submitButton = screen.getByText("Complete");
      expect(submitButton).not.toBeDisabled();
    });

    const submitButton = screen.getByText("Complete");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCompleteMilestone).toHaveBeenCalledWith(
        mockMilestone,
        expect.objectContaining({
          description: "Completed milestone",
          completionPercentage: "",
          outputs: [],
          deliverables: [],
          noProofCheckbox: true,
        })
      );
    });
  });

  it("should call handleCompleting(false) after successful submission", async () => {
    mockCompleteMilestone.mockResolvedValue(undefined);

    render(
      <GrantMilestoneCompletionForm
        milestone={mockMilestone}
        handleCompleting={mockHandleCompleting}
      />
    );

    // Form needs valid data
    const descriptionEditor = screen.getByTestId("markdown-editor");
    fireEvent.change(descriptionEditor, { target: { value: "Test description" } });

    await waitFor(() => {
      const submitButton = screen.getByText("Complete");
      expect(submitButton).not.toBeDisabled();
    });

    const submitButton = screen.getByText("Complete");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockHandleCompleting).toHaveBeenCalledWith(false);
    });
  });

  it("should not call handleCompleting on error", async () => {
    const error = new Error("Failed to complete milestone");
    mockCompleteMilestone.mockRejectedValue(error);

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    render(
      <GrantMilestoneCompletionForm
        milestone={mockMilestone}
        handleCompleting={mockHandleCompleting}
      />
    );

    // Form needs valid data
    const descriptionEditor = screen.getByTestId("markdown-editor");
    fireEvent.change(descriptionEditor, { target: { value: "Test description" } });

    await waitFor(() => {
      const submitButton = screen.getByText("Complete");
      expect(submitButton).not.toBeDisabled();
    });

    const submitButton = screen.getByText("Complete");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCompleteMilestone).toHaveBeenCalled();
    });

    expect(mockHandleCompleting).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error completing milestone:", error);

    consoleErrorSpy.mockRestore();
  });

  it("should disable submit button when form is invalid", () => {
    render(
      <GrantMilestoneCompletionForm
        milestone={mockMilestone}
        handleCompleting={mockHandleCompleting}
      />
    );

    const submitButton = screen.getByText("Complete");
    expect(submitButton).toBeDisabled();
  });

  it("should call handleCompleting(false) when cancel button is clicked", () => {
    render(
      <GrantMilestoneCompletionForm
        milestone={mockMilestone}
        handleCompleting={mockHandleCompleting}
      />
    );

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(mockHandleCompleting).toHaveBeenCalledWith(false);
  });

  it("should show loading state during submission", async () => {
    mockCompleteMilestone.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
    );

    render(
      <GrantMilestoneCompletionForm
        milestone={mockMilestone}
        handleCompleting={mockHandleCompleting}
      />
    );

    // Form needs valid data - description with at least 3 characters
    const descriptionEditor = screen.getByTestId("markdown-editor");
    fireEvent.change(descriptionEditor, { target: { value: "Test description" } });

    await waitFor(() => {
      const submitButton = screen.getByText("Complete");
      expect(submitButton).not.toBeDisabled();
    });

    const submitButton = screen.getByText("Complete");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });
});
