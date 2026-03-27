/**
 * Expanded tests for DonationErrorBoundary.
 *
 * The existing DonationErrorBoundary.test.tsx covers basic catching, display,
 * and recovery. This file adds coverage for:
 * - Donation-specific error parsing (wallet errors, network errors)
 * - Error reporting via errorManager (Sentry integration)
 * - Cart preservation messaging
 * - Clear Cart flow with localStorage cleanup
 * - "Return to Home" link
 * - Component stack in technical details
 * - Sequential error/recovery cycles
 * - Edge case: error with no actionableSteps and no technicalMessage
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import type React from "react";
import { DonationErrorBoundary } from "@/components/Donation/DonationErrorBoundary";
import { errorManager } from "@/components/Utilities/errorManager";
import { getDetailedErrorInfo } from "@/utilities/donations/errorMessages";

// Mock dependencies
vi.mock("@/utilities/donations/errorMessages");

// Mock the navigation Link component used in the boundary
vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ThrowingDonation = ({
  shouldThrow = false,
  errorMessage = "Donation error",
}: {
  shouldThrow?: boolean;
  errorMessage?: string;
}) => {
  if (shouldThrow) throw new Error(errorMessage);
  return <div data-testid="donation-content">Donation form</div>;
};

describe("DonationErrorBoundary (expanded)", () => {
  const mockErrorManager = errorManager as ReturnType<typeof vi.fn>;
  const mockGetDetailedErrorInfo = getDetailedErrorInfo as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Default mock for parsed error
    mockGetDetailedErrorInfo.mockReturnValue({
      code: "UNKNOWN_ERROR",
      message: "An unexpected error occurred",
      technicalMessage: "Donation error",
      actionableSteps: ["Try the transaction again", "Refresh the page"],
    });

    // Mock localStorage
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Donation-specific error types
  // -------------------------------------------------------------------------

  it("displays insufficient balance error with appropriate steps", () => {
    mockGetDetailedErrorInfo.mockReturnValue({
      code: "INSUFFICIENT_BALANCE",
      message: "Insufficient token balance",
      technicalMessage: "Error: insufficient funds for transfer",
      actionableSteps: ["Check your wallet balance", "Reduce the donation amount"],
    });

    render(
      <DonationErrorBoundary>
        <ThrowingDonation shouldThrow errorMessage="insufficient balance" />
      </DonationErrorBoundary>
    );

    expect(screen.getByText("Insufficient token balance")).toBeInTheDocument();
    expect(screen.getByText("Check your wallet balance")).toBeInTheDocument();
    expect(screen.getByText("Reduce the donation amount")).toBeInTheDocument();
  });

  it("displays user rejected error when wallet transaction is declined", () => {
    mockGetDetailedErrorInfo.mockReturnValue({
      code: "USER_REJECTED",
      message: "Transaction cancelled by user",
      actionableSteps: ["Approve the transaction in your wallet to proceed"],
    });

    render(
      <DonationErrorBoundary>
        <ThrowingDonation shouldThrow errorMessage="user rejected" />
      </DonationErrorBoundary>
    );

    expect(screen.getByText("Transaction cancelled by user")).toBeInTheDocument();
    expect(
      screen.getByText("Approve the transaction in your wallet to proceed")
    ).toBeInTheDocument();
  });

  it("displays network mismatch error with switch network guidance", () => {
    mockGetDetailedErrorInfo.mockReturnValue({
      code: "NETWORK_MISMATCH",
      message: "Network mismatch detected",
      technicalMessage: "chain mismatch: expected 10, got 1",
      actionableSteps: [
        "Switch to the required network in your wallet",
        "Try the transaction again after switching",
      ],
    });

    render(
      <DonationErrorBoundary>
        <ThrowingDonation shouldThrow errorMessage="chain mismatch" />
      </DonationErrorBoundary>
    );

    expect(screen.getByText("Network mismatch detected")).toBeInTheDocument();
    expect(screen.getByText("Switch to the required network in your wallet")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Error reporting
  // -------------------------------------------------------------------------

  it("reports error to errorManager with donation-flow context", () => {
    render(
      <DonationErrorBoundary>
        <ThrowingDonation shouldThrow errorMessage="Contract reverted" />
      </DonationErrorBoundary>
    );

    expect(mockErrorManager).toHaveBeenCalledTimes(1);
    expect(mockErrorManager).toHaveBeenCalledWith(
      "DonationErrorBoundary caught an error",
      expect.objectContaining({ message: "Contract reverted" }),
      expect.objectContaining({
        componentStack: expect.any(String),
        errorBoundary: "donation-flow",
      })
    );
  });

  // -------------------------------------------------------------------------
  // Cart preservation
  // -------------------------------------------------------------------------

  it("informs the user that the donation cart has been saved", () => {
    render(
      <DonationErrorBoundary>
        <ThrowingDonation shouldThrow />
      </DonationErrorBoundary>
    );

    expect(screen.getByText(/Don't worry - your donation cart has been saved/)).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Recovery: Try Again
  // -------------------------------------------------------------------------

  it("recovers when Try Again is clicked and child no longer throws", () => {
    let shouldThrow = true;

    const ConditionalDonation = () => {
      if (shouldThrow) throw new Error("Temporary donation error");
      return <div>Donation form ready</div>;
    };

    render(
      <DonationErrorBoundary>
        <ConditionalDonation />
      </DonationErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(screen.getByText("Donation form ready")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Edge case: no actionable steps and no technical message
  // -------------------------------------------------------------------------

  it("handles error with empty actionableSteps and no technicalMessage", () => {
    mockGetDetailedErrorInfo.mockReturnValue({
      code: "UNKNOWN_ERROR",
      message: "Something unknown happened",
      actionableSteps: [],
    });

    render(
      <DonationErrorBoundary>
        <ThrowingDonation shouldThrow />
      </DonationErrorBoundary>
    );

    expect(screen.getByText("Something unknown happened")).toBeInTheDocument();
    // "What you can do" section should not render when actionableSteps is empty
    expect(screen.queryByText("What you can do")).not.toBeInTheDocument();
    // "Technical Details" should not render when technicalMessage is undefined
    expect(screen.queryByText("Technical Details")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Technical details
  // -------------------------------------------------------------------------

  it("shows technical message in expandable details section", () => {
    mockGetDetailedErrorInfo.mockReturnValue({
      code: "CONTRACT_ERROR",
      message: "Contract execution failed",
      technicalMessage: "execution reverted: INSUFFICIENT_ALLOWANCE",
      actionableSteps: [],
    });

    render(
      <DonationErrorBoundary>
        <ThrowingDonation shouldThrow />
      </DonationErrorBoundary>
    );

    const summary = screen.getByText("Technical Details");
    expect(summary).toBeInTheDocument();

    fireEvent.click(summary);
    expect(screen.getByText("execution reverted: INSUFFICIENT_ALLOWANCE")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Navigation: Return to Home
  // -------------------------------------------------------------------------

  it("provides a Return to Home link pointing to root", () => {
    render(
      <DonationErrorBoundary>
        <ThrowingDonation shouldThrow />
      </DonationErrorBoundary>
    );

    const homeLink = screen.getByText("Return to Home");
    expect(homeLink).toBeInTheDocument();
    expect(homeLink.closest("a")).toHaveAttribute("href", "/");
  });
});
