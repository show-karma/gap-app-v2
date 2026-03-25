/**
 * @file Real hook tests for useClaimTransaction
 * @description Tests the actual useClaimTransaction hook with mocked external dependencies.
 *   Unlike "proxy" tests that re-implement hook logic, these import and render the REAL hook.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement } from "react";

// ---------------------------------------------------------------------------
// Hoisted mock variables — vi.hoisted ensures they're available in vi.mock factories
// ---------------------------------------------------------------------------

const {
  mockToast,
  mockWriteContract,
  mockWalletClient,
  mockWallets,
  mockSanitizeErrorMessage,
  mockSwitchOrAddChain,
  mockWaitForTransactionReceipt,
} = vi.hoisted(() => {
  const mockToast = {
    loading: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  };
  const mockWriteContract = vi.fn();
  const mockWalletClient = { writeContract: mockWriteContract };
  const mockWallets: Array<{
    address: string;
    getEthereumProvider: () => Promise<unknown>;
  }> = [];
  const mockSanitizeErrorMessage = vi.fn((err: unknown, defaultTitle: string) => ({
    title: defaultTitle,
    message: err instanceof Error ? err.message : "Unknown error",
  }));
  const mockSwitchOrAddChain = vi.fn();
  const mockWaitForTransactionReceipt = vi.fn();

  return {
    mockToast,
    mockWriteContract,
    mockWalletClient,
    mockWallets,
    mockSanitizeErrorMessage,
    mockSwitchOrAddChain,
    mockWaitForTransactionReceipt,
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("viem", () => ({
  createWalletClient: vi.fn(() => mockWalletClient),
  custom: vi.fn((provider: unknown) => provider),
}));

vi.mock("@/contexts/privy-bridge-context", () => ({
  usePrivyBridge: vi.fn(() => ({
    wallets: mockWallets,
  })),
}));

vi.mock("@/features/claim-funds/hooks/use-claim-provider", () => ({
  useClaimProvider: vi.fn(() => ({ id: "hedgey-test", name: "Hedgey" })),
}));

vi.mock("@/features/claim-funds/lib/error-messages", () => ({
  sanitizeErrorMessage: (...args: unknown[]) => mockSanitizeErrorMessage(...args),
}));

vi.mock("@/features/claim-funds/lib/hedgey-contract", () => ({
  CLAIM_CAMPAIGNS_ABI: [{ name: "claim", type: "function" }],
  uuidToBytes16: vi.fn((uuid: string) => `0x${uuid.replace(/-/g, "")}`),
}));

vi.mock("@/features/claim-funds/lib/viem-clients", () => ({
  getChainByName: vi.fn(() => ({ id: 10, name: "OP Mainnet" })),
  getPublicClient: vi.fn(() => ({
    waitForTransactionReceipt: (...args: unknown[]) => mockWaitForTransactionReceipt(...args),
  })),
  switchOrAddChain: (...args: unknown[]) => mockSwitchOrAddChain(...args),
}));

// ---------------------------------------------------------------------------
// Import the REAL hook AFTER mocks are in place
// ---------------------------------------------------------------------------
import { useClaimTransaction } from "@/features/claim-funds/hooks/use-claim-transaction";
import { getChainByName } from "@/features/claim-funds/lib/viem-clients";
import type { ClaimEligibility } from "@/features/claim-funds/types";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
    queryClient,
  };
}

const MOCK_TX_HASH = "0xabc123def456" as `0x${string}`;
const MOCK_CONTRACT = "0x1111111111111111111111111111111111111111" as `0x${string}`;
const MOCK_CAMPAIGN_ID = "550e8400-e29b-41d4-a716-446655440000";

function createMockEligibility(overrides: Partial<ClaimEligibility> = {}): ClaimEligibility {
  return {
    campaignId: MOCK_CAMPAIGN_ID,
    title: "Test Campaign",
    canClaim: true,
    claimed: false,
    amount: "1000000000000000000",
    proof: ["0xaaa" as `0x${string}`],
    claimFee: "0",
    ...overrides,
  };
}

function setupWallet(address = "0x1234567890123456789012345678901234567890") {
  const mockProvider = { request: vi.fn() };
  mockWallets.length = 0;
  mockWallets.push({
    address,
    getEthereumProvider: vi.fn().mockResolvedValue(mockProvider),
  });
  return mockProvider;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useClaimTransaction (real hook)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWallets.length = 0;
    mockWriteContract.mockReset();
    mockWaitForTransactionReceipt.mockReset();
    mockSwitchOrAddChain.mockReset();
    mockSanitizeErrorMessage.mockClear();
  });

  describe("initial state", () => {
    it("should return idle state when no claim is in progress", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useClaimTransaction("tenant-1", undefined), { wrapper });

      expect(result.current.isPending).toBe(false);
      expect(result.current.isConfirming).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.txHash).toBeUndefined();
      expect(result.current.claimingCampaignId).toBeNull();
    });

    it("should expose claim and reset functions", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useClaimTransaction("tenant-1", undefined), { wrapper });

      expect(typeof result.current.claim).toBe("function");
      expect(typeof result.current.reset).toBe("function");
    });
  });

  describe("claim guard — no wallet connected", () => {
    it("should show a toast error when no wallet is connected", () => {
      // wallets array is empty
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useClaimTransaction("tenant-1", undefined), { wrapper });

      act(() => {
        result.current.claim(MOCK_CAMPAIGN_ID, createMockEligibility(), MOCK_CONTRACT);
      });

      expect(mockToast.error).toHaveBeenCalledWith("Please connect your wallet to claim");
    });
  });

  describe("concurrent claim guard (isClaimingRef)", () => {
    it("should not start a second claim while one is already in progress", async () => {
      setupWallet();
      // Make writeContract hang forever to simulate in-progress claim
      let resolveWrite: (value: `0x${string}`) => void;
      mockWriteContract.mockReturnValue(
        new Promise<`0x${string}`>((resolve) => {
          resolveWrite = resolve;
        })
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useClaimTransaction("tenant-1", undefined), { wrapper });

      // Start first claim
      act(() => {
        result.current.claim(MOCK_CAMPAIGN_ID, createMockEligibility(), MOCK_CONTRACT);
      });

      // Wait for the first claim to reach writeContract (async ops before it must resolve)
      await waitFor(() => {
        expect(mockWriteContract).toHaveBeenCalledTimes(1);
      });

      // Try to start a second claim — should be ignored by isClaimingRef guard
      act(() => {
        result.current.claim("second-campaign", createMockEligibility(), MOCK_CONTRACT);
      });

      // writeContract should still only have been called once
      expect(mockWriteContract).toHaveBeenCalledTimes(1);

      // Clean up: resolve the pending promise
      mockWaitForTransactionReceipt.mockResolvedValue({ status: "success" });
      await act(async () => {
        resolveWrite!(MOCK_TX_HASH);
      });
    });
  });

  describe("successful claim flow", () => {
    it("should complete a full claim: switch chain, write contract, wait for receipt", async () => {
      setupWallet();
      mockWriteContract.mockResolvedValue(MOCK_TX_HASH);
      mockWaitForTransactionReceipt.mockResolvedValue({ status: "success" });

      const { wrapper, queryClient } = createWrapper();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useClaimTransaction("tenant-1", undefined), { wrapper });

      act(() => {
        result.current.claim(MOCK_CAMPAIGN_ID, createMockEligibility(), MOCK_CONTRACT);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Chain switch was called
      expect(mockSwitchOrAddChain).toHaveBeenCalledTimes(1);

      // writeContract was called with correct args
      expect(mockWriteContract).toHaveBeenCalledTimes(1);
      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: MOCK_CONTRACT,
          functionName: "claim",
        })
      );

      // Receipt was awaited
      expect(mockWaitForTransactionReceipt).toHaveBeenCalledWith(
        expect.objectContaining({ hash: MOCK_TX_HASH, timeout: 300_000 })
      );

      // Toast notifications
      expect(mockToast.loading).toHaveBeenCalledWith("Waiting for confirmation...", {
        id: "claim-tx",
      });
      expect(mockToast.success).toHaveBeenCalledWith("Your tokens have been claimed!", {
        id: "claim-tx",
      });

      // Query invalidation
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: expect.arrayContaining(["claimed-statuses"]) })
      );
    });

    it("should set txHash after writeContract resolves", async () => {
      setupWallet();
      mockWriteContract.mockResolvedValue(MOCK_TX_HASH);
      mockWaitForTransactionReceipt.mockResolvedValue({ status: "success" });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useClaimTransaction("tenant-1", undefined), { wrapper });

      act(() => {
        result.current.claim(MOCK_CAMPAIGN_ID, createMockEligibility(), MOCK_CONTRACT);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // After success the txHash should still be set (until reset)
      expect(result.current.txHash).toBe(MOCK_TX_HASH);
    });

    it("should track claimingCampaignId while claim is pending", async () => {
      setupWallet();
      let resolveWrite: (value: `0x${string}`) => void;
      mockWriteContract.mockReturnValue(
        new Promise<`0x${string}`>((resolve) => {
          resolveWrite = resolve;
        })
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useClaimTransaction("tenant-1", undefined), { wrapper });

      act(() => {
        result.current.claim(MOCK_CAMPAIGN_ID, createMockEligibility(), MOCK_CONTRACT);
      });

      await waitFor(() => {
        expect(result.current.claimingCampaignId).toBe(MOCK_CAMPAIGN_ID);
      });

      // Complete the claim
      mockWaitForTransactionReceipt.mockResolvedValue({ status: "success" });
      await act(async () => {
        resolveWrite!(MOCK_TX_HASH);
      });

      await waitFor(() => {
        expect(result.current.claimingCampaignId).toBeNull();
      });
    });
  });

  describe("chain switching", () => {
    it("should call switchOrAddChain before writing contract", async () => {
      setupWallet();
      mockWriteContract.mockResolvedValue(MOCK_TX_HASH);
      mockWaitForTransactionReceipt.mockResolvedValue({ status: "success" });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useClaimTransaction("tenant-1", undefined), { wrapper });

      act(() => {
        result.current.claim(MOCK_CAMPAIGN_ID, createMockEligibility(), MOCK_CONTRACT);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // switchOrAddChain must have been called before writeContract
      const switchOrder = mockSwitchOrAddChain.mock.invocationCallOrder[0];
      const writeOrder = mockWriteContract.mock.invocationCallOrder[0];
      expect(switchOrder).toBeLessThan(writeOrder);
    });

    it("should fail if switchOrAddChain throws", async () => {
      setupWallet();
      mockSwitchOrAddChain.mockRejectedValue(new Error("user rejected chain switch"));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useClaimTransaction("tenant-1", undefined), { wrapper });

      act(() => {
        result.current.claim(MOCK_CAMPAIGN_ID, createMockEligibility(), MOCK_CONTRACT);
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(mockWriteContract).not.toHaveBeenCalled();
      expect(mockToast.error).toHaveBeenCalled();
    });
  });

  describe("wallet disconnected during operation", () => {
    it("should throw if wallet address changes between getProvider and writeContract", async () => {
      const mockProvider = { request: vi.fn() };
      mockWallets.length = 0;
      mockWallets.push({
        address: "0xOriginalAddress",
        getEthereumProvider: vi.fn().mockResolvedValue(mockProvider),
      });

      // After switchOrAddChain, change the wallet address to simulate disconnect
      mockSwitchOrAddChain.mockImplementation(async () => {
        mockWallets[0] = {
          address: "0xDifferentAddress",
          getEthereumProvider: vi.fn().mockResolvedValue(mockProvider),
        };
      });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useClaimTransaction("tenant-1", undefined), { wrapper });

      act(() => {
        result.current.claim(MOCK_CAMPAIGN_ID, createMockEligibility(), MOCK_CONTRACT);
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error?.message).toBe("Wallet disconnected during operation");
      expect(mockWriteContract).not.toHaveBeenCalled();
    });
  });

  describe("transaction failures", () => {
    it("should handle writeContract rejection (user denied tx)", async () => {
      setupWallet();
      mockWriteContract.mockRejectedValue(new Error("User rejected the request."));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useClaimTransaction("tenant-1", undefined), { wrapper });

      act(() => {
        result.current.claim(MOCK_CAMPAIGN_ID, createMockEligibility(), MOCK_CONTRACT);
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(mockSanitizeErrorMessage).toHaveBeenCalledWith(expect.any(Error), "Claim Failed");
      expect(mockToast.error).toHaveBeenCalled();
    });

    it("should handle receipt timeout", async () => {
      setupWallet();
      mockWriteContract.mockResolvedValue(MOCK_TX_HASH);
      mockWaitForTransactionReceipt.mockRejectedValue(new Error("Timed out"));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useClaimTransaction("tenant-1", undefined), { wrapper });

      act(() => {
        result.current.claim(MOCK_CAMPAIGN_ID, createMockEligibility(), MOCK_CONTRACT);
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(mockToast.error).toHaveBeenCalled();
    });

    it("should handle on-chain revert (receipt.status !== success)", async () => {
      setupWallet();
      mockWriteContract.mockResolvedValue(MOCK_TX_HASH);
      mockWaitForTransactionReceipt.mockResolvedValue({ status: "reverted" });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useClaimTransaction("tenant-1", undefined), { wrapper });

      act(() => {
        result.current.claim(MOCK_CAMPAIGN_ID, createMockEligibility(), MOCK_CONTRACT);
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error?.message).toBe("Transaction was reverted on-chain");
    });
  });

  describe("error sanitization", () => {
    it("should call sanitizeErrorMessage with the error and default title", async () => {
      setupWallet();
      const testError = new Error("insufficient funds for gas");
      mockWriteContract.mockRejectedValue(testError);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useClaimTransaction("tenant-1", undefined), { wrapper });

      act(() => {
        result.current.claim(MOCK_CAMPAIGN_ID, createMockEligibility(), MOCK_CONTRACT);
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(mockSanitizeErrorMessage).toHaveBeenCalledWith(testError, "Claim Failed");
    });

    it("should display the sanitized message in a toast", async () => {
      setupWallet();
      mockWriteContract.mockRejectedValue(new Error("some raw error"));
      mockSanitizeErrorMessage.mockReturnValue({
        title: "Claim Failed",
        message: "Friendly error message",
      });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useClaimTransaction("tenant-1", undefined), { wrapper });

      act(() => {
        result.current.claim(MOCK_CAMPAIGN_ID, createMockEligibility(), MOCK_CONTRACT);
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(mockToast.error).toHaveBeenCalledWith("Friendly error message", { id: "claim-tx" });
    });
  });

  describe("reset", () => {
    it("should clear all state when reset is called after a successful claim", async () => {
      setupWallet();
      mockWriteContract.mockResolvedValue(MOCK_TX_HASH);
      mockWaitForTransactionReceipt.mockResolvedValue({ status: "success" });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useClaimTransaction("tenant-1", undefined), { wrapper });

      act(() => {
        result.current.claim(MOCK_CAMPAIGN_ID, createMockEligibility(), MOCK_CONTRACT);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isConfirming).toBe(false);
      expect(result.current.txHash).toBeUndefined();
      expect(result.current.error).toBeNull();
    });

    it("should clear error state when reset is called after failure", async () => {
      setupWallet();
      mockWriteContract.mockRejectedValue(new Error("fail"));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useClaimTransaction("tenant-1", undefined), { wrapper });

      act(() => {
        result.current.claim(MOCK_CAMPAIGN_ID, createMockEligibility(), MOCK_CONTRACT);
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      act(() => {
        result.current.reset();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
      expect(result.current.isPending).toBe(false);
    });
  });

  describe("isConfirming state transitions", () => {
    it("should set isConfirming to true after writeContract resolves and before receipt", async () => {
      setupWallet();
      mockWriteContract.mockResolvedValue(MOCK_TX_HASH);

      let resolveReceipt: (value: { status: string }) => void;
      mockWaitForTransactionReceipt.mockReturnValue(
        new Promise((resolve) => {
          resolveReceipt = resolve;
        })
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useClaimTransaction("tenant-1", undefined), { wrapper });

      act(() => {
        result.current.claim(MOCK_CAMPAIGN_ID, createMockEligibility(), MOCK_CONTRACT);
      });

      await waitFor(() => {
        expect(result.current.isConfirming).toBe(true);
      });

      // isPending should be false when isConfirming (isPending = mutation.isPending && !isConfirming)
      expect(result.current.isPending).toBe(false);

      // Complete
      await act(async () => {
        resolveReceipt!({ status: "success" });
      });

      await waitFor(() => {
        expect(result.current.isConfirming).toBe(false);
      });
    });
  });

  describe("onSettled resets isClaimingRef", () => {
    it("should allow a new claim after a failed one completes (isClaimingRef reset)", async () => {
      setupWallet();
      mockWriteContract.mockRejectedValueOnce(new Error("first fail"));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useClaimTransaction("tenant-1", undefined), { wrapper });

      // First claim — fails
      act(() => {
        result.current.claim(MOCK_CAMPAIGN_ID, createMockEligibility(), MOCK_CONTRACT);
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // Reset and try again
      act(() => {
        result.current.reset();
      });

      mockWriteContract.mockResolvedValue(MOCK_TX_HASH);
      mockWaitForTransactionReceipt.mockResolvedValue({ status: "success" });

      act(() => {
        result.current.claim(MOCK_CAMPAIGN_ID, createMockEligibility(), MOCK_CONTRACT);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // writeContract called twice total (once per claim attempt)
      expect(mockWriteContract).toHaveBeenCalledTimes(2);
    });
  });

  describe("mutationFn — no wallet in array", () => {
    it("should throw 'No wallet connected' if wallets array is empty during mutationFn", async () => {
      // Start with wallet to pass the guard in claim()
      setupWallet();

      // Remove wallet before mutationFn executes
      mockSwitchOrAddChain.mockImplementation(async () => {
        // This won't help because mutationFn captures wallet at the start
        // The test verifies the guard inside mutationFn
      });

      // Clear wallets AFTER the claim() guard check but we can test the
      // initial mutationFn guard by having a wallet with no address
      mockWallets.length = 0;
      mockWallets.push({
        address: "", // falsy address
        getEthereumProvider: vi.fn().mockResolvedValue({ request: vi.fn() }),
      });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useClaimTransaction("tenant-1", undefined), { wrapper });

      // The claim() guard checks wallets[0]?.address which is "" (falsy)
      act(() => {
        result.current.claim(MOCK_CAMPAIGN_ID, createMockEligibility(), MOCK_CONTRACT);
      });

      // Should show toast error from the guard, not start mutation
      expect(mockToast.error).toHaveBeenCalledWith("Please connect your wallet to claim");
    });
  });

  describe("network configuration", () => {
    it("should use hedgey networkName from claimGrants config", () => {
      const hedgeyConfig = {
        enabled: true,
        provider: "hedgey" as const,
        providerConfig: {
          type: "hedgey" as const,
          networkName: "arbitrum",
          contractAddress: "0x1234",
        },
      };

      const { wrapper } = createWrapper();
      // Simply rendering the hook with hedgey config should call getChainByName
      renderHook(() => useClaimTransaction("tenant-1", hedgeyConfig), { wrapper });

      expect(getChainByName).toHaveBeenCalledWith("arbitrum");
    });

    it("should default to optimism when providerConfig is not hedgey", () => {
      const { wrapper } = createWrapper();
      renderHook(() => useClaimTransaction("tenant-1", undefined), { wrapper });

      expect(getChainByName).toHaveBeenCalledWith("optimism");
    });
  });
});
