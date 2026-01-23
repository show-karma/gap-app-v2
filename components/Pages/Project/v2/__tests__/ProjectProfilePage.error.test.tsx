/**
 * Error Scenario Tests for ProjectProfilePage and Related Components
 *
 * Tests error boundary behavior, API error handling, form validation errors,
 * and network failure scenarios for the project profile v2 components.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import type React from "react";

// =============================================================================
// Mock Dependencies - Must be before imports
// =============================================================================

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "test-project-123" }),
}));

// Mock stores
jest.mock("@/store", () => ({
  useProjectStore: () => ({ isProjectAdmin: false }),
}));

jest.mock("@/store/modals/endorsement", () => ({
  useEndorsementStore: () => ({
    isEndorsementOpen: false,
    setIsEndorsementOpen: jest.fn(),
  }),
}));

jest.mock("@/store/modals/intro", () => ({
  useIntroModalStore: () => ({
    isIntroModalOpen: false,
    setIsIntroModalOpen: jest.fn(),
  }),
}));

// Mock dialogs
jest.mock("@/components/Pages/Project/Impact/EndorsementDialog", () => ({
  EndorsementDialog: () => <div data-testid="endorsement-dialog">Endorsement Dialog</div>,
}));

jest.mock("@/components/Pages/Project/IntroDialog", () => ({
  IntroDialog: () => <div data-testid="intro-dialog">Intro Dialog</div>,
}));

// Mock wagmi
jest.mock("wagmi", () => ({
  useAccount: () => ({ address: "0x1234567890123456789012345678901234567890" }),
  useChainId: () => 1,
  useSwitchChain: () => ({ switchChainAsync: jest.fn() }),
}));

// Mock react-hot-toast
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetchData - will be configured per test
jest.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock errorManager
jest.mock("@/components/Utilities/errorManager", () => ({
  errorManager: jest.fn(),
}));

// Mock SingleProjectDonateModal
jest.mock("@/components/Donation/SingleProject/SingleProjectDonateModal", () => ({
  SingleProjectDonateModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="donate-modal">Donation Modal</div> : null,
}));

// Mock hasConfiguredPayoutAddresses
jest.mock("@/src/features/chain-payout-address/hooks/use-chain-payout-address", () => ({
  hasConfiguredPayoutAddresses: jest.fn(() => true),
}));

// Mock useProjectSocials
jest.mock("@/hooks/useProjectSocials", () => ({
  useProjectSocials: () => [],
}));

// Mock ActivityCard
jest.mock("@/components/Shared/ActivityCard", () => ({
  ActivityCard: ({ activity }: { activity: { data: { title: string } } }) => (
    <div data-testid="activity-card">{activity.data.title || "Activity"}</div>
  ),
}));

// Mock ImpactContent to avoid loading external dependencies
jest.mock("../MainContent/ImpactContent", () => ({
  ImpactContent: () => <div data-testid="impact-content">Impact Content Mock</div>,
}));

// Mock useProjectProfile - default implementation
const mockUseProjectProfile = jest.fn();
jest.mock("@/hooks/v2/useProjectProfile", () => ({
  useProjectProfile: () => mockUseProjectProfile(),
}));

// =============================================================================
// Import Components After Mocks
// =============================================================================

import toast from "react-hot-toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "@/utilities/fetchData";
import { SubscribeSection } from "../SidePanel/SubscribeSection";

// Get typed mocks
const mockToast = toast as jest.Mocked<typeof toast>;
const mockFetchData = fetchData as jest.MockedFunction<typeof fetchData>;
const mockErrorManager = errorManager as jest.MockedFunction<typeof errorManager>;

// =============================================================================
// Test Data
// =============================================================================

const mockProject = {
  uid: "0x1234567890123456789012345678901234567890" as `0x${string}`,
  chainID: 1,
  owner: "0x1234567890123456789012345678901234567890" as `0x${string}`,
  details: {
    title: "Test Project",
    description: "A test project description.",
    slug: "test-project",
    logoUrl: "https://example.com/logo.png",
    stageIn: "Growth",
    links: [],
  },
  members: [],
  endorsements: [],
};

const defaultMockProfileData = {
  project: mockProject,
  isLoading: false,
  error: null,
  isVerified: true,
  allUpdates: [],
  completedCount: 0,
  stats: {
    grantsCount: 0,
    endorsementsCount: 0,
    lastUpdate: undefined,
  },
  refetch: jest.fn(),
};

// =============================================================================
// Component that throws an error for testing ErrorBoundary
// =============================================================================

const ThrowError = ({
  shouldThrow = false,
  errorMessage = "Test error",
}: {
  shouldThrow?: boolean;
  errorMessage?: string;
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div data-testid="no-error">No error</div>;
};

// =============================================================================
// Tests
// =============================================================================

describe("ProjectProfilePage Error Scenarios", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchData.mockReset();
    mockUseProjectProfile.mockReturnValue(defaultMockProfileData);
    // Suppress React error boundary console errors during tests
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("ErrorBoundary Behavior", () => {
    it("should catch errors thrown by children and display default fallback", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Component crashed" />
        </ErrorBoundary>
      );

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(screen.getByText("Component crashed")).toBeInTheDocument();
    });

    it("should display custom fallback when provided", () => {
      const customFallback = <div data-testid="custom-fallback">Custom error message</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId("custom-fallback")).toBeInTheDocument();
      expect(screen.getByText("Custom error message")).toBeInTheDocument();
    });

    it("should call onError callback when error is caught", () => {
      const onErrorMock = jest.fn();

      render(
        <ErrorBoundary onError={onErrorMock}>
          <ThrowError shouldThrow={true} errorMessage="Error callback test" />
        </ErrorBoundary>
      );

      expect(onErrorMock).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it("should render children normally when no error occurs", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId("no-error")).toBeInTheDocument();
      expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
    });

    it("should provide Try again button to reset error state", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const tryAgainButton = screen.getByText("Try again");
      expect(tryAgainButton).toBeInTheDocument();
    });

    it("should reset error state when Try again is clicked", () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();

      const tryAgainButton = screen.getByText("Try again");
      fireEvent.click(tryAgainButton);

      // Rerender with non-throwing children
      rerender(
        <ErrorBoundary key="reset">
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId("no-error")).toBeInTheDocument();
    });

    it("should handle errors with no message gracefully", () => {
      const ThrowEmptyError = () => {
        throw new Error("");
      };

      render(
        <ErrorBoundary>
          <ThrowEmptyError />
        </ErrorBoundary>
      );

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
    });
  });

  describe("Form Validation Errors in SubscribeSection", () => {
    beforeEach(() => {
      mockFetchData.mockResolvedValue([{}, null]);
    });

    it("should display email validation error for invalid email", async () => {
      render(<SubscribeSection project={mockProject} />);

      const emailInput = screen.getByTestId("subscribe-email-input");
      fireEvent.change(emailInput, { target: { value: "invalid-email" } });
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(screen.getByTestId("subscribe-email-error")).toHaveTextContent(
          "Please enter a valid email address."
        );
      });
    });

    it("should display email validation error when submitting empty form", async () => {
      render(<SubscribeSection project={mockProject} />);

      const submitButton = screen.getByTestId("subscribe-button");
      fireEvent.click(submitButton);

      await waitFor(() => {
        const errorElement = screen.getByTestId("subscribe-email-error");
        expect(errorElement).toBeInTheDocument();
      });
    });

    it("should display name validation error when name exceeds 50 characters", async () => {
      render(<SubscribeSection project={mockProject} />);

      const nameInput = screen.getByTestId("subscribe-name-input");
      const longName = "A".repeat(51);

      fireEvent.change(nameInput, { target: { value: longName } });
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(screen.getByTestId("subscribe-name-error")).toHaveTextContent(
          "Name must be less than 50 characters"
        );
      });
    });

    it("should display already subscribed error from API response", async () => {
      // Mock API to return 422 error (already subscribed)
      mockFetchData.mockResolvedValue([null, "422 - Already subscribed"]);

      render(<SubscribeSection project={mockProject} />);

      const emailInput = screen.getByTestId("subscribe-email-input");
      const submitButton = screen.getByTestId("subscribe-button");

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining("already subscribed"));
      });
    });

    it("should show user-friendly error for already subscribed users in form", async () => {
      mockFetchData.mockResolvedValue([null, "422"]);

      render(<SubscribeSection project={mockProject} />);

      const emailInput = screen.getByTestId("subscribe-email-input");
      const submitButton = screen.getByTestId("subscribe-button");

      fireEvent.change(emailInput, { target: { value: "already@subscribed.com" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByTestId("subscribe-email-error");
        expect(errorMessage).toHaveTextContent("You have already subscribed to this project.");
      });
    });
  });

  describe("Network Failure Scenarios", () => {
    it("should handle network timeout error gracefully", async () => {
      mockFetchData.mockRejectedValue(new Error("Network timeout"));

      render(<SubscribeSection project={mockProject} />);

      const emailInput = screen.getByTestId("subscribe-email-input");
      const submitButton = screen.getByTestId("subscribe-button");

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockErrorManager).toHaveBeenCalledWith(
          expect.stringContaining("Error subscribing"),
          expect.any(Error),
          expect.any(Object),
          expect.any(Object)
        );
      });
    });

    it("should handle server 500 error gracefully", async () => {
      mockFetchData.mockResolvedValue([null, "500 - Internal Server Error"]);

      render(<SubscribeSection project={mockProject} />);

      const emailInput = screen.getByTestId("subscribe-email-input");
      const submitButton = screen.getByTestId("subscribe-button");

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockErrorManager).toHaveBeenCalled();
      });
    });

    it("should handle connection refused error gracefully", async () => {
      mockFetchData.mockRejectedValue(new Error("ECONNREFUSED"));

      render(<SubscribeSection project={mockProject} />);

      const emailInput = screen.getByTestId("subscribe-email-input");
      const submitButton = screen.getByTestId("subscribe-button");

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockErrorManager).toHaveBeenCalled();
      });
    });

    it("should show loading state during API call", async () => {
      // Create a promise that we control
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockFetchData.mockReturnValue(pendingPromise);

      render(<SubscribeSection project={mockProject} />);

      const emailInput = screen.getByTestId("subscribe-email-input");
      const submitButton = screen.getByTestId("subscribe-button");

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.click(submitButton);

      // Should show loading indicator (the Button component replaces text with spinner)
      await waitFor(() => {
        // Look for the loading spinner that appears during loading
        const loadingSpinner = document.querySelector('[role="status"]');
        expect(loadingSpinner).toBeInTheDocument();
      });

      // Resolve the promise to clean up
      resolvePromise!([{}, null]);
    });

    it("should reset form after successful subscription", async () => {
      mockFetchData.mockResolvedValue([{}, null]);

      render(<SubscribeSection project={mockProject} />);

      const nameInput = screen.getByTestId("subscribe-name-input") as HTMLInputElement;
      const emailInput = screen.getByTestId("subscribe-email-input") as HTMLInputElement;
      const submitButton = screen.getByTestId("subscribe-button");

      fireEvent.change(nameInput, { target: { value: "John" } });
      fireEvent.change(emailInput, { target: { value: "john@example.com" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
      });

      // Form should be reset
      await waitFor(() => {
        expect(nameInput.value).toBe("");
        expect(emailInput.value).toBe("");
      });
    });
  });

  describe("Loading State Handling", () => {
    it("should display loading indicator when useProjectProfile returns loading", async () => {
      mockUseProjectProfile.mockReturnValue({
        ...defaultMockProfileData,
        project: null,
        isLoading: true,
      });

      // Import and render ProjectProfilePage
      const { ProjectProfilePage } = await import("../ProjectProfilePage");

      render(<ProjectProfilePage />);

      expect(screen.getByText("Loading project...")).toBeInTheDocument();
      expect(screen.queryByTestId("project-profile-page")).not.toBeInTheDocument();
    });

    it("should show loading animation with correct styling", async () => {
      mockUseProjectProfile.mockReturnValue({
        ...defaultMockProfileData,
        project: null,
        isLoading: true,
      });

      const { ProjectProfilePage } = await import("../ProjectProfilePage");

      render(<ProjectProfilePage />);

      const loadingText = screen.getByText("Loading project...");
      expect(loadingText).toHaveClass("animate-pulse");
    });

    it("should show loading when project is null but not loading", async () => {
      mockUseProjectProfile.mockReturnValue({
        ...defaultMockProfileData,
        project: null,
        isLoading: false,
      });

      const { ProjectProfilePage } = await import("../ProjectProfilePage");

      render(<ProjectProfilePage />);

      // When project is null and not loading, still shows loading state
      expect(screen.getByText("Loading project...")).toBeInTheDocument();
    });
  });

  describe("User-Friendly Error Messages", () => {
    it("should show success message with project title on successful subscription", async () => {
      mockFetchData.mockResolvedValue([{}, null]);

      render(<SubscribeSection project={mockProject} />);

      const emailInput = screen.getByTestId("subscribe-email-input");
      const submitButton = screen.getByTestId("subscribe-button");

      fireEvent.change(emailInput, { target: { value: "new@subscriber.com" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining("Test Project"));
      });
    });

    it("should have accessible error messages with role=alert", async () => {
      render(<SubscribeSection project={mockProject} />);

      const emailInput = screen.getByTestId("subscribe-email-input");

      fireEvent.change(emailInput, { target: { value: "invalid" } });
      fireEvent.blur(emailInput);

      await waitFor(() => {
        const errorElement = screen.getByTestId("subscribe-email-error");
        expect(errorElement).toHaveAttribute("role", "alert");
      });
    });

    it("should display error messages for name field with role=alert", async () => {
      render(<SubscribeSection project={mockProject} />);

      const nameInput = screen.getByTestId("subscribe-name-input");
      const longName = "A".repeat(51);

      fireEvent.change(nameInput, { target: { value: longName } });
      fireEvent.blur(nameInput);

      await waitFor(() => {
        const errorElement = screen.getByTestId("subscribe-name-error");
        expect(errorElement).toHaveAttribute("role", "alert");
      });
    });

    it("should handle project with no title gracefully", async () => {
      const projectWithoutTitle = {
        ...mockProject,
        details: {
          ...mockProject.details,
          title: undefined,
        },
      };

      mockFetchData.mockResolvedValue([{}, null]);

      render(<SubscribeSection project={projectWithoutTitle as typeof mockProject} />);

      const emailInput = screen.getByTestId("subscribe-email-input");
      const submitButton = screen.getByTestId("subscribe-button");

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining("this project"));
      });
    });
  });

  describe("ErrorBoundary with ProjectProfilePage Fallback", () => {
    it("should display ProjectProfilePage-specific error message when ErrorBoundary catches error", () => {
      const customFallback = (
        <div className="p-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <h3
            className="text-lg font-medium text-red-800 dark:text-red-400 mb-2"
            data-testid="error-title"
          >
            Unable to load project
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300" data-testid="error-description">
            Something went wrong while loading the project profile. Please try refreshing the page.
          </p>
        </div>
      );

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} errorMessage="API Error" />
        </ErrorBoundary>
      );

      expect(screen.getByTestId("error-title")).toHaveTextContent("Unable to load project");
      expect(screen.getByTestId("error-description")).toHaveTextContent(
        "Something went wrong while loading the project profile"
      );
    });
  });

  describe("Multiple Error Scenarios", () => {
    it("should handle error then recovery with key change", () => {
      const { rerender } = render(
        <ErrorBoundary key="error-1">
          <ThrowError shouldThrow={true} errorMessage="First error" />
        </ErrorBoundary>
      );

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(screen.getByText("First error")).toBeInTheDocument();

      // Rerender with key change to reset ErrorBoundary and recover
      rerender(
        <ErrorBoundary key="recovery-1">
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId("no-error")).toBeInTheDocument();
    });

    it("should catch new error after key change and recovery", () => {
      const { rerender } = render(
        <ErrorBoundary key="initial">
          <ThrowError shouldThrow={true} errorMessage="Initial error" />
        </ErrorBoundary>
      );

      expect(screen.getByText("Initial error")).toBeInTheDocument();

      // Recovery with key change
      rerender(
        <ErrorBoundary key="recovered">
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId("no-error")).toBeInTheDocument();

      // New error with key change
      rerender(
        <ErrorBoundary key="new-error">
          <ThrowError shouldThrow={true} errorMessage="New error after recovery" />
        </ErrorBoundary>
      );

      expect(screen.getByText("New error after recovery")).toBeInTheDocument();
    });

    it("should maintain error boundary functionality across component lifecycle", () => {
      // Initial render without error
      const { rerender } = render(
        <ErrorBoundary key="lifecycle-1">
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId("no-error")).toBeInTheDocument();

      // Error occurs
      rerender(
        <ErrorBoundary key="lifecycle-2">
          <ThrowError shouldThrow={true} errorMessage="Lifecycle error" />
        </ErrorBoundary>
      );

      expect(screen.getByText("Lifecycle error")).toBeInTheDocument();

      // Back to normal
      rerender(
        <ErrorBoundary key="lifecycle-3">
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId("no-error")).toBeInTheDocument();
    });
  });
});
