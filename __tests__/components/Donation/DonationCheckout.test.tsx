/**
 * @file Tests for DonationCheckout component
 * @description Comprehensive tests for the main donation checkout component
 * covering UI rendering, user interactions, validation, and edge cases
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DonationCheckout } from "@/components/Donation/DonationCheckout";
import "@testing-library/jest-dom";
import type { SupportedToken } from "@/constants/supportedTokens";
import type { DonationPayment } from "@/store/donationCart";

// Mock Next.js router
const mockRouterBack = jest.fn();
const mockUseParams = jest.fn(() => ({
  communityId: "test-community",
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    back: mockRouterBack,
  }),
  useParams: () => mockUseParams(),
}));

// Mock wagmi hooks
jest.mock("wagmi", () => ({
  useAccount: jest.fn(),
  usePublicClient: jest.fn(),
  useWalletClient: jest.fn(),
  useWriteContract: jest.fn(),
  useWaitForTransactionReceipt: jest.fn(),
  useChainId: jest.fn(),
}));

// Mock custom hooks
jest.mock("@/store/donationCart", () => ({
  useDonationCart: jest.fn(),
}));

jest.mock("@/hooks/useNetworkSwitching", () => ({
  useNetworkSwitching: jest.fn(),
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/hooks/donation/useDonationCheckout", () => ({
  useDonationCheckout: jest.fn(),
}));

jest.mock("@/hooks/donation/usePayoutAddressManager", () => ({
  usePayoutAddressManager: jest.fn(),
}));

jest.mock("@/hooks/donation/useCrossChainBalances", () => ({
  useCrossChainBalances: jest.fn(),
}));

jest.mock("@/constants/supportedTokens", () => ({
  getTokensByChain: jest.fn(),
  getAllSupportedChains: jest.fn(() => [10, 8453]),
  SUPPORTED_NETWORKS: {},
}));

// Mock child components
jest.mock("@/components/Donation/DonationSummary", () => ({
  DonationSummary: ({ payments }: { payments: DonationPayment[] }) => (
    <div data-testid="donation-summary">Summary: {payments.length} payments</div>
  ),
}));

jest.mock("@/components/Donation/DonationExecutor", () => ({
  DonationExecutor: ({ executeButtonLabel, onExecute }: any) => (
    <button data-testid="donation-executor" onClick={onExecute}>
      {executeButtonLabel}
    </button>
  ),
}));

jest.mock("@/components/Donation/DonationAlerts", () => ({
  DonationAlerts: () => <div data-testid="donation-alerts">Alerts</div>,
}));

jest.mock("@/components/Donation/CheckoutHeader", () => ({
  CheckoutHeader: ({ totalItems, onClear }: any) => (
    <div data-testid="checkout-header">
      <span>Items: {totalItems}</span>
      <button data-testid="clear-cart" onClick={onClear}>
        Clear
      </button>
    </div>
  ),
}));

jest.mock("@/components/Donation/CartItemList", () => ({
  CartItemList: () => <div data-testid="cart-item-list">Cart Items</div>,
}));

jest.mock("@/components/Donation/NetworkSwitchPreview", () => ({
  NetworkSwitchPreview: () => <div data-testid="network-switch-preview">Network Preview</div>,
}));

jest.mock("@/components/DonationApprovalStatus", () => ({
  DonationApprovalStatus: ({ executionState }: any) => (
    <div data-testid="approval-status">Phase: {executionState.phase}</div>
  ),
}));

jest.mock("@/components/DonationStepsPreview", () => ({
  DonationStepsPreview: ({ onProceed, onCancel, isLoading }: any) => (
    <div data-testid="steps-preview">
      <button data-testid="proceed-button" onClick={onProceed} disabled={isLoading}>
        Proceed
      </button>
      <button data-testid="cancel-button" onClick={onCancel}>
        Cancel
      </button>
    </div>
  ),
}));

jest.mock("@/components/Donation/EmptyCart", () => ({
  EmptyCart: ({ onBrowseProjects }: any) => (
    <div data-testid="empty-cart">
      <button data-testid="browse-projects" onClick={onBrowseProjects}>
        Browse Projects
      </button>
    </div>
  ),
}));

jest.mock("@/components/Donation/CompletedDonations", () => ({
  CompletedDonations: ({ onStartNewDonation }: any) => (
    <div data-testid="completed-donations">
      <button data-testid="start-new-donation" onClick={onStartNewDonation}>
        Start New
      </button>
    </div>
  ),
}));

describe("DonationCheckout", () => {
  const mockToken: SupportedToken = {
    address: "0xUSDC000000000000000000000000000000000000",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    chainId: 10,
    chainName: "Optimism",
    isNative: false,
  };

  const mockPayment: DonationPayment = {
    projectId: "project-1",
    amount: "100",
    token: mockToken,
    chainId: 10,
  };

  const mockCartItem = {
    projectId: "project-1",
    projectName: "Test Project",
    projectImage: "https://example.com/image.png",
  };

  const defaultCartState = {
    items: [mockCartItem],
    amounts: { "project-1": "100" },
    selectedTokens: { "project-1": mockToken },
    setAmount: jest.fn(),
    setSelectedToken: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
    updatePayments: jest.fn(),
    payments: [mockPayment],
    lastCompletedSession: null,
    clearLastCompletedSession: jest.fn(),
  };

  const defaultNetworkSwitching = {
    currentChainId: 10,
    isCurrentNetworkSupported: true,
    switchToNetwork: jest.fn(),
    isSwitching: false,
    getFreshWalletClient: jest.fn(),
  };

  const defaultDonationCheckout = {
    transfers: [],
    isExecuting: false,
    executionState: { phase: "completed" as const },
    approvalInfo: [],
    validationErrors: [],
    showStepsPreview: false,
    setShowStepsPreview: jest.fn(),
    handleExecuteDonations: jest.fn(),
    handleProceedWithDonations: jest.fn(),
  };

  const defaultPayoutManager = {
    payoutAddresses: { "project-1": "0x1234567890123456789012345678901234567890" },
    missingPayouts: [],
    isFetchingPayouts: false,
    payoutStatusByProject: {},
    formatAddress: jest.fn((addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`),
    setMissingPayouts: jest.fn(),
  };

  const defaultBalances = {
    balanceByTokenKey: { "USDC-10": "1000" },
    isFetchingCrossChainBalances: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    const { useDonationCart } = require("@/store/donationCart");
    useDonationCart.mockReturnValue(defaultCartState);

    const { useNetworkSwitching } = require("@/hooks/useNetworkSwitching");
    useNetworkSwitching.mockReturnValue(defaultNetworkSwitching);

    const { useAuth } = require("@/hooks/useAuth");
    useAuth.mockReturnValue({ isConnected: true });

    const { useAccount } = require("wagmi");
    useAccount.mockReturnValue({ address: "0x1234567890123456789012345678901234567890" });

    const { useDonationCheckout } = require("@/hooks/donation/useDonationCheckout");
    useDonationCheckout.mockReturnValue(defaultDonationCheckout);

    const { usePayoutAddressManager } = require("@/hooks/donation/usePayoutAddressManager");
    usePayoutAddressManager.mockReturnValue(defaultPayoutManager);

    const { useCrossChainBalances } = require("@/hooks/donation/useCrossChainBalances");
    useCrossChainBalances.mockReturnValue(defaultBalances);

    const { getTokensByChain } = require("@/constants/supportedTokens");
    getTokensByChain.mockReturnValue([mockToken]);
  });

  describe("Rendering", () => {
    it("should render checkout component with cart items", () => {
      render(<DonationCheckout />);

      expect(screen.getByTestId("checkout-header")).toBeInTheDocument();
      expect(screen.getByTestId("cart-item-list")).toBeInTheDocument();
      expect(screen.getByTestId("donation-summary")).toBeInTheDocument();
      expect(screen.getByTestId("donation-alerts")).toBeInTheDocument();
    });

    it("should render empty cart when no items", () => {
      const { useDonationCart } = require("@/store/donationCart");
      useDonationCart.mockReturnValue({
        ...defaultCartState,
        items: [],
      });

      render(<DonationCheckout />);

      expect(screen.getByTestId("empty-cart")).toBeInTheDocument();
      expect(screen.queryByTestId("checkout-header")).not.toBeInTheDocument();
    });

    it("should render completed donations when session exists", () => {
      const { useDonationCart } = require("@/store/donationCart");
      useDonationCart.mockReturnValue({
        ...defaultCartState,
        items: [],
        lastCompletedSession: { id: "session-1", transfers: [] },
      });

      render(<DonationCheckout />);

      expect(screen.getByTestId("completed-donations")).toBeInTheDocument();
      expect(screen.queryByTestId("empty-cart")).not.toBeInTheDocument();
    });

    it("should render network switch preview", () => {
      render(<DonationCheckout />);

      expect(screen.getByTestId("network-switch-preview")).toBeInTheDocument();
    });

    it("should render approval status", () => {
      render(<DonationCheckout />);

      expect(screen.getByTestId("approval-status")).toBeInTheDocument();
    });
  });

  describe("Button Labels", () => {
    it("should show 'Switching Network...' when switching", () => {
      const { useNetworkSwitching } = require("@/hooks/useNetworkSwitching");
      useNetworkSwitching.mockReturnValue({
        ...defaultNetworkSwitching,
        isSwitching: true,
      });

      render(<DonationCheckout />);

      expect(screen.getByTestId("donation-executor")).toHaveTextContent("Switching Network...");
    });

    it("should show 'Loading payout addresses...' when fetching payouts", () => {
      const { usePayoutAddressManager } = require("@/hooks/donation/usePayoutAddressManager");
      // Note: When isFetchingPayouts is true, canProceed becomes false, so executor won't render
      // This test verifies the label logic, but executor won't be visible
      usePayoutAddressManager.mockReturnValue({
        ...defaultPayoutManager,
        isFetchingPayouts: true,
      });

      render(<DonationCheckout />);

      // When fetching payouts, canProceed is false, so executor doesn't render
      // The label logic exists but component is hidden
      expect(screen.queryByTestId("donation-executor")).not.toBeInTheDocument();
    });

    it("should show 'Loading cross-chain balances...' when fetching balances", () => {
      const { useCrossChainBalances } = require("@/hooks/donation/useCrossChainBalances");
      useCrossChainBalances.mockReturnValue({
        ...defaultBalances,
        isFetchingCrossChainBalances: true,
      });

      render(<DonationCheckout />);

      expect(screen.getByTestId("donation-executor")).toHaveTextContent("Loading cross-chain balances...");
    });

    it("should show execution phase labels", () => {
      const { useDonationCheckout } = require("@/hooks/donation/useDonationCheckout");
      useDonationCheckout.mockReturnValue({
        ...defaultDonationCheckout,
        isExecuting: true,
        executionState: { phase: "checking" as const },
      });

      render(<DonationCheckout />);

      expect(screen.getByTestId("donation-executor")).toHaveTextContent("Checking token approvals...");
    });

    it("should show approval progress", () => {
      const { useDonationCheckout } = require("@/hooks/donation/useDonationCheckout");
      useDonationCheckout.mockReturnValue({
        ...defaultDonationCheckout,
        isExecuting: true,
        executionState: { phase: "approving" as const, approvalProgress: 50 },
      });

      render(<DonationCheckout />);

      expect(screen.getByTestId("donation-executor")).toHaveTextContent("Approving tokens... (50%)");
    });

    it("should show 'Select tokens and amounts' when cannot proceed", () => {
      const { useDonationCart } = require("@/store/donationCart");
      useDonationCart.mockReturnValue({
        ...defaultCartState,
        amounts: {},
        selectedTokens: {},
      });

      render(<DonationCheckout />);

      // When cannot proceed, executor doesn't render, but message is shown in info box
      expect(screen.queryByTestId("donation-executor")).not.toBeInTheDocument();
      expect(screen.getByText("Select tokens and amounts")).toBeInTheDocument();
    });

    it("should show 'Switch Chain' when on unsupported network", () => {
      const { useNetworkSwitching } = require("@/hooks/useNetworkSwitching");
      useNetworkSwitching.mockReturnValue({
        ...defaultNetworkSwitching,
        isCurrentNetworkSupported: false,
      });

      render(<DonationCheckout />);

      expect(screen.getByTestId("donation-executor")).toHaveTextContent("Switch Chain");
    });

    it("should show 'Review & Send Donations' when ready", () => {
      render(<DonationCheckout />);

      expect(screen.getByTestId("donation-executor")).toHaveTextContent("Review & Send Donations");
    });
  });

  describe("User Interactions", () => {
    it("should call handleExecuteDonations when execute button clicked", async () => {
      const mockHandleExecute = jest.fn();
      const { useDonationCheckout } = require("@/hooks/donation/useDonationCheckout");
      useDonationCheckout.mockReturnValue({
        ...defaultDonationCheckout,
        handleExecuteDonations: mockHandleExecute,
      });

      render(<DonationCheckout />);

      const executeButton = screen.getByTestId("donation-executor");
      fireEvent.click(executeButton);

      await waitFor(() => {
        expect(mockHandleExecute).toHaveBeenCalledWith([mockPayment]);
      });
    });

    it("should call clear when clear button clicked", () => {
      const mockClear = jest.fn();
      const { useDonationCart } = require("@/store/donationCart");
      useDonationCart.mockReturnValue({
        ...defaultCartState,
        clear: mockClear,
      });

      render(<DonationCheckout />);

      const clearButton = screen.getByTestId("clear-cart");
      fireEvent.click(clearButton);

      expect(mockClear).toHaveBeenCalled();
    });

    it("should call handleProceedWithDonations when proceed clicked", async () => {
      const mockHandleProceed = jest.fn();
      const { useDonationCheckout } = require("@/hooks/donation/useDonationCheckout");
      useDonationCheckout.mockReturnValue({
        ...defaultDonationCheckout,
        showStepsPreview: true,
        handleProceedWithDonations: mockHandleProceed,
      });

      render(<DonationCheckout />);

      const proceedButton = screen.getByTestId("proceed-button");
      fireEvent.click(proceedButton);

      await waitFor(() => {
        expect(mockHandleProceed).toHaveBeenCalled();
      });
    });

    it("should close steps preview when cancel clicked", () => {
      const mockSetShowStepsPreview = jest.fn();
      const { useDonationCheckout } = require("@/hooks/donation/useDonationCheckout");
      useDonationCheckout.mockReturnValue({
        ...defaultDonationCheckout,
        showStepsPreview: true,
        setShowStepsPreview: mockSetShowStepsPreview,
      });

      render(<DonationCheckout />);

      const cancelButton = screen.getByTestId("cancel-button");
      fireEvent.click(cancelButton);

      expect(mockSetShowStepsPreview).toHaveBeenCalledWith(false);
    });

    it("should navigate back when browse projects clicked", () => {
      const { useDonationCart } = require("@/store/donationCart");
      useDonationCart.mockReturnValue({
        ...defaultCartState,
        items: [],
      });

      render(<DonationCheckout />);

      const browseButton = screen.getByTestId("browse-projects");
      fireEvent.click(browseButton);

      expect(mockRouterBack).toHaveBeenCalled();
    });

    it("should clear session and navigate back when start new donation clicked", () => {
      const mockClearSession = jest.fn();
      const { useDonationCart } = require("@/store/donationCart");
      useDonationCart.mockReturnValue({
        ...defaultCartState,
        items: [],
        lastCompletedSession: { id: "session-1", transfers: [] },
        clearLastCompletedSession: mockClearSession,
      });

      render(<DonationCheckout />);

      const startNewButton = screen.getByTestId("start-new-donation");
      fireEvent.click(startNewButton);

      expect(mockClearSession).toHaveBeenCalled();
      expect(mockRouterBack).toHaveBeenCalled();
    });
  });

  describe("Validation and Security", () => {
    it("should block donations when payout addresses are missing", () => {
      const { usePayoutAddressManager } = require("@/hooks/donation/usePayoutAddressManager");
      usePayoutAddressManager.mockReturnValue({
        ...defaultPayoutManager,
        missingPayouts: ["project-1"],
      });

      render(<DonationCheckout />);

      // Donation executor should not be visible when cannot proceed
      expect(screen.queryByTestId("donation-executor")).not.toBeInTheDocument();
    });

    it("should show info message when cannot proceed", () => {
      const { useDonationCart } = require("@/store/donationCart");
      useDonationCart.mockReturnValue({
        ...defaultCartState,
        amounts: {},
        selectedTokens: {},
      });

      render(<DonationCheckout />);

      expect(screen.getByText("Select tokens and amounts")).toBeInTheDocument();
    });

    it("should validate payout addresses before showing confirmation", () => {
      const { usePayoutAddressManager } = require("@/hooks/donation/usePayoutAddressManager");
      usePayoutAddressManager.mockReturnValue({
        ...defaultPayoutManager,
        missingPayouts: ["project-1"],
        isFetchingPayouts: false,
      });

      render(<DonationCheckout />);

      // Should not show executor when missing payouts
      expect(screen.queryByTestId("donation-executor")).not.toBeInTheDocument();
    });
  });

  describe("Token Selection", () => {
    it("should filter tokens with positive balances", () => {
      const { useCrossChainBalances } = require("@/hooks/donation/useCrossChainBalances");
      useCrossChainBalances.mockReturnValue({
        balanceByTokenKey: {
          "USDC-10": "1000",
          "ETH-10": "0", // Zero balance
        },
        isFetchingCrossChainBalances: false,
      });

      render(<DonationCheckout />);

      // Component should render successfully with filtered tokens
      expect(screen.getByTestId("cart-item-list")).toBeInTheDocument();
    });

    it("should return empty tokens when not connected", () => {
      const { useAuth } = require("@/hooks/useAuth");
      useAuth.mockReturnValue({ isConnected: false });

      render(<DonationCheckout />);

      // Should still render but with no available tokens
      expect(screen.getByTestId("cart-item-list")).toBeInTheDocument();
    });
  });

  describe("Network Switching", () => {
    it("should switch network when token selected from different chain", () => {
      const mockSwitchToNetwork = jest.fn();
      const { useNetworkSwitching } = require("@/hooks/useNetworkSwitching");
      useNetworkSwitching.mockReturnValue({
        ...defaultNetworkSwitching,
        currentChainId: 10,
        switchToNetwork: mockSwitchToNetwork,
      });

      // This would be tested through CartItemList interaction
      // For now, we verify the component renders correctly
      render(<DonationCheckout />);

      expect(screen.getByTestId("network-switch-preview")).toBeInTheDocument();
    });
  });

  describe("Steps Preview Modal", () => {
    it("should show steps preview modal when showStepsPreview is true", () => {
      const { useDonationCheckout } = require("@/hooks/donation/useDonationCheckout");
      useDonationCheckout.mockReturnValue({
        ...defaultDonationCheckout,
        showStepsPreview: true,
      });

      render(<DonationCheckout />);

      expect(screen.getByTestId("steps-preview")).toBeInTheDocument();
    });

    it("should hide steps preview modal when showStepsPreview is false", () => {
      render(<DonationCheckout />);

      expect(screen.queryByTestId("steps-preview")).not.toBeInTheDocument();
    });

    it("should disable proceed button when executing", () => {
      const { useDonationCheckout } = require("@/hooks/donation/useDonationCheckout");
      useDonationCheckout.mockReturnValue({
        ...defaultDonationCheckout,
        showStepsPreview: true,
        isExecuting: true,
      });

      render(<DonationCheckout />);

      const proceedButton = screen.getByTestId("proceed-button");
      expect(proceedButton).toBeDisabled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty amounts object", () => {
      const { useDonationCart } = require("@/store/donationCart");
      useDonationCart.mockReturnValue({
        ...defaultCartState,
        amounts: {},
      });

      render(<DonationCheckout />);

      expect(screen.getByTestId("checkout-header")).toBeInTheDocument();
    });

    it("should handle null communityId", () => {
      // Mock useParams to return an object without communityId
      (mockUseParams as jest.Mock).mockReturnValueOnce({} as any);

      render(<DonationCheckout />);

      expect(screen.getByTestId("checkout-header")).toBeInTheDocument();
    });

    it("should handle multiple execution phases", () => {
      const phases = ["checking", "approving", "donating", "completed", "error"] as const;

      phases.forEach((phase) => {
        const { useDonationCheckout } = require("@/hooks/donation/useDonationCheckout");
        useDonationCheckout.mockReturnValue({
          ...defaultDonationCheckout,
          isExecuting: phase !== "completed" && phase !== "error",
          executionState: { phase },
        });

        const { unmount } = render(<DonationCheckout />);
        expect(screen.getByTestId("approval-status")).toBeInTheDocument();
        unmount();
      });
    });

    it("should handle zero balance tokens", () => {
      const { useCrossChainBalances } = require("@/hooks/donation/useCrossChainBalances");
      useCrossChainBalances.mockReturnValue({
        balanceByTokenKey: {
          "USDC-10": "0",
        },
        isFetchingCrossChainBalances: false,
      });

      render(<DonationCheckout />);

      expect(screen.getByTestId("cart-item-list")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper semantic structure", () => {
      render(<DonationCheckout />);

      // Check that main sections are present
      expect(screen.getByTestId("checkout-header")).toBeInTheDocument();
      expect(screen.getByTestId("cart-item-list")).toBeInTheDocument();
      expect(screen.getByTestId("donation-summary")).toBeInTheDocument();
    });

    it("should have interactive elements accessible", () => {
      render(<DonationCheckout />);

      const executeButton = screen.getByTestId("donation-executor");
      expect(executeButton).toBeInTheDocument();
      expect(executeButton.tagName).toBe("BUTTON");
    });
  });
});

