/**
 * Tests for DonationExecutor component
 *
 * Covers:
 * - Success state: button enabled and clickable
 * - Disabled states: various conditions that disable the button
 * - Loading/executing state: spinner shown
 * - Validation errors and transaction status rendered
 * - Accessibility labels
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DonationExecutor } from "@/components/Donation/DonationExecutor";
import type { SupportedToken } from "@/constants/supportedTokens";
import { renderWithProviders } from "../../utils/render";

// Mock child components
vi.mock("@/components/Donation/TransactionStatus", () => ({
  TransactionStatus: ({ transfers }: { transfers: any[] }) => (
    <div data-testid="transaction-status">Transfers: {transfers.length}</div>
  ),
}));

vi.mock("@/components/Donation/ValidationErrors", () => ({
  ValidationErrors: ({
    validationErrors,
    missingPayouts,
  }: {
    validationErrors: string[];
    missingPayouts: string[];
  }) => (
    <div data-testid="validation-errors">
      Errors: {validationErrors.length}, Missing: {missingPayouts.length}
    </div>
  ),
}));

const mockToken: SupportedToken = {
  address: "0xUSDC",
  symbol: "USDC",
  name: "USD Coin",
  decimals: 6,
  chainId: 10,
  chainName: "Optimism",
  isNative: false,
};

const defaultProps = {
  transfers: [],
  items: [{ uid: "p1", title: "Project 1" }],
  selectedTokens: { p1: mockToken },
  validationErrors: [],
  missingPayouts: [],
  isExecuting: false,
  isSwitching: false,
  isFetchingPayouts: false,
  isFetchingCrossChainBalances: false,
  isConnected: true,
  address: "0x1234567890123456789012345678901234567890",
  canProceed: true,
  isCurrentNetworkSupported: true,
  executionState: { phase: "idle" },
  executeButtonLabel: "Review & Donate",
  onExecute: vi.fn(),
};

describe("DonationExecutor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Success state", () => {
    it("should render the execute button with correct label", () => {
      renderWithProviders(<DonationExecutor {...defaultProps} />);

      const button = screen.getByTestId("execute-button");
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent("Review & Donate");
    });

    it("should enable the button when all conditions are met", () => {
      renderWithProviders(<DonationExecutor {...defaultProps} />);

      expect(screen.getByTestId("execute-button")).not.toBeDisabled();
    });

    it("should render the info note about approvals", () => {
      renderWithProviders(<DonationExecutor {...defaultProps} />);

      expect(screen.getByText(/approve each token once per network/)).toBeInTheDocument();
    });
  });

  describe("Disabled states", () => {
    it("should disable button when canProceed is false", () => {
      renderWithProviders(<DonationExecutor {...defaultProps} canProceed={false} />);

      expect(screen.getByTestId("execute-button")).toBeDisabled();
    });

    it("should disable button when not connected", () => {
      renderWithProviders(
        <DonationExecutor {...defaultProps} isConnected={false} address={undefined} />
      );

      expect(screen.getByTestId("execute-button")).toBeDisabled();
    });

    it("should disable button when network is unsupported", () => {
      renderWithProviders(<DonationExecutor {...defaultProps} isCurrentNetworkSupported={false} />);

      expect(screen.getByTestId("execute-button")).toBeDisabled();
    });

    it("should disable button when switching networks", () => {
      renderWithProviders(<DonationExecutor {...defaultProps} isSwitching={true} />);

      expect(screen.getByTestId("execute-button")).toBeDisabled();
    });

    it("should disable button when executing", () => {
      renderWithProviders(<DonationExecutor {...defaultProps} isExecuting={true} />);

      expect(screen.getByTestId("execute-button")).toBeDisabled();
    });

    it("should disable button when fetching payouts", () => {
      renderWithProviders(<DonationExecutor {...defaultProps} isFetchingPayouts={true} />);

      expect(screen.getByTestId("execute-button")).toBeDisabled();
    });

    it("should disable button when fetching balances", () => {
      renderWithProviders(
        <DonationExecutor {...defaultProps} isFetchingCrossChainBalances={true} />
      );

      expect(screen.getByTestId("execute-button")).toBeDisabled();
    });
  });

  describe("Executing state", () => {
    it("should show Processing... text and spinner when executing", () => {
      renderWithProviders(<DonationExecutor {...defaultProps} isExecuting={true} />);

      expect(screen.getByText("Processing...")).toBeInTheDocument();
    });

    it("should set aria-busy when executing", () => {
      renderWithProviders(<DonationExecutor {...defaultProps} isExecuting={true} />);

      expect(screen.getByTestId("execute-button")).toHaveAttribute("aria-busy", "true");
    });
  });

  describe("User interactions", () => {
    it("should call onExecute when button is clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(<DonationExecutor {...defaultProps} />);

      await user.click(screen.getByTestId("execute-button"));

      expect(defaultProps.onExecute).toHaveBeenCalledTimes(1);
    });
  });

  describe("Child components", () => {
    it("should render ValidationErrors", () => {
      renderWithProviders(<DonationExecutor {...defaultProps} />);

      expect(screen.getByTestId("validation-errors")).toBeInTheDocument();
    });

    it("should render TransactionStatus", () => {
      renderWithProviders(<DonationExecutor {...defaultProps} />);

      expect(screen.getByTestId("transaction-status")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have correct aria-label when ready", () => {
      renderWithProviders(<DonationExecutor {...defaultProps} />);

      expect(
        screen.getByLabelText("Review and send donations to selected projects")
      ).toBeInTheDocument();
    });

    it("should have correct aria-label when executing", () => {
      renderWithProviders(<DonationExecutor {...defaultProps} isExecuting={true} />);

      expect(screen.getByLabelText("Processing donations, please wait")).toBeInTheDocument();
    });

    it("should have correct aria-label when wallet not connected", () => {
      renderWithProviders(
        <DonationExecutor {...defaultProps} isConnected={false} address={undefined} />
      );

      expect(screen.getByLabelText("Connect wallet to proceed with donations")).toBeInTheDocument();
    });

    it("should have section landmark", () => {
      renderWithProviders(<DonationExecutor {...defaultProps} />);

      expect(screen.getByLabelText("Donation execution controls")).toBeInTheDocument();
    });
  });
});
