/**
 * @file Tests for useDonationCheckout hook
 * @description Tests for donation checkout hook covering state management, validation, and donation execution flow
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import type { SupportedToken } from "@/constants/supportedTokens";
import { useDonationCheckout } from "@/hooks/donation/useDonationCheckout";

// Access wagmi mock state via globalThis.__wagmiMockState__
// NOTE: Do NOT use jest.mock("wagmi", ...) as it pollutes global mock state
const getWagmiState = () => (globalThis as any).__wagmiMockState__;

// NOTE: react-hot-toast mock is provided globally via bun-setup.ts
// Access it via getMocks().toast in beforeEach to avoid polluting global mock state
const getMocks = () => (globalThis as any).__mocks__;

jest.mock("@/hooks/useDonationTransfer", () => ({
  useDonationTransfer: jest.fn(),
}));

// NOTE: Do NOT use jest.mock("@/utilities/donations/errorMessages")
// as it pollutes global mock state and breaks errorMessages.test.ts
// The hook uses the real errorMessages functions internally

jest.mock("@/hooks/donation/useCreateDonation", () => ({
  useCreateDonation: jest.fn(() => ({
    mutateAsync: jest.fn().mockResolvedValue({}),
    isPending: false,
  })),
}));

describe("useDonationCheckout", () => {
  let wagmiState: any;
  let mockToast: any;
  const mockAddress = "0x1234567890123456789012345678901234567890";

  const mockToken: SupportedToken = {
    address: "0xUSDC000000000000000000000000000000000000",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    chainId: 10,
    chainName: "Optimism",
    isNative: false,
  };

  const mockPayment = {
    projectId: "project-1",
    amount: "100",
    token: mockToken,
    chainId: 10,
  };

  const mockTransfers = [
    {
      hash: "0xtxhash",
      projectId: "project-1",
      status: "success" as const,
    },
  ];

  const mockUseDonationTransfer = {
    transfers: [],
    isExecuting: false,
    executeDonations: jest.fn(),
    validatePayments: jest.fn(),
    executionState: { phase: "completed" as const },
    approvalInfo: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Get wagmi state and toast mock from global mocks
    wagmiState = getWagmiState();
    const mocks = getMocks();
    mockToast = mocks.toast;

    // Configure wagmi mock state
    wagmiState.account = {
      address: mockAddress,
      isConnected: true,
      connector: null,
      chain: { id: 10 },
    };
    wagmiState.chainId = 10;

    const { useDonationTransfer } = require("@/hooks/useDonationTransfer");
    useDonationTransfer.mockReturnValue(mockUseDonationTransfer);

    // Clear mock call history
    if (mockToast?.mockClear) mockToast.mockClear();
    if (mockToast?.success?.mockClear) mockToast.success.mockClear();
    if (mockToast?.error?.mockClear) mockToast.error.mockClear();
  });

  describe("initialization", () => {
    it("should initialize with default state", () => {
      const { result } = renderHook(() => useDonationCheckout());

      expect(result.current.transfers).toEqual([]);
      expect(result.current.isExecuting).toBe(false);
      expect(result.current.validationErrors).toEqual([]);
      expect(result.current.showStepsPreview).toBe(false);
    });
  });

  describe("handleExecuteDonations", () => {
    it("should show error when wallet not connected", async () => {
      // Configure wagmi state with no address
      wagmiState.account = {
        address: null,
        isConnected: false,
        connector: null,
        chain: { id: 10 },
      };

      const { result } = renderHook(() => useDonationCheckout());

      await act(async () => {
        await result.current.handleExecuteDonations([mockPayment]);
      });

      expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining("Connect your wallet"));
    });

    it("should show error when no payments provided", async () => {
      const { result } = renderHook(() => useDonationCheckout());

      await act(async () => {
        await result.current.handleExecuteDonations([]);
      });

      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining("Select at least one project")
      );
    });

    it("should show steps preview when valid", async () => {
      const { result } = renderHook(() => useDonationCheckout());

      await act(async () => {
        await result.current.handleExecuteDonations([mockPayment]);
      });

      expect(result.current.showStepsPreview).toBe(true);
    });

    it("should not execute donations immediately", async () => {
      const { result } = renderHook(() => useDonationCheckout());

      await act(async () => {
        await result.current.handleExecuteDonations([mockPayment]);
      });

      expect(mockUseDonationTransfer.executeDonations).not.toHaveBeenCalled();
    });
  });

  describe("handleProceedWithDonations", () => {
    // Using chainPayoutAddresses format (chain ID as key, address as value)
    const mockChainPayoutAddresses = {
      "project-1": {
        "10": "0x9876543210987654321098765432109876543210",
      },
    };

    const mockBalances = {
      "USDC-10": "1000",
    };

    const mockSwitchNetwork = jest.fn();
    const mockGetFreshWalletClient = jest.fn();
    const mockSetMissingPayouts = jest.fn();

    beforeEach(() => {
      mockSwitchNetwork.mockClear();
      mockGetFreshWalletClient.mockClear();
      mockSetMissingPayouts.mockClear();
    });

    it("should close steps preview", async () => {
      const { result } = renderHook(() => useDonationCheckout());

      mockUseDonationTransfer.validatePayments.mockResolvedValue({
        valid: true,
        errors: [],
      });
      mockUseDonationTransfer.executeDonations.mockResolvedValue(mockTransfers);

      act(() => {
        result.current.setShowStepsPreview(true);
      });

      await act(async () => {
        await result.current.handleProceedWithDonations(
          [mockPayment],
          mockChainPayoutAddresses,
          mockBalances,
          10,
          mockSwitchNetwork,
          mockGetFreshWalletClient,
          mockSetMissingPayouts
        );
      });

      expect(result.current.showStepsPreview).toBe(false);
    });

    it("should block execution when payout addresses are missing", async () => {
      const { result } = renderHook(() => useDonationCheckout());

      await act(async () => {
        await result.current.handleProceedWithDonations(
          [mockPayment],
          {}, // No payout addresses
          mockBalances,
          10,
          mockSwitchNetwork,
          mockGetFreshWalletClient,
          mockSetMissingPayouts
        );
      });

      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining("payout addresses for the selected chains")
      );
      expect(mockSetMissingPayouts).toHaveBeenCalled();
      expect(mockUseDonationTransfer.executeDonations).not.toHaveBeenCalled();
    });

    it("should validate payments before execution", async () => {
      const { result } = renderHook(() => useDonationCheckout());

      mockUseDonationTransfer.validatePayments.mockResolvedValue({
        valid: true,
        errors: [],
      });
      mockUseDonationTransfer.executeDonations.mockResolvedValue(mockTransfers);

      await act(async () => {
        await result.current.handleProceedWithDonations(
          [mockPayment],
          mockChainPayoutAddresses,
          mockBalances,
          10,
          mockSwitchNetwork,
          mockGetFreshWalletClient,
          mockSetMissingPayouts
        );
      });

      expect(mockUseDonationTransfer.validatePayments).toHaveBeenCalledWith(
        [mockPayment],
        mockBalances
      );
    });

    it("should show error when validation fails", async () => {
      const { result } = renderHook(() => useDonationCheckout());

      mockUseDonationTransfer.validatePayments.mockResolvedValue({
        valid: false,
        errors: ["Insufficient balance"],
      });

      await act(async () => {
        await result.current.handleProceedWithDonations(
          [mockPayment],
          mockChainPayoutAddresses,
          mockBalances,
          10,
          mockSwitchNetwork,
          mockGetFreshWalletClient,
          mockSetMissingPayouts
        );
      });

      expect(result.current.validationErrors).toEqual(["Insufficient balance"]);
      expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining("Insufficient balance"));
      expect(mockUseDonationTransfer.executeDonations).not.toHaveBeenCalled();
    });

    it("should switch network when on wrong chain", async () => {
      const { result } = renderHook(() => useDonationCheckout());

      mockUseDonationTransfer.validatePayments.mockResolvedValue({
        valid: true,
        errors: [],
      });
      mockUseDonationTransfer.executeDonations.mockResolvedValue(mockTransfers);

      await act(async () => {
        await result.current.handleProceedWithDonations(
          [mockPayment],
          mockChainPayoutAddresses,
          mockBalances,
          1, // Wrong chain (Ethereum instead of Optimism)
          mockSwitchNetwork,
          mockGetFreshWalletClient,
          mockSetMissingPayouts
        );
      });

      expect(mockSwitchNetwork).toHaveBeenCalledWith(10);
    });

    it("should handle network switch error", async () => {
      const { result } = renderHook(() => useDonationCheckout());

      mockSwitchNetwork.mockRejectedValue(new Error("User rejected network switch"));

      await act(async () => {
        await result.current.handleProceedWithDonations(
          [mockPayment],
          mockChainPayoutAddresses,
          mockBalances,
          1,
          mockSwitchNetwork,
          mockGetFreshWalletClient,
          mockSetMissingPayouts
        );
      });

      expect(mockToast.error).toHaveBeenCalled();
      expect(mockUseDonationTransfer.executeDonations).not.toHaveBeenCalled();
    });

    it("should execute donations when validation passes", async () => {
      const { result } = renderHook(() => useDonationCheckout());

      mockUseDonationTransfer.validatePayments.mockResolvedValue({
        valid: true,
        errors: [],
      });
      mockUseDonationTransfer.executeDonations.mockResolvedValue(mockTransfers);

      await act(async () => {
        await result.current.handleProceedWithDonations(
          [mockPayment],
          mockChainPayoutAddresses,
          mockBalances,
          10,
          mockSwitchNetwork,
          mockGetFreshWalletClient,
          mockSetMissingPayouts
        );
      });

      expect(mockUseDonationTransfer.executeDonations).toHaveBeenCalled();
    });

    it("should show success toast when donations succeed", async () => {
      const { result } = renderHook(() => useDonationCheckout());

      mockUseDonationTransfer.validatePayments.mockResolvedValue({
        valid: true,
        errors: [],
      });
      mockUseDonationTransfer.executeDonations.mockResolvedValue(mockTransfers);

      await act(async () => {
        await result.current.handleProceedWithDonations(
          [mockPayment],
          mockChainPayoutAddresses,
          mockBalances,
          10,
          mockSwitchNetwork,
          mockGetFreshWalletClient,
          mockSetMissingPayouts
        );
      });

      expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining("success"));
    });

    it("should show error toast when some donations fail", async () => {
      const { result } = renderHook(() => useDonationCheckout());

      mockUseDonationTransfer.validatePayments.mockResolvedValue({
        valid: true,
        errors: [],
      });
      mockUseDonationTransfer.executeDonations.mockResolvedValue([
        { ...mockTransfers[0], status: "error" as const, error: "Failed" },
      ]);

      await act(async () => {
        await result.current.handleProceedWithDonations(
          [mockPayment],
          mockChainPayoutAddresses,
          mockBalances,
          10,
          mockSwitchNetwork,
          mockGetFreshWalletClient,
          mockSetMissingPayouts
        );
      });

      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining("Some donations failed")
      );
    });

    it("should show special success message when approvals were needed", async () => {
      const { result } = renderHook(() => useDonationCheckout());

      mockUseDonationTransfer.validatePayments.mockResolvedValue({
        valid: true,
        errors: [],
      });
      mockUseDonationTransfer.executeDonations.mockResolvedValue(mockTransfers);

      // Mock approvals were needed
      const { useDonationTransfer } = require("@/hooks/useDonationTransfer");
      useDonationTransfer.mockReturnValue({
        ...mockUseDonationTransfer,
        approvalInfo: [{ needsApproval: true, tokenSymbol: "USDC" }],
      });

      const { result: result2 } = renderHook(() => useDonationCheckout());

      await act(async () => {
        await result2.current.handleProceedWithDonations(
          [mockPayment],
          mockChainPayoutAddresses,
          mockBalances,
          10,
          mockSwitchNetwork,
          mockGetFreshWalletClient,
          mockSetMissingPayouts
        );
      });

      expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining("approved"));
    });

    it("should handle execution error", async () => {
      const { result } = renderHook(() => useDonationCheckout());

      mockUseDonationTransfer.validatePayments.mockResolvedValue({
        valid: true,
        errors: [],
      });
      mockUseDonationTransfer.executeDonations.mockRejectedValue(new Error("Execution failed"));

      await act(async () => {
        await result.current.handleProceedWithDonations(
          [mockPayment],
          mockChainPayoutAddresses,
          mockBalances,
          10,
          mockSwitchNetwork,
          mockGetFreshWalletClient,
          mockSetMissingPayouts
        );
      });

      expect(mockToast.error).toHaveBeenCalled();
    });

    it("should pass beforeTransfer callback to executeDonations", async () => {
      const { result } = renderHook(() => useDonationCheckout());

      mockUseDonationTransfer.validatePayments.mockResolvedValue({
        valid: true,
        errors: [],
      });
      mockUseDonationTransfer.executeDonations.mockResolvedValue(mockTransfers);

      await act(async () => {
        await result.current.handleProceedWithDonations(
          [mockPayment],
          mockChainPayoutAddresses,
          mockBalances,
          10,
          mockSwitchNetwork,
          mockGetFreshWalletClient,
          mockSetMissingPayouts
        );
      });

      expect(mockUseDonationTransfer.executeDonations).toHaveBeenCalledWith(
        [mockPayment],
        expect.any(Function),
        expect.any(Function) // beforeTransfer callback
      );
    });

    it("should switch network when payment is on different chain", async () => {
      const { result } = renderHook(() => useDonationCheckout());

      mockUseDonationTransfer.validatePayments.mockResolvedValue({
        valid: true,
        errors: [],
      });

      mockSwitchNetwork.mockResolvedValue(undefined);
      mockUseDonationTransfer.executeDonations.mockResolvedValue(mockTransfers);

      await act(async () => {
        await result.current.handleProceedWithDonations(
          [mockPayment], // mockPayment has chainId: 10
          mockChainPayoutAddresses,
          mockBalances,
          1, // activeChainId is 1, different from payment
          mockSwitchNetwork,
          mockGetFreshWalletClient,
          mockSetMissingPayouts
        );
      });

      // Should have switched network to match the payment chain
      expect(mockSwitchNetwork).toHaveBeenCalledWith(10);
    });

    it("should not switch network when already on correct chain", async () => {
      const { result } = renderHook(() => useDonationCheckout());

      mockUseDonationTransfer.validatePayments.mockResolvedValue({
        valid: true,
        errors: [],
      });

      mockUseDonationTransfer.executeDonations.mockResolvedValue(mockTransfers);

      await act(async () => {
        await result.current.handleProceedWithDonations(
          [mockPayment], // mockPayment has chainId: 10
          mockChainPayoutAddresses,
          mockBalances,
          10, // activeChainId is already 10
          mockSwitchNetwork,
          mockGetFreshWalletClient,
          mockSetMissingPayouts
        );
      });

      // Should NOT switch network since we're already on the right chain
      expect(mockSwitchNetwork).not.toHaveBeenCalled();
    });
  });

  describe("setShowStepsPreview", () => {
    it("should update showStepsPreview state", () => {
      const { result } = renderHook(() => useDonationCheckout());

      expect(result.current.showStepsPreview).toBe(false);

      act(() => {
        result.current.setShowStepsPreview(true);
      });

      expect(result.current.showStepsPreview).toBe(true);

      act(() => {
        result.current.setShowStepsPreview(false);
      });

      expect(result.current.showStepsPreview).toBe(false);
    });
  });

  describe("state passthrough", () => {
    it("should expose transfers from useDonationTransfer", () => {
      const { useDonationTransfer } = require("@/hooks/useDonationTransfer");
      useDonationTransfer.mockReturnValue({
        ...mockUseDonationTransfer,
        transfers: mockTransfers,
      });

      const { result } = renderHook(() => useDonationCheckout());

      expect(result.current.transfers).toEqual(mockTransfers);
    });

    it("should expose isExecuting from useDonationTransfer", () => {
      const { useDonationTransfer } = require("@/hooks/useDonationTransfer");
      useDonationTransfer.mockReturnValue({
        ...mockUseDonationTransfer,
        isExecuting: true,
      });

      const { result } = renderHook(() => useDonationCheckout());

      expect(result.current.isExecuting).toBe(true);
    });

    it("should expose executionState from useDonationTransfer", () => {
      const executionState = { phase: "approving" as const, approvalProgress: 50 };
      const { useDonationTransfer } = require("@/hooks/useDonationTransfer");
      useDonationTransfer.mockReturnValue({
        ...mockUseDonationTransfer,
        executionState,
      });

      const { result } = renderHook(() => useDonationCheckout());

      expect(result.current.executionState).toEqual(executionState);
    });

    it("should expose approvalInfo from useDonationTransfer", () => {
      const approvalInfo = [
        { tokenSymbol: "USDC", needsApproval: true, requiredAmount: BigInt(100) },
      ];
      const { useDonationTransfer } = require("@/hooks/useDonationTransfer");
      useDonationTransfer.mockReturnValue({
        ...mockUseDonationTransfer,
        approvalInfo,
      });

      const { result } = renderHook(() => useDonationCheckout());

      expect(result.current.approvalInfo).toEqual(approvalInfo);
    });
  });
});
