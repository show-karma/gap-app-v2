/**
 * Integration Tests for Donation Checkout Flow (with MSW)
 *
 * Tests the useDonationCheckout hook end-to-end using MSW for HTTP
 * interception and mocked wagmi hooks for blockchain-level interactions.
 *
 * Coverage:
 * - Checkout validation (wallet, payments, payout addresses)
 * - Balance validation
 * - Network switching
 * - Donation persistence to backend via MSW
 * - Error handling (network errors, API errors, user rejection)
 * - Full happy-path flow at hook level
 */

import { act, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { Address } from "viem";
import { useDonationCheckout } from "@/hooks/donation/useDonationCheckout";
import { useDonationCart } from "@/store/donationCart";
import type { DonationPayment } from "@/utilities/donations/donationExecution";
import * as walletClientFallbackModule from "@/utilities/walletClientFallback";
import { BASE } from "../../msw/handlers";
import { installMswLifecycle, server } from "../../msw/server";
import { renderHookWithProviders } from "../../utils/render";

// ---------------------------------------------------------------------------
// MSW lifecycle
// ---------------------------------------------------------------------------
installMswLifecycle();

// ---------------------------------------------------------------------------
// Mock blockchain-level dependencies (wagmi, viem, erc20 utilities)
//
// vi.mock calls are hoisted above all variable declarations by Vitest.
// Use vi.hoisted() to create shared mocks that are available in factory fns.
// ---------------------------------------------------------------------------

const { sharedWriteContractAsync } = vi.hoisted(() => ({
  sharedWriteContractAsync: vi
    .fn()
    .mockResolvedValue("0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1"),
}));

vi.mock("wagmi", () => {
  const _addr = "0x1234567890123456789012345678901234567890";
  const _txHash = "0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1";
  const _publicClient = {
    chain: { id: 10 },
    waitForTransactionReceipt: vi
      .fn()
      .mockResolvedValue({ status: "success", transactionHash: _txHash }),
    readContract: vi.fn(),
  };
  const _walletClient = {
    account: { address: _addr },
    chain: { id: 10 },
    signTypedData: vi.fn().mockResolvedValue("0xsignature"),
    getChainId: vi.fn().mockResolvedValue(10),
    switchChain: vi.fn().mockResolvedValue(undefined),
  };
  return {
    useAccount: vi.fn(() => ({ address: _addr, isConnected: true })),
    usePublicClient: vi.fn(() => _publicClient),
    useWalletClient: vi.fn(() => ({
      data: _walletClient,
      refetch: vi.fn().mockResolvedValue({ data: _walletClient }),
    })),
    useWriteContract: vi.fn(() => ({
      writeContractAsync: sharedWriteContractAsync,
    })),
    useWaitForTransactionReceipt: vi.fn(() => ({
      data: undefined,
      isLoading: false,
      isSuccess: false,
      isError: false,
    })),
    useChainId: vi.fn(() => 10),
    useSwitchChain: vi.fn(() => ({ switchChainAsync: vi.fn() })),
  };
});

vi.mock("viem", async () => {
  const actual = await vi.importActual("viem");
  return {
    ...actual,
    getAddress: vi.fn((addr: string) => addr),
    parseUnits: vi.fn((value: string, decimals: number) => {
      const numValue = parseFloat(value);
      const multiplier = 10 ** decimals;
      return BigInt(Math.floor(numValue * multiplier));
    }),
    formatUnits: vi.fn((value: bigint, decimals: number) => String(Number(value) / 10 ** decimals)),
  };
});

vi.mock("react-hot-toast", () => {
  const toast = vi.fn();
  toast.error = vi.fn();
  toast.success = vi.fn();
  toast.loading = vi.fn();
  return { default: toast };
});

vi.mock("@/utilities/donations/batchDonations", () => ({
  BatchDonationsABI: [],
  BATCH_DONATIONS_CONTRACTS: {
    10: "0x1111111111111111111111111111111111111111",
    8453: "0x2222222222222222222222222222222222222222",
  },
  PERMIT2_ADDRESS: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
}));

vi.mock("@/utilities/erc20", () => ({
  checkTokenAllowances: vi.fn().mockResolvedValue([]),
  executeApprovals: vi.fn().mockResolvedValue([]),
  getApprovalAmount: vi.fn((amount: bigint) => amount),
}));

vi.mock("@/utilities/rpcClient", () => ({
  getRPCClient: vi.fn().mockResolvedValue({
    chain: { id: 10 },
    waitForTransactionReceipt: vi.fn().mockResolvedValue({
      status: "success",
      transactionHash: "0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1",
    }),
    readContract: vi.fn(),
  }),
}));

vi.mock("@/utilities/walletClientFallback", () => ({
  getWalletClientWithFallback: vi.fn().mockResolvedValue({
    account: { address: "0x1234567890123456789012345678901234567890" },
    chain: { id: 10 },
    signTypedData: vi.fn().mockResolvedValue("0xsignature"),
    getChainId: vi.fn().mockResolvedValue(10),
    switchChain: vi.fn().mockResolvedValue(undefined),
    writeContract: vi
      .fn()
      .mockResolvedValue("0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1"),
  }),
  isWalletClientGoodEnough: vi.fn().mockReturnValue(true),
}));

vi.mock("@/utilities/chainSyncValidation", () => ({
  validateChainSync: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: {
    getToken: vi.fn().mockResolvedValue("test-token-123"),
    clearCache: vi.fn(),
  },
}));

vi.mock("@/utilities/donations/errorMessages", () => ({
  parseDonationError: vi.fn((error: unknown) => ({
    message: error instanceof Error ? error.message : "Unknown error",
    code: "UNKNOWN_ERROR",
    actionableSteps: [],
  })),
  getShortErrorMessage: vi.fn((error: unknown) =>
    error instanceof Error ? error.message : "Unknown error"
  ),
}));

// ---------------------------------------------------------------------------
// Constants used in tests (declared AFTER vi.mock blocks)
// ---------------------------------------------------------------------------
const MOCK_ADDRESS = "0x1234567890123456789012345678901234567890" as Address;
const MOCK_TX_HASH = "0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1";

// References to the mocked objects inside the wagmi factory.
// We access them through the mocked module so that tests can override behaviour.
const mockWalletClient = {
  account: { address: MOCK_ADDRESS },
  chain: { id: 10 },
  signTypedData: vi.fn().mockResolvedValue("0xsignature"),
};

// Convenience alias -- points to the hoisted shared mock.
// Tests can call mockWriteContractAsync.mockRejectedValueOnce(...) etc.
const mockWriteContractAsync = sharedWriteContractAsync;

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

function createTestToken(overrides?: Record<string, unknown>) {
  return {
    symbol: "USDC",
    name: "USD Coin",
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
    chainId: 10,
    chainName: "Optimism",
    isNative: false,
    ...overrides,
  };
}

function createTestPayment(overrides?: Partial<DonationPayment>): DonationPayment {
  return {
    projectId: "proj-001",
    amount: "100",
    token: createTestToken() as DonationPayment["token"],
    chainId: 10,
    ...overrides,
  };
}

function createChainPayoutAddresses(
  projectIds: string[],
  address: string = "0x9876543210987654321098765432109876543210"
) {
  const result: Record<string, Record<string, string>> = {};
  for (const pid of projectIds) {
    result[pid] = { "10": address, "8453": address };
  }
  return result;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Integration: Donation Checkout with MSW", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset cart store
    const state = useDonationCart.getState();
    state.clear();
    state.clearLastCompletedSession();
  });

  // -----------------------------------------------------------------------
  // Hook initialization
  // -----------------------------------------------------------------------

  describe("hook initialization", () => {
    it("returns expected initial state", () => {
      const { result } = renderHookWithProviders(() => useDonationCheckout());

      expect(result.current.transfers).toEqual([]);
      expect(result.current.isExecuting).toBe(false);
      expect(result.current.validationErrors).toEqual([]);
      expect(result.current.showStepsPreview).toBe(false);
      expect(typeof result.current.handleExecuteDonations).toBe("function");
      expect(typeof result.current.handleProceedWithDonations).toBe("function");
    });
  });

  // -----------------------------------------------------------------------
  // handleExecuteDonations validation
  // -----------------------------------------------------------------------

  describe("handleExecuteDonations()", () => {
    it("shows error toast when wallet is not connected", async () => {
      const wagmi = await import("wagmi");
      (wagmi.useAccount as ReturnType<typeof vi.fn>).mockReturnValue({
        address: undefined,
        isConnected: false,
      });

      const { result } = renderHookWithProviders(() => useDonationCheckout());
      const toast = (await import("react-hot-toast")).default;

      await act(async () => {
        await result.current.handleExecuteDonations([createTestPayment()]);
      });

      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Connect your wallet"));

      // Restore mock
      (wagmi.useAccount as ReturnType<typeof vi.fn>).mockReturnValue({
        address: MOCK_ADDRESS,
        isConnected: true,
      });
    });

    it("shows error toast when payments array is empty", async () => {
      const { result } = renderHookWithProviders(() => useDonationCheckout());
      const toast = (await import("react-hot-toast")).default;

      await act(async () => {
        await result.current.handleExecuteDonations([]);
      });

      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Select at least one"));
    });

    it("sets showStepsPreview to true when validation passes", async () => {
      const { result } = renderHookWithProviders(() => useDonationCheckout());

      await act(async () => {
        await result.current.handleExecuteDonations([createTestPayment()]);
      });

      expect(result.current.showStepsPreview).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // handleProceedWithDonations - chain payout address validation
  // -----------------------------------------------------------------------

  describe("handleProceedWithDonations() - payout address validation", () => {
    it("shows error when projects lack payout addresses for their chain", async () => {
      const { result } = renderHookWithProviders(() => useDonationCheckout());
      const toast = (await import("react-hot-toast")).default;
      const payment = createTestPayment({ projectId: "proj-missing" });
      const setMissingPayouts = vi.fn();

      await act(async () => {
        await result.current.handleProceedWithDonations(
          [payment],
          {}, // no payout addresses
          { "USDC-10": "1000" },
          10,
          vi.fn(),
          vi.fn(),
          setMissingPayouts
        );
      });

      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("payout addresses"));
      expect(setMissingPayouts).toHaveBeenCalled();
    });

    it("proceeds when all projects have payout addresses", async () => {
      const { result } = renderHookWithProviders(() => useDonationCheckout());
      const toast = (await import("react-hot-toast")).default;
      const payment = createTestPayment({ projectId: "proj-ok" });

      await act(async () => {
        await result.current.handleProceedWithDonations(
          [payment],
          createChainPayoutAddresses(["proj-ok"]),
          { "USDC-10": "1000" },
          10,
          vi.fn().mockResolvedValue(undefined),
          vi.fn().mockResolvedValue(mockWalletClient),
          vi.fn()
        );
      });

      // Should NOT show payout error
      const payoutErrorCalls = (toast.error as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call: unknown[]) => typeof call[0] === "string" && call[0].includes("payout")
      );
      expect(payoutErrorCalls).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // handleProceedWithDonations - balance validation
  // -----------------------------------------------------------------------

  describe("handleProceedWithDonations() - balance validation", () => {
    it("shows error when balance is insufficient", async () => {
      const { result } = renderHookWithProviders(() => useDonationCheckout());
      const toast = (await import("react-hot-toast")).default;
      const payment = createTestPayment({ amount: "10000" }); // wants 10k USDC

      await act(async () => {
        await result.current.handleProceedWithDonations(
          [payment],
          createChainPayoutAddresses([payment.projectId]),
          { "USDC-10": "100" }, // only 100 USDC
          10,
          vi.fn().mockResolvedValue(undefined),
          vi.fn().mockResolvedValue(mockWalletClient),
          vi.fn()
        );
      });

      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Insufficient balance"));
      expect(result.current.validationErrors.length).toBeGreaterThan(0);
    });

    it("passes validation with sufficient balance", async () => {
      const { result } = renderHookWithProviders(() => useDonationCheckout());
      const payment = createTestPayment({ amount: "50" });

      await act(async () => {
        await result.current.handleProceedWithDonations(
          [payment],
          createChainPayoutAddresses([payment.projectId]),
          { "USDC-10": "1000" },
          10,
          vi.fn().mockResolvedValue(undefined),
          vi.fn().mockResolvedValue(mockWalletClient),
          vi.fn()
        );
      });

      expect(result.current.validationErrors).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // Network switching
  // -----------------------------------------------------------------------

  describe("handleProceedWithDonations() - network switching", () => {
    it("switches network when current chain differs from payment chain", async () => {
      const switchToNetwork = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHookWithProviders(() => useDonationCheckout());
      const payment = createTestPayment({ chainId: 8453 }); // Base

      await act(async () => {
        await result.current.handleProceedWithDonations(
          [payment],
          createChainPayoutAddresses([payment.projectId]),
          { "USDC-10": "1000" },
          10, // currently on Optimism
          switchToNetwork,
          vi.fn().mockResolvedValue(mockWalletClient),
          vi.fn()
        );
      });

      expect(switchToNetwork).toHaveBeenCalledWith(8453);
    });

    it("does not switch when already on the correct chain", async () => {
      const switchToNetwork = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHookWithProviders(() => useDonationCheckout());
      const payment = createTestPayment({ chainId: 10 });

      await act(async () => {
        await result.current.handleProceedWithDonations(
          [payment],
          createChainPayoutAddresses([payment.projectId]),
          { "USDC-10": "1000" },
          10, // already on Optimism
          switchToNetwork,
          vi.fn().mockResolvedValue(mockWalletClient),
          vi.fn()
        );
      });

      expect(switchToNetwork).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Donation persistence to backend (MSW intercepts)
  // -----------------------------------------------------------------------

  describe("donation persistence to backend", () => {
    /**
     * Note: Axios in jsdom uses XHR, which MSW's setupServer (Node-level
     * http interception) does not capture. For persistence verification we
     * spy on the donations service. The MSW handler tests at the bottom of
     * this file prove the handlers work correctly via native fetch.
     */

    it("calls createDonation with correct payload after successful execution", async () => {
      // Spy on the service that the mutation calls
      const donationsService = await import("@/services/donations.service");
      const createSpy = vi
        .spyOn(donationsService.donationsService, "createDonation")
        .mockResolvedValue({
          uid: "new-don",
          chainID: 10,
          projectUID: "proj-001",
          payoutAddress: "0x9876543210987654321098765432109876543210",
          amount: "100",
          tokenSymbol: "USDC",
          transactionHash: MOCK_TX_HASH,
          donationType: "crypto" as never,
          status: "completed" as never,
          createdAt: new Date().toISOString(),
        });

      const { result } = renderHookWithProviders(() => useDonationCheckout());
      const payment = createTestPayment();

      useDonationCart.getState().add({
        uid: payment.projectId,
        title: "Test Project",
        slug: "test-project",
      });

      await act(async () => {
        await result.current.handleProceedWithDonations(
          [payment],
          createChainPayoutAddresses([payment.projectId]),
          { "USDC-10": "1000" },
          10,
          vi.fn().mockResolvedValue(undefined),
          vi.fn().mockResolvedValue(mockWalletClient),
          vi.fn()
        );
      });

      await waitFor(() => {
        expect(createSpy).toHaveBeenCalledTimes(1);
      });

      const callArg = createSpy.mock.calls[0][0];
      expect(callArg.projectUID).toBe(payment.projectId);
      expect(callArg.amount).toBe("100");
      expect(callArg.tokenSymbol).toBe("USDC");
      expect(callArg.donorAddress).toBe(MOCK_ADDRESS);
      expect(callArg.transactionHash).toBeDefined();

      createSpy.mockRestore();
    });

    it("handles backend API error gracefully without crashing", async () => {
      const donationsService = await import("@/services/donations.service");
      const createSpy = vi
        .spyOn(donationsService.donationsService, "createDonation")
        .mockRejectedValue(new Error("Validation failed"));

      const { result } = renderHookWithProviders(() => useDonationCheckout());
      const payment = createTestPayment();

      useDonationCart.getState().add({
        uid: payment.projectId,
        title: "Test Project",
      });

      // Should not throw -- backend persistence errors are caught internally
      await act(async () => {
        await result.current.handleProceedWithDonations(
          [payment],
          createChainPayoutAddresses([payment.projectId]),
          { "USDC-10": "1000" },
          10,
          vi.fn().mockResolvedValue(undefined),
          vi.fn().mockResolvedValue(mockWalletClient),
          vi.fn()
        );
      });

      expect(result.current.isExecuting).toBe(false);
      createSpy.mockRestore();
    });

    it("handles network error gracefully during persistence", async () => {
      const donationsService = await import("@/services/donations.service");
      const createSpy = vi
        .spyOn(donationsService.donationsService, "createDonation")
        .mockRejectedValue(new Error("Network Error"));

      const { result } = renderHookWithProviders(() => useDonationCheckout());
      const payment = createTestPayment();

      useDonationCart.getState().add({
        uid: payment.projectId,
        title: "Test Project",
      });

      await act(async () => {
        await result.current.handleProceedWithDonations(
          [payment],
          createChainPayoutAddresses([payment.projectId]),
          { "USDC-10": "1000" },
          10,
          vi.fn().mockResolvedValue(undefined),
          vi.fn().mockResolvedValue(mockWalletClient),
          vi.fn()
        );
      });

      expect(result.current.isExecuting).toBe(false);
      createSpy.mockRestore();
    });
  });

  // -----------------------------------------------------------------------
  // Error handling during execution
  // -----------------------------------------------------------------------

  describe("error handling during donation execution", () => {
    it("catches user rejection and shows toast error", async () => {
      // Production code calls currentWalletClient.writeContract directly
      // (not wagmi's writeContractAsync), so we mock the fallback client.
      vi.mocked(walletClientFallbackModule.getWalletClientWithFallback).mockResolvedValueOnce({
        account: { address: MOCK_ADDRESS },
        chain: { id: 10 },
        signTypedData: vi.fn().mockResolvedValue("0xsignature"),
        getChainId: vi.fn().mockResolvedValue(10),
        switchChain: vi.fn().mockResolvedValue(undefined),
        writeContract: vi.fn().mockRejectedValueOnce(new Error("User rejected the request")),
      } as any);

      const { result } = renderHookWithProviders(() => useDonationCheckout());
      const toast = (await import("react-hot-toast")).default;
      const payment = createTestPayment();

      useDonationCart.getState().add({
        uid: payment.projectId,
        title: "Test Project",
      });

      await act(async () => {
        await result.current.handleProceedWithDonations(
          [payment],
          createChainPayoutAddresses([payment.projectId]),
          { "USDC-10": "1000" },
          10,
          vi.fn().mockResolvedValue(undefined),
          vi.fn().mockResolvedValue(mockWalletClient),
          vi.fn()
        );
      });

      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("User rejected"),
        expect.anything()
      );
    });

    it("catches transaction revert and shows toast error", async () => {
      // Production code calls currentWalletClient.writeContract directly.
      vi.mocked(walletClientFallbackModule.getWalletClientWithFallback).mockResolvedValueOnce({
        account: { address: MOCK_ADDRESS },
        chain: { id: 10 },
        signTypedData: vi.fn().mockResolvedValue("0xsignature"),
        getChainId: vi.fn().mockResolvedValue(10),
        switchChain: vi.fn().mockResolvedValue(undefined),
        writeContract: vi.fn().mockRejectedValueOnce(new Error("Transaction reverted")),
      } as any);

      const { result } = renderHookWithProviders(() => useDonationCheckout());
      const toast = (await import("react-hot-toast")).default;
      const payment = createTestPayment();

      useDonationCart.getState().add({
        uid: payment.projectId,
        title: "Test Project",
      });

      await act(async () => {
        await result.current.handleProceedWithDonations(
          [payment],
          createChainPayoutAddresses([payment.projectId]),
          { "USDC-10": "1000" },
          10,
          vi.fn().mockResolvedValue(undefined),
          vi.fn().mockResolvedValue(mockWalletClient),
          vi.fn()
        );
      });

      expect(toast.error).toHaveBeenCalled();
    });

    it("network switch failure shows toast and aborts", async () => {
      const switchToNetwork = vi.fn().mockRejectedValue(new Error("User rejected network switch"));
      const toast = (await import("react-hot-toast")).default;

      const { result } = renderHookWithProviders(() => useDonationCheckout());
      const payment = createTestPayment({ chainId: 8453 });

      await act(async () => {
        await result.current.handleProceedWithDonations(
          [payment],
          createChainPayoutAddresses([payment.projectId]),
          { "USDC-10": "1000" },
          10, // wrong chain
          switchToNetwork,
          vi.fn(),
          vi.fn()
        );
      });

      expect(toast.error).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Steps preview toggling
  // -----------------------------------------------------------------------

  describe("showStepsPreview state", () => {
    it("can be manually set via setShowStepsPreview", () => {
      const { result } = renderHookWithProviders(() => useDonationCheckout());

      act(() => {
        result.current.setShowStepsPreview(true);
      });

      expect(result.current.showStepsPreview).toBe(true);

      act(() => {
        result.current.setShowStepsPreview(false);
      });

      expect(result.current.showStepsPreview).toBe(false);
    });

    it("is reset to false when handleProceedWithDonations is called", async () => {
      const { result } = renderHookWithProviders(() => useDonationCheckout());

      act(() => {
        result.current.setShowStepsPreview(true);
      });

      expect(result.current.showStepsPreview).toBe(true);

      const payment = createTestPayment();

      await act(async () => {
        await result.current.handleProceedWithDonations(
          [payment],
          createChainPayoutAddresses([payment.projectId]),
          { "USDC-10": "1000" },
          10,
          vi.fn().mockResolvedValue(undefined),
          vi.fn().mockResolvedValue(mockWalletClient),
          vi.fn()
        );
      });

      expect(result.current.showStepsPreview).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Full happy-path flow
  // -----------------------------------------------------------------------

  describe("full happy-path flow", () => {
    it("validates, executes donation, persists, clears cart, and shows success toast", async () => {
      const donationsService = await import("@/services/donations.service");
      const createSpy = vi
        .spyOn(donationsService.donationsService, "createDonation")
        .mockResolvedValue({
          uid: "new-don",
          chainID: 10,
          projectUID: "proj-happy",
          payoutAddress: "0x9876543210987654321098765432109876543210",
          amount: "100",
          tokenSymbol: "USDC",
          transactionHash: MOCK_TX_HASH,
          donationType: "crypto" as never,
          status: "completed" as never,
          createdAt: new Date().toISOString(),
        });

      // Reset writeContractAsync to succeed
      mockWriteContractAsync.mockResolvedValue(MOCK_TX_HASH);

      const { result } = renderHookWithProviders(() => useDonationCheckout());
      const toast = (await import("react-hot-toast")).default;

      const payment = createTestPayment({ projectId: "proj-happy" });

      // Pre-populate cart
      useDonationCart.getState().add({
        uid: payment.projectId,
        title: "Happy Path Project",
        slug: "happy-path",
      });

      // Step 1: Trigger execution review
      await act(async () => {
        await result.current.handleExecuteDonations([payment]);
      });
      expect(result.current.showStepsPreview).toBe(true);

      // Step 2: Proceed with donations
      await act(async () => {
        await result.current.handleProceedWithDonations(
          [payment],
          createChainPayoutAddresses([payment.projectId]),
          { "USDC-10": "1000" },
          10,
          vi.fn().mockResolvedValue(undefined),
          vi.fn().mockResolvedValue(mockWalletClient),
          vi.fn()
        );
      });

      // Assert: success toast shown
      expect(toast.success).toHaveBeenCalled();

      // Assert: donation persisted to backend
      await waitFor(() => {
        expect(createSpy).toHaveBeenCalledTimes(1);
      });

      // Assert: cart was cleared
      expect(useDonationCart.getState().items).toHaveLength(0);

      // Assert: completed session recorded
      const session = useDonationCart.getState().lastCompletedSession;
      expect(session).not.toBeNull();
      expect(session?.donations.length).toBeGreaterThanOrEqual(1);

      createSpy.mockRestore();
    });

    it("processes multiple payments in the same batch", async () => {
      const donationsService = await import("@/services/donations.service");
      const createSpy = vi
        .spyOn(donationsService.donationsService, "createDonation")
        .mockResolvedValue({
          uid: "new-don",
          chainID: 10,
          projectUID: "proj-a",
          payoutAddress: "0x9876543210987654321098765432109876543210",
          amount: "50",
          tokenSymbol: "USDC",
          transactionHash: MOCK_TX_HASH,
          donationType: "crypto" as never,
          status: "completed" as never,
          createdAt: new Date().toISOString(),
        });

      mockWriteContractAsync.mockResolvedValue(MOCK_TX_HASH);

      const { result } = renderHookWithProviders(() => useDonationCheckout());

      const payments = [
        createTestPayment({ projectId: "proj-a", amount: "50" }),
        createTestPayment({ projectId: "proj-b", amount: "75" }),
      ];

      for (const p of payments) {
        useDonationCart.getState().add({ uid: p.projectId, title: `Project ${p.projectId}` });
      }

      await act(async () => {
        await result.current.handleProceedWithDonations(
          payments,
          createChainPayoutAddresses(payments.map((p) => p.projectId)),
          { "USDC-10": "5000" },
          10,
          vi.fn().mockResolvedValue(undefined),
          vi.fn().mockResolvedValue(mockWalletClient),
          vi.fn()
        );
      });

      await waitFor(() => {
        expect(createSpy).toHaveBeenCalledTimes(2);
      });

      const calledProjectUIDs = createSpy.mock.calls.map(
        (call: unknown[]) => (call[0] as Record<string, unknown>).projectUID
      );
      expect(calledProjectUIDs).toContain("proj-a");
      expect(calledProjectUIDs).toContain("proj-b");

      createSpy.mockRestore();
    });
  });

  // -----------------------------------------------------------------------
  // MSW handler override scenarios
  // -----------------------------------------------------------------------

  describe("MSW handler override scenarios", () => {
    it("GET /v2/donations/me returns mock donations", async () => {
      // The default handler is already set up by installMswLifecycle
      const response = await fetch(`${BASE}/v2/donations/me`);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty("uid");
    });

    it("POST /v2/donations returns 201 with the created donation", async () => {
      const response = await fetch(`${BASE}/v2/donations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectUID: "proj-test",
          amount: "100",
          tokenSymbol: "USDC",
          chainID: 10,
          donorAddress: MOCK_ADDRESS,
          payoutAddress: "0x9876543210987654321098765432109876543210",
          transactionHash: MOCK_TX_HASH,
          donationType: "crypto",
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.projectUID).toBe("proj-test");
    });

    it("overridden error handler returns 401", async () => {
      server.use(
        http.get(`${BASE}/v2/donations/me`, () =>
          HttpResponse.json({ error: "Unauthorized" }, { status: 401 })
        )
      );

      const response = await fetch(`${BASE}/v2/donations/me`);
      expect(response.status).toBe(401);
    });
  });
});
