import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AxiosError } from "axios";
import type { ReactElement } from "react";
import toast from "react-hot-toast";
import AIEvaluationButton from "@/components/FundingPlatform/ApplicationView/AIEvaluationButton";
import { fundingApplicationsAPI } from "@/services/fundingPlatformService";

// Mock dependencies
vi.mock("@/services/fundingPlatformService", () => ({
  fundingApplicationsAPI: {
    runAIEvaluation: vi.fn(),
    runInternalAIEvaluation: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/components/Utilities/Button", () => ({
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

vi.mock("@heroicons/react/24/outline", () => ({
  SparklesIcon: (props: any) => <svg data-testid="sparkles-icon" {...props} />,
}));

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderWithClient(ui: ReactElement, client: QueryClient = makeClient()) {
  return {
    client,
    ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>),
  };
}

describe("AIEvaluationButton", () => {
  const mockReferenceNumber = "APP-12345-67890";
  const mockOnEvaluationComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Regular Mode (Default)", () => {
    it("should render button with correct text", () => {
      renderWithClient(<AIEvaluationButton referenceNumber={mockReferenceNumber} />);

      expect(screen.getByText("Run AI Evaluation")).toBeInTheDocument();
    });

    it("should call runAIEvaluation API when clicked", async () => {
      const user = userEvent.setup();
      (fundingApplicationsAPI.runAIEvaluation as vi.Mock).mockResolvedValue({
        success: true,
        referenceNumber: mockReferenceNumber,
        evaluation: '{"score": 8}',
        promptId: "prompt-123",
        updatedAt: new Date().toISOString(),
      });

      renderWithClient(<AIEvaluationButton referenceNumber={mockReferenceNumber} />);

      const button = screen.getByTestId("evaluation-button");
      await user.click(button);

      await waitFor(() => {
        expect(fundingApplicationsAPI.runAIEvaluation).toHaveBeenCalledWith(mockReferenceNumber);
      });
    });

    it("should show success toast on successful evaluation", async () => {
      const user = userEvent.setup();
      (fundingApplicationsAPI.runAIEvaluation as vi.Mock).mockResolvedValue({
        success: true,
        referenceNumber: mockReferenceNumber,
      });

      renderWithClient(<AIEvaluationButton referenceNumber={mockReferenceNumber} />);

      const button = screen.getByTestId("evaluation-button");
      await user.click(button);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("AI evaluation completed successfully!");
      });
    });

    it("should call onEvaluationComplete callback after success", async () => {
      const user = userEvent.setup();
      (fundingApplicationsAPI.runAIEvaluation as vi.Mock).mockResolvedValue({
        success: true,
        referenceNumber: mockReferenceNumber,
      });

      renderWithClient(
        <AIEvaluationButton
          referenceNumber={mockReferenceNumber}
          onEvaluationComplete={mockOnEvaluationComplete}
        />
      );

      const button = screen.getByTestId("evaluation-button");
      await user.click(button);

      await waitFor(() => {
        expect(mockOnEvaluationComplete).toHaveBeenCalled();
      });
    });

    it("should invalidate funding-application and applications queries after success", async () => {
      const user = userEvent.setup();
      (fundingApplicationsAPI.runAIEvaluation as vi.Mock).mockResolvedValue({
        success: true,
        referenceNumber: mockReferenceNumber,
      });

      const client = makeClient();
      const invalidateSpy = vi.spyOn(client, "invalidateQueries");

      renderWithClient(<AIEvaluationButton referenceNumber={mockReferenceNumber} />, client);

      const button = screen.getByTestId("evaluation-button");
      await user.click(button);

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["funding-application"] });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["applications"] });
      });
    });
  });

  describe("Internal Mode", () => {
    it("should render button with 'Internal' prefix in text", () => {
      renderWithClient(
        <AIEvaluationButton referenceNumber={mockReferenceNumber} isInternal={true} />
      );

      expect(screen.getByText("Run Internal AI Evaluation")).toBeInTheDocument();
    });

    it("should call runInternalAIEvaluation API when clicked", async () => {
      const user = userEvent.setup();
      (fundingApplicationsAPI.runInternalAIEvaluation as vi.Mock).mockResolvedValue({
        success: true,
        referenceNumber: mockReferenceNumber,
        evaluation: '{"score": 8}',
        promptId: "prompt-123",
        updatedAt: new Date().toISOString(),
      });

      renderWithClient(
        <AIEvaluationButton referenceNumber={mockReferenceNumber} isInternal={true} />
      );

      const button = screen.getByTestId("evaluation-button");
      await user.click(button);

      await waitFor(() => {
        expect(fundingApplicationsAPI.runInternalAIEvaluation).toHaveBeenCalledWith(
          mockReferenceNumber
        );
        expect(fundingApplicationsAPI.runAIEvaluation).not.toHaveBeenCalled();
      });
    });

    it("should show internal success toast message", async () => {
      const user = userEvent.setup();
      (fundingApplicationsAPI.runInternalAIEvaluation as vi.Mock).mockResolvedValue({
        success: true,
        referenceNumber: mockReferenceNumber,
      });

      renderWithClient(
        <AIEvaluationButton referenceNumber={mockReferenceNumber} isInternal={true} />
      );

      const button = screen.getByTestId("evaluation-button");
      await user.click(button);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Internal AI evaluation completed successfully!"
        );
      });
    });
  });

  describe("Loading State", () => {
    it("should show loading text during evaluation", async () => {
      const user = userEvent.setup();
      (fundingApplicationsAPI.runAIEvaluation as vi.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      renderWithClient(<AIEvaluationButton referenceNumber={mockReferenceNumber} />);

      const button = screen.getByTestId("evaluation-button");
      await user.click(button);

      expect(await screen.findByText("Running AI Evaluation...")).toBeInTheDocument();
    });

    it("should show internal loading text during internal evaluation", async () => {
      const user = userEvent.setup();
      (fundingApplicationsAPI.runInternalAIEvaluation as vi.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      renderWithClient(
        <AIEvaluationButton referenceNumber={mockReferenceNumber} isInternal={true} />
      );

      const button = screen.getByTestId("evaluation-button");
      await user.click(button);

      expect(await screen.findByText("Running Internal AI Evaluation...")).toBeInTheDocument();
    });

    it("should disable button during evaluation", async () => {
      const user = userEvent.setup();
      (fundingApplicationsAPI.runAIEvaluation as vi.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      renderWithClient(<AIEvaluationButton referenceNumber={mockReferenceNumber} />);

      const button = screen.getByTestId("evaluation-button") as HTMLButtonElement;
      await user.click(button);

      await waitFor(() => expect(button.disabled).toBe(true));
    });

    it("should set aria-busy during evaluation", async () => {
      const user = userEvent.setup();
      (fundingApplicationsAPI.runAIEvaluation as vi.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      renderWithClient(<AIEvaluationButton referenceNumber={mockReferenceNumber} />);

      const button = screen.getByTestId("evaluation-button");
      await user.click(button);

      await waitFor(() => expect(button.getAttribute("aria-busy")).toBe("true"));
    });

    it("should add animate-pulse class during evaluation", async () => {
      const user = userEvent.setup();
      (fundingApplicationsAPI.runAIEvaluation as vi.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      renderWithClient(<AIEvaluationButton referenceNumber={mockReferenceNumber} />);

      const button = screen.getByTestId("evaluation-button");
      await user.click(button);

      await waitFor(() => expect(button.className).toContain("animate-pulse"));
    });
  });

  describe("Disabled State", () => {
    it("should disable button when disabled prop is true", () => {
      renderWithClient(
        <AIEvaluationButton referenceNumber={mockReferenceNumber} disabled={true} />
      );

      const button = screen.getByTestId("evaluation-button") as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });

    it("should not call API when disabled and clicked", async () => {
      const user = userEvent.setup();
      renderWithClient(
        <AIEvaluationButton referenceNumber={mockReferenceNumber} disabled={true} />
      );

      const button = screen.getByTestId("evaluation-button");
      await user.click(button);

      expect(fundingApplicationsAPI.runAIEvaluation).not.toHaveBeenCalled();
    });

    it("should not call API when already evaluating", async () => {
      const user = userEvent.setup();
      (fundingApplicationsAPI.runAIEvaluation as vi.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      renderWithClient(<AIEvaluationButton referenceNumber={mockReferenceNumber} />);

      const button = screen.getByTestId("evaluation-button");
      await user.click(button);
      await user.click(button); // Second click should be ignored

      await waitFor(() => {
        expect(fundingApplicationsAPI.runAIEvaluation).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Error Handling", () => {
    it("should surface the backend response message for Axios errors", async () => {
      const user = userEvent.setup();
      const axiosError = {
        isAxiosError: true,
        response: {
          data: {
            message: "Custom error message",
          },
        },
        message: "Request failed",
      } as unknown as AxiosError<{ message?: string }>;

      (fundingApplicationsAPI.runAIEvaluation as vi.Mock).mockRejectedValue(axiosError);

      renderWithClient(<AIEvaluationButton referenceNumber={mockReferenceNumber} />);

      const button = screen.getByTestId("evaluation-button");
      await user.click(button);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Custom error message");
      });
    });

    it("should fall back to the axios message when there is no response data", async () => {
      const user = userEvent.setup();
      const axiosError = {
        isAxiosError: true,
        response: undefined,
        message: "Network error",
      } as unknown as AxiosError<{ message?: string }>;

      (fundingApplicationsAPI.runAIEvaluation as vi.Mock).mockRejectedValue(axiosError);

      renderWithClient(<AIEvaluationButton referenceNumber={mockReferenceNumber} />);

      const button = screen.getByTestId("evaluation-button");
      await user.click(button);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Network error");
      });
    });

    it("should handle generic Error objects", async () => {
      const user = userEvent.setup();
      const genericError = new Error("Generic error message");

      (fundingApplicationsAPI.runAIEvaluation as vi.Mock).mockRejectedValue(genericError);

      renderWithClient(<AIEvaluationButton referenceNumber={mockReferenceNumber} />);

      const button = screen.getByTestId("evaluation-button");
      await user.click(button);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Generic error message");
      });
    });

    it("should fall back to the default message for unknown error types", async () => {
      const user = userEvent.setup();
      const unknownError = "String error";

      (fundingApplicationsAPI.runAIEvaluation as vi.Mock).mockRejectedValue(unknownError);

      renderWithClient(<AIEvaluationButton referenceNumber={mockReferenceNumber} />);

      const button = screen.getByTestId("evaluation-button");
      await user.click(button);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to run AI evaluation");
      });
    });

    it("should show the backend message for internal mode failures", async () => {
      const user = userEvent.setup();
      const error = new Error("Internal evaluation failed");

      (fundingApplicationsAPI.runInternalAIEvaluation as vi.Mock).mockRejectedValue(error);

      renderWithClient(
        <AIEvaluationButton referenceNumber={mockReferenceNumber} isInternal={true} />
      );

      const button = screen.getByTestId("evaluation-button");
      await user.click(button);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Internal evaluation failed");
      });
    });

    it("should report failure when onEvaluationComplete rejects", async () => {
      const user = userEvent.setup();
      (fundingApplicationsAPI.runAIEvaluation as vi.Mock).mockResolvedValue({
        success: true,
        referenceNumber: mockReferenceNumber,
      });

      const failingCallback = vi.fn().mockRejectedValue(new Error("Callback failed"));

      renderWithClient(
        <AIEvaluationButton
          referenceNumber={mockReferenceNumber}
          onEvaluationComplete={failingCallback}
        />
      );

      const button = screen.getByTestId("evaluation-button");
      await user.click(button);

      // The callback runs inside the mutation's onSuccess chain, so its
      // rejection rejects mutateAsync and is reported via the error toast.
      await waitFor(() => {
        expect(failingCallback).toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith("Callback failed");
      });
    });
  });

  describe("Accessibility", () => {
    it("should have correct aria-label when idle", () => {
      renderWithClient(<AIEvaluationButton referenceNumber={mockReferenceNumber} />);

      const button = screen.getByTestId("evaluation-button");
      expect(button.getAttribute("aria-label")).toBe("Run AI evaluation");
    });

    it("should have correct aria-label for internal mode", () => {
      renderWithClient(
        <AIEvaluationButton referenceNumber={mockReferenceNumber} isInternal={true} />
      );

      const button = screen.getByTestId("evaluation-button");
      expect(button.getAttribute("aria-label")).toBe("Run Internal AI evaluation");
    });

    it("should update aria-label during loading", async () => {
      const user = userEvent.setup();
      (fundingApplicationsAPI.runAIEvaluation as vi.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      renderWithClient(<AIEvaluationButton referenceNumber={mockReferenceNumber} />);

      const button = screen.getByTestId("evaluation-button");
      await user.click(button);

      await waitFor(() =>
        expect(button.getAttribute("aria-label")).toBe("AI evaluation in progress")
      );
    });
  });
});
