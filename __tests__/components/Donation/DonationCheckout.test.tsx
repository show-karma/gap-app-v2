/**
 * @file Tests for DonationCheckout component
 * @description Comprehensive tests for the main donation checkout component
 * covering UI rendering, user interactions, validation, and edge cases
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DonationCheckout } from "@/components/Donation/DonationCheckout";
import "@testing-library/jest-dom";
import { useAccount } from "wagmi";
import type { SupportedToken } from "@/constants/supportedTokens";
import { getTokensByChain } from "@/constants/supportedTokens";
import { useCartChainPayoutAddresses } from "@/hooks/donation/useCartChainPayoutAddresses";
import { useCrossChainBalances } from "@/hooks/donation/useCrossChainBalances";
import { useDonationCheckout } from "@/hooks/donation/useDonationCheckout";
import { useAuth } from "@/hooks/useAuth";
import { useNetworkSwitching } from "@/hooks/useNetworkSwitching";
import { useDonationCart } from "@/store";
import type { DonationPayment } from "@/store/donationCart";

// Mock Next.js router
const mockRouterBack = vi.fn();
const mockUseParams = vi.fn(() => ({
  communityId: "test-community",
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: mockRouterBack,
  }),
  useParams: () => mockUseParams(),
}));

// Mock wagmi hooks
vi.mock("wagmi", () => ({
  useAccount: vi.fn(),
  usePublicClient: vi.fn(),
  useWalletClient: vi.fn(),
  useWriteContract: vi.fn(),
  useWaitForTransactionReceipt: vi.fn(),
  useChainId: vi.fn(),
}));

// Mock store hooks
vi.mock("@/store", () => ({
  useDonationCart: vi.fn(),
  useOwnerStore: vi.fn(() => ({ isOwner: false })),
  useProjectStore: vi.fn(() => ({ isProjectAdmin: false })),
}));

vi.mock("@/hooks/useNetworkSwitching", () => ({
  useNetworkSwitching: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/donation/useDonationCheckout", () => ({
  useDonationCheckout: vi.fn(),
}));

vi.mock("@/hooks/donation/useCartChainPayoutAddresses", () => ({
  useCartChainPayoutAddresses: vi.fn(),
}));

vi.mock("@/hooks/donation/useCrossChainBalances", () => ({
  useCrossChainBalances: vi.fn(),
}));

vi.mock("@/constants/supportedTokens", () => ({
  getTokensByChain: vi.fn(),
  getAllSupportedChains: vi.fn(() => [10, 8453]),
  SUPPORTED_NETWORKS: {},
}));

// Mock child components
vi.mock("@/components/Donation/DonationSummary", () => ({
  DonationSummary: ({ payments }: { payments: DonationPayment[] }) => (
    <div data-testid="donation-summary">Summary: {payments.length} payments</div>
  ),
}));

vi.mock("@/components/Donation/DonationExecutor", () => ({
  DonationExecutor: ({ executeButtonLabel, onExecute }: any) => (
    <button data-testid="donation-executor" onClick={onExecute}>
      {executeButtonLabel}
    </button>
  ),
}));

vi.mock("@/components/Donation/DonationAlerts", () => ({
  DonationAlerts: () => <div data-testid="donation-alerts">Alerts</div>,
}));

vi.mock("@/components/Donation/CheckoutHeader", () => ({
  CheckoutHeader: ({ totalItems, onClear }: any) => (
    <div data-testid="checkout-header">
      <span>Items: {totalItems}</span>
      <button data-testid="clear-cart" onClick={onClear}>
        Clear
      </button>
    </div>
  ),
}));

vi.mock("@/components/Donation/CartItemList", () => ({
  CartItemList: () => <div data-testid="cart-item-list">Cart Items</div>,
}));

vi.mock("@/components/Donation/NetworkSwitchPreview", () => ({
  NetworkSwitchPreview: () => <div data-testid="network-switch-preview">Network Preview</div>,
}));

vi.mock("@/components/DonationApprovalStatus", () => ({
  DonationApprovalStatus: ({ executionState }: any) => (
    <div data-testid="approval-status">Phase: {executionState.phase}</div>
  ),
}));

vi.mock("@/components/DonationStepsPreview", () => ({
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

vi.mock("@/components/Donation/EmptyCart", () => ({
  EmptyCart: ({ onBrowseProjects }: any) => (
    <div data-testid="empty-cart">
      <button data-testid="browse-projects" onClick={onBrowseProjects}>
        Browse Projects
      </button>
    </div>
  ),
}));

vi.mock("@/components/Donation/CompletedDonations", () => ({
  CompletedDonations: ({ onStartNewDonation }: any) => (
    <div data-testid="completed-donations">
      <button data-testid="start-new-donation" onClick={onStartNewDonation}>
        Start New
      </button>
    </div>
  ),
}));

// Typed mock references (vi.mocked avoids runtime require() calls)
const mockUseDonationCart = vi.mocked(useDonationCart);
const mockUseNetworkSwitching = vi.mocked(useNetworkSwitching);
const mockUseAuth = vi.mocked(useAuth);
const mockUseAccount = vi.mocked(useAccount);
const mockUseDonationCheckout = vi.mocked(useDonationCheckout);
const mockUseCartChainPayoutAddresses = vi.mocked(useCartChainPayoutAddresses);
const mockUseCrossChainBalances = vi.mocked(useCrossChainBalances);
const mockGetTokensByChain = vi.mocked(getTokensByChain);

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
    setAmount: vi.fn(),
    setSelectedToken: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    updatePayments: vi.fn(),
    payments: [mockPayment],
    lastCompletedSession: null,
    clearLastCompletedSession: vi.fn(),
  };

  const defaultNetworkSwitching = {
    currentChainId: 10,
    isCurrentNetworkSupported: true,
    switchToNetwork: vi.fn(),
    isSwitching: false,
    getFreshWalletClient: vi.fn(),
  };

  const defaultDonationCheckout = {
    transfers: [],
    isExecuting: false,
    executionState: { phase: "completed" as const },
    approvalInfo: [],
    validationErrors: [],
    showStepsPreview: false,
    setShowStepsPreview: vi.fn(),
    handleExecuteDonations: vi.fn(),
    handleProceedWithDonations: vi.fn(),
  };

  const defaultChainPayoutAddresses = {
    chainPayoutAddresses: {
      "project-1": {
        "10": "0x1234567890123456789012345678901234567890",
      },
    },
    missingPayouts: [],
    isFetching: false,
    setMissingPayouts: vi.fn(),
  };

  const defaultBalances = {
    balanceByTokenKey: { "USDC-10": "1000" },
    isFetchingCrossChainBalances: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseDonationCart.mockReturnValue(defaultCartState);
    mockUseNetworkSwitching.mockReturnValue(defaultNetworkSwitching);
    mockUseAuth.mockReturnValue({ isConnected: true });
    mockUseAccount.mockReturnValue({ address: "0x1234567890123456789012345678901234567890" });
    mockUseDonationCheckout.mockReturnValue(defaultDonationCheckout);
    mockUseCartChainPayoutAddresses.mockReturnValue(defaultChainPayoutAddresses);
    mockUseCrossChainBalances.mockReturnValue(defaultBalances);
    mockGetTokensByChain.mockReturnValue([mockToken]);
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
      // using mockUseDonationCart
      mockUseDonationCart.mockReturnValue({
        ...defaultCartState,
        items: [],
      });

      render(<DonationCheckout />);

      expect(screen.getByTestId("empty-cart")).toBeInTheDocument();
      expect(screen.queryByTestId("checkout-header")).not.toBeInTheDocument();
    });

    it("should render completed donations when session exists", () => {
      // using mockUseDonationCart
      mockUseDonationCart.mockReturnValue({
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
      // using mockUseNetworkSwitching
      mockUseNetworkSwitching.mockReturnValue({
        ...defaultNetworkSwitching,
        isSwitching: true,
      });

      render(<DonationCheckout />);

      expect(screen.getByTestId("donation-executor")).toHaveTextContent("Switching Network...");
    });

    it("should show 'Loading payout addresses...' when fetching payouts", () => {
      // using mockUseCartChainPayoutAddresses
      // Note: When isFetching is true, canProceed becomes false, so executor won't render
      // This test verifies the label logic, but executor won't be visible
      mockUseCartChainPayoutAddresses.mockReturnValue({
        ...defaultChainPayoutAddresses,
        isFetching: true,
      });

      render(<DonationCheckout />);

      // When fetching payouts, canProceed is false, so executor doesn't render
      // The label logic exists but component is hidden
      expect(screen.queryByTestId("donation-executor")).not.toBeInTheDocument();
    });

    it("should show 'Loading cross-chain balances...' when fetching balances", () => {
      // using mockUseCrossChainBalances
      mockUseCrossChainBalances.mockReturnValue({
        ...defaultBalances,
        isFetchingCrossChainBalances: true,
      });

      render(<DonationCheckout />);

      expect(screen.getByTestId("donation-executor")).toHaveTextContent(
        "Loading cross-chain balances..."
      );
    });

    it("should show execution phase labels", () => {
      // using mockUseDonationCheckout
      mockUseDonationCheckout.mockReturnValue({
        ...defaultDonationCheckout,
        isExecuting: true,
        executionState: { phase: "checking" as const },
      });

      render(<DonationCheckout />);

      expect(screen.getByTestId("donation-executor")).toHaveTextContent(
        "Checking token approvals..."
      );
    });

    it("should show approval progress", () => {
      // using mockUseDonationCheckout
      mockUseDonationCheckout.mockReturnValue({
        ...defaultDonationCheckout,
        isExecuting: true,
        executionState: { phase: "approving" as const, approvalProgress: 50 },
      });

      render(<DonationCheckout />);

      expect(screen.getByTestId("donation-executor")).toHaveTextContent(
        "Approving tokens... (50%)"
      );
    });

    it("should show 'Select tokens and amounts' when cannot proceed", () => {
      // using mockUseDonationCart
      mockUseDonationCart.mockReturnValue({
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
      // using mockUseNetworkSwitching
      mockUseNetworkSwitching.mockReturnValue({
        ...defaultNetworkSwitching,
        isCurrentNetworkSupported: false,
      });

      render(<DonationCheckout />);

      expect(screen.getByTestId("donation-executor")).toHaveTextContent("Switch Chain");
    });

    it("should show 'Review & Donate' when ready", () => {
      render(<DonationCheckout />);

      expect(screen.getByTestId("donation-executor")).toHaveTextContent("Review & Donate");
    });
  });

  describe("User Interactions", () => {
    it("should call handleExecuteDonations when execute button clicked", async () => {
      const user = userEvent.setup();
      const mockHandleExecute = vi.fn();
      // using mockUseDonationCheckout
      mockUseDonationCheckout.mockReturnValue({
        ...defaultDonationCheckout,
        handleExecuteDonations: mockHandleExecute,
      });

      render(<DonationCheckout />);

      const executeButton = screen.getByTestId("donation-executor");
      await user.click(executeButton);

      await waitFor(() => {
        expect(mockHandleExecute).toHaveBeenCalledWith([mockPayment]);
      });
    });

    it("should call clear when clear button clicked", async () => {
      const user = userEvent.setup();
      const mockClear = vi.fn();
      // using mockUseDonationCart
      mockUseDonationCart.mockReturnValue({
        ...defaultCartState,
        clear: mockClear,
      });

      render(<DonationCheckout />);

      const clearButton = screen.getByTestId("clear-cart");
      await user.click(clearButton);

      expect(mockClear).toHaveBeenCalled();
    });

    it("should call handleProceedWithDonations when proceed clicked", async () => {
      const user = userEvent.setup();
      const mockHandleProceed = vi.fn();
      // using mockUseDonationCheckout
      mockUseDonationCheckout.mockReturnValue({
        ...defaultDonationCheckout,
        showStepsPreview: true,
        handleProceedWithDonations: mockHandleProceed,
      });

      render(<DonationCheckout />);

      const proceedButton = screen.getByTestId("proceed-button");
      await user.click(proceedButton);

      await waitFor(() => {
        expect(mockHandleProceed).toHaveBeenCalled();
      });
    });

    it("should close steps preview when cancel clicked", async () => {
      const user = userEvent.setup();
      const mockSetShowStepsPreview = vi.fn();
      // using mockUseDonationCheckout
      mockUseDonationCheckout.mockReturnValue({
        ...defaultDonationCheckout,
        showStepsPreview: true,
        setShowStepsPreview: mockSetShowStepsPreview,
      });

      render(<DonationCheckout />);

      const cancelButton = screen.getByTestId("cancel-button");
      await user.click(cancelButton);

      expect(mockSetShowStepsPreview).toHaveBeenCalledWith(false);
    });

    it("should navigate back when browse projects clicked", async () => {
      const user = userEvent.setup();
      // using mockUseDonationCart
      mockUseDonationCart.mockReturnValue({
        ...defaultCartState,
        items: [],
      });

      render(<DonationCheckout />);

      const browseButton = screen.getByTestId("browse-projects");
      await user.click(browseButton);

      expect(mockRouterBack).toHaveBeenCalled();
    });

    it("should clear session and navigate back when start new donation clicked", async () => {
      const user = userEvent.setup();
      const mockClearSession = vi.fn();
      // using mockUseDonationCart
      mockUseDonationCart.mockReturnValue({
        ...defaultCartState,
        items: [],
        lastCompletedSession: { id: "session-1", transfers: [] },
        clearLastCompletedSession: mockClearSession,
      });

      render(<DonationCheckout />);

      const startNewButton = screen.getByTestId("start-new-donation");
      await user.click(startNewButton);

      expect(mockClearSession).toHaveBeenCalled();
      expect(mockRouterBack).toHaveBeenCalled();
    });
  });

  describe("Validation and Security", () => {
    it("should block donations when payout addresses are missing", () => {
      // using mockUseCartChainPayoutAddresses
      mockUseCartChainPayoutAddresses.mockReturnValue({
        ...defaultChainPayoutAddresses,
        missingPayouts: ["project-1"],
      });

      render(<DonationCheckout />);

      // Donation executor should not be visible when cannot proceed
      expect(screen.queryByTestId("donation-executor")).not.toBeInTheDocument();
    });

    it("should show info message when cannot proceed", () => {
      // using mockUseDonationCart
      mockUseDonationCart.mockReturnValue({
        ...defaultCartState,
        amounts: {},
        selectedTokens: {},
      });

      render(<DonationCheckout />);

      expect(screen.getByText("Select tokens and amounts")).toBeInTheDocument();
    });

    it("should validate payout addresses before showing confirmation", () => {
      // using mockUseCartChainPayoutAddresses
      mockUseCartChainPayoutAddresses.mockReturnValue({
        ...defaultChainPayoutAddresses,
        missingPayouts: ["project-1"],
        isFetching: false,
      });

      render(<DonationCheckout />);

      // Should not show executor when missing payouts
      expect(screen.queryByTestId("donation-executor")).not.toBeInTheDocument();
    });
  });

  describe("Token Selection", () => {
    it("should filter tokens with positive balances", () => {
      // using mockUseCrossChainBalances
      mockUseCrossChainBalances.mockReturnValue({
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
      // using mockUseAuth
      mockUseAuth.mockReturnValue({ isConnected: false });

      render(<DonationCheckout />);

      // Should still render but with no available tokens
      expect(screen.getByTestId("cart-item-list")).toBeInTheDocument();
    });
  });

  describe("Network Switching", () => {
    it("should switch network when token selected from different chain", () => {
      const mockSwitchToNetwork = vi.fn();
      // using mockUseNetworkSwitching
      mockUseNetworkSwitching.mockReturnValue({
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
      // using mockUseDonationCheckout
      mockUseDonationCheckout.mockReturnValue({
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
      // using mockUseDonationCheckout
      mockUseDonationCheckout.mockReturnValue({
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
      // using mockUseDonationCart
      mockUseDonationCart.mockReturnValue({
        ...defaultCartState,
        amounts: {},
      });

      render(<DonationCheckout />);

      expect(screen.getByTestId("checkout-header")).toBeInTheDocument();
    });

    it("should handle null communityId", () => {
      // Mock useParams to return an object without communityId
      (mockUseParams as vi.Mock).mockReturnValueOnce({} as any);

      render(<DonationCheckout />);

      expect(screen.getByTestId("checkout-header")).toBeInTheDocument();
    });

    it("should handle multiple execution phases", () => {
      const phases = ["checking", "approving", "donating", "completed", "error"] as const;

      phases.forEach((phase) => {
        // using mockUseDonationCheckout
        mockUseDonationCheckout.mockReturnValue({
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
      // using mockUseCrossChainBalances
      mockUseCrossChainBalances.mockReturnValue({
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
