import { beforeEach, describe, expect, it } from "bun:test";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AxiosError } from "axios";
import toast from "react-hot-toast";
import AIEvaluationButton from "@/components/FundingPlatform/ApplicationView/AIEvaluationButton";
import { fundingApplicationsAPI } from "@/services/fundingPlatformService";

// Mock dependencies
jest.mock("@/services/fundingPlatformService", () => ({
  fundingApplicationsAPI: {
    runAIEvaluation: jest.fn(),
    runInternalAIEvaluation: jest.fn(),
  },
}));

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/components/Utilities/Button", () => ({
  Button: ({
    onClick,
    disabled,
    children,
    className,
    "aria-label": ariaLabel,
    "aria-busy": ariaBusy,
  }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      aria-label={ariaLabel}
      aria-busy={ariaBusy}
      data-testid="evaluation-button"
    >
      {children}
    </button>
  ),
}));

jest.mock("@heroicons/react/24/outline", () => ({
  SparklesIcon: (props: any) => <svg data-testid="sparkles-icon" {...props} />,
}));

describe("AIEvaluationButton", () => {
  const mockReferenceNumber = "APP-12345-67890";
  const mockOnEvaluationComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Regular Mode (Default)", () => {
    it("should render button with correct text", () => {
      render(<AIEvaluationButton referenceNumber={mockReferenceNumber} />);

      expect(screen.getByText("Run AI Evaluation")).toBeInTheDocument();
    });

    it("should call runAIEvaluation API when clicked", async () => {
      (fundingApplicationsAPI.runAIEvaluation as jest.Mock).mockResolvedValue({
        success: true,
        referenceNumber: mockReferenceNumber,
        evaluation: '{"score": 8}',
        promptId: "prompt-123",
        updatedAt: new Date().toISOString(),
      });

      render(<AIEvaluationButton referenceNumber={mockReferenceNumber} />);

      const button = screen.getByTestId("evaluation-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(fundingApplicationsAPI.runAIEvaluation).toHaveBeenCalledWith(mockReferenceNumber);
      });
    });

    it("should show success toast on successful evaluation", async () => {
      (fundingApplicationsAPI.runAIEvaluation as jest.Mock).mockResolvedValue({
        success: true,
        referenceNumber: mockReferenceNumber,
      });

      render(<AIEvaluationButton referenceNumber={mockReferenceNumber} />);

      const button = screen.getByTestId("evaluation-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("AI evaluation completed successfully!");
      });
    });

    it("should call onEvaluationComplete callback after success", async () => {
      (fundingApplicationsAPI.runAIEvaluation as jest.Mock).mockResolvedValue({
        success: true,
        referenceNumber: mockReferenceNumber,
      });

      render(
        <AIEvaluationButton
          referenceNumber={mockReferenceNumber}
          onEvaluationComplete={mockOnEvaluationComplete}
        />
      );

      const button = screen.getByTestId("evaluation-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockOnEvaluationComplete).toHaveBeenCalled();
      });
    });
  });

  describe("Internal Mode", () => {
    it("should render button with 'Internal' prefix in text", () => {
      render(<AIEvaluationButton referenceNumber={mockReferenceNumber} isInternal={true} />);

      expect(screen.getByText("Run Internal AI Evaluation")).toBeInTheDocument();
    });

    it("should call runInternalAIEvaluation API when clicked", async () => {
      (fundingApplicationsAPI.runInternalAIEvaluation as jest.Mock).mockResolvedValue({
        success: true,
        referenceNumber: mockReferenceNumber,
        evaluation: '{"score": 8}',
        promptId: "prompt-123",
        updatedAt: new Date().toISOString(),
      });

      render(<AIEvaluationButton referenceNumber={mockReferenceNumber} isInternal={true} />);

      const button = screen.getByTestId("evaluation-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(fundingApplicationsAPI.runInternalAIEvaluation).toHaveBeenCalledWith(
          mockReferenceNumber
        );
        expect(fundingApplicationsAPI.runAIEvaluation).not.toHaveBeenCalled();
      });
    });

    it("should show internal success toast message", async () => {
      (fundingApplicationsAPI.runInternalAIEvaluation as jest.Mock).mockResolvedValue({
        success: true,
        referenceNumber: mockReferenceNumber,
      });

      render(<AIEvaluationButton referenceNumber={mockReferenceNumber} isInternal={true} />);

      const button = screen.getByTestId("evaluation-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Internal AI evaluation completed successfully!"
        );
      });
    });
  });

  describe("Loading State", () => {
    it("should show loading text during evaluation", async () => {
      (fundingApplicationsAPI.runAIEvaluation as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      render(<AIEvaluationButton referenceNumber={mockReferenceNumber} />);

      const button = screen.getByTestId("evaluation-button");
      fireEvent.click(button);

      expect(screen.getByText("Running AI Evaluation...")).toBeInTheDocument();
    });

    it("should show internal loading text during internal evaluation", async () => {
      (fundingApplicationsAPI.runInternalAIEvaluation as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      render(<AIEvaluationButton referenceNumber={mockReferenceNumber} isInternal={true} />);

      const button = screen.getByTestId("evaluation-button");
      fireEvent.click(button);

      expect(screen.getByText("Running Internal AI Evaluation...")).toBeInTheDocument();
    });

    it("should disable button during evaluation", async () => {
      (fundingApplicationsAPI.runAIEvaluation as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      render(<AIEvaluationButton referenceNumber={mockReferenceNumber} />);

      const button = screen.getByTestId("evaluation-button") as HTMLButtonElement;
      fireEvent.click(button);

      expect(button.disabled).toBe(true);
    });

    it("should set aria-busy during evaluation", async () => {
      (fundingApplicationsAPI.runAIEvaluation as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      render(<AIEvaluationButton referenceNumber={mockReferenceNumber} />);

      const button = screen.getByTestId("evaluation-button");
      fireEvent.click(button);

      expect(button.getAttribute("aria-busy")).toBe("true");
    });

    it("should add animate-pulse class during evaluation", async () => {
      (fundingApplicationsAPI.runAIEvaluation as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      render(<AIEvaluationButton referenceNumber={mockReferenceNumber} />);

      const button = screen.getByTestId("evaluation-button");
      fireEvent.click(button);

      expect(button.className).toContain("animate-pulse");
    });
  });

  describe("Disabled State", () => {
    it("should disable button when disabled prop is true", () => {
      render(<AIEvaluationButton referenceNumber={mockReferenceNumber} disabled={true} />);

      const button = screen.getByTestId("evaluation-button") as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });

    it("should not call API when disabled and clicked", () => {
      render(<AIEvaluationButton referenceNumber={mockReferenceNumber} disabled={true} />);

      const button = screen.getByTestId("evaluation-button");
      fireEvent.click(button);

      expect(fundingApplicationsAPI.runAIEvaluation).not.toHaveBeenCalled();
    });

    it("should not call API when already evaluating", async () => {
      (fundingApplicationsAPI.runAIEvaluation as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      render(<AIEvaluationButton referenceNumber={mockReferenceNumber} />);

      const button = screen.getByTestId("evaluation-button");
      fireEvent.click(button);
      fireEvent.click(button); // Second click should be ignored

      await waitFor(() => {
        expect(fundingApplicationsAPI.runAIEvaluation).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle Axios errors with response data", async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          data: {
            message: "Custom error message",
          },
        },
        message: "Request failed",
      } as unknown as AxiosError<{ message?: string }>;

      (fundingApplicationsAPI.runAIEvaluation as jest.Mock).mockRejectedValue(axiosError);

      render(<AIEvaluationButton referenceNumber={mockReferenceNumber} />);

      const button = screen.getByTestId("evaluation-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Custom error message");
      });
    });

    it("should handle Axios errors without response data", async () => {
      // Axios errors without response still have response property (can be undefined)
      const axiosError = {
        isAxiosError: true,
        response: undefined,
        message: "Network error",
      } as unknown as AxiosError<{ message?: string }>;

      (fundingApplicationsAPI.runAIEvaluation as jest.Mock).mockRejectedValue(axiosError);

      render(<AIEvaluationButton referenceNumber={mockReferenceNumber} />);

      const button = screen.getByTestId("evaluation-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Network error");
      });
    });

    it("should handle generic Error objects", async () => {
      const genericError = new Error("Generic error message");

      (fundingApplicationsAPI.runAIEvaluation as jest.Mock).mockRejectedValue(genericError);

      render(<AIEvaluationButton referenceNumber={mockReferenceNumber} />);

      const button = screen.getByTestId("evaluation-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Generic error message");
      });
    });

    it("should handle unknown error types", async () => {
      const unknownError = "String error";

      (fundingApplicationsAPI.runAIEvaluation as jest.Mock).mockRejectedValue(unknownError);

      render(<AIEvaluationButton referenceNumber={mockReferenceNumber} />);

      const button = screen.getByTestId("evaluation-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to run AI evaluation");
      });
    });

    it("should show internal error message for internal mode", async () => {
      const error = new Error("Internal evaluation failed");

      (fundingApplicationsAPI.runInternalAIEvaluation as jest.Mock).mockRejectedValue(error);

      render(<AIEvaluationButton referenceNumber={mockReferenceNumber} isInternal={true} />);

      const button = screen.getByTestId("evaluation-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Internal evaluation failed");
      });
    });
  });

  describe("Callback Error Handling", () => {
    it("should handle errors in onEvaluationComplete callback", async () => {
      (fundingApplicationsAPI.runAIEvaluation as jest.Mock).mockResolvedValue({
        success: true,
        referenceNumber: mockReferenceNumber,
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const failingCallback = jest.fn().mockRejectedValue(new Error("Callback failed"));

      render(
        <AIEvaluationButton
          referenceNumber={mockReferenceNumber}
          onEvaluationComplete={failingCallback}
        />
      );

      const button = screen.getByTestId("evaluation-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(failingCallback).toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith(
          "Evaluation completed but failed to refresh the display. Please reload the page."
        );
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    it("should show internal callback error message for internal mode", async () => {
      (fundingApplicationsAPI.runInternalAIEvaluation as jest.Mock).mockResolvedValue({
        success: true,
        referenceNumber: mockReferenceNumber,
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const failingCallback = jest.fn().mockRejectedValue(new Error("Callback failed"));

      render(
        <AIEvaluationButton
          referenceNumber={mockReferenceNumber}
          isInternal={true}
          onEvaluationComplete={failingCallback}
        />
      );

      const button = screen.getByTestId("evaluation-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("internal"),
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Accessibility", () => {
    it("should have correct aria-label when idle", () => {
      render(<AIEvaluationButton referenceNumber={mockReferenceNumber} />);

      const button = screen.getByTestId("evaluation-button");
      expect(button.getAttribute("aria-label")).toBe("Run AI evaluation");
    });

    it("should have correct aria-label for internal mode", () => {
      render(<AIEvaluationButton referenceNumber={mockReferenceNumber} isInternal={true} />);

      const button = screen.getByTestId("evaluation-button");
      expect(button.getAttribute("aria-label")).toBe("Run Internal AI evaluation");
    });

    it("should update aria-label during loading", async () => {
      (fundingApplicationsAPI.runAIEvaluation as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      render(<AIEvaluationButton referenceNumber={mockReferenceNumber} />);

      const button = screen.getByTestId("evaluation-button");
      fireEvent.click(button);

      expect(button.getAttribute("aria-label")).toBe("AI evaluation in progress");
    });
  });
});
