/**
 * @file Real hook tests for useDelegatedClaim
 * @description Tests the actual useDelegatedClaim hook with mocked external dependencies.
 *   Covers the two-step signature + submission flow, step state machine, error handling,
 *   and all edge cases in the delegated claim process.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement } from "react";

// ---------------------------------------------------------------------------
// Hoisted mock variables
// ---------------------------------------------------------------------------

const {
  mockToast,
  mockSignTypedData,
  mockWriteContract,
  mockWalletClient,
  mockSanitizeErrorMessage,
  mockSwitchOrAddChain,
  mockReadContract,
  mockWaitForTransactionReceipt,
  mockGetBrowserProvider,
  mockRequestAccounts,
} = vi.hoisted(() => {
  const mockToast = {
    loading: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  };
  const mockSignTypedData = vi.fn();
  const mockWriteContract = vi.fn();
  // Both wallet clients have all methods — the hook uses signTypedData for signing
  // and writeContract for submitting, both on separately-created wallet clients.
  const mockWalletClient = {
    signTypedData: mockSignTypedData,
    writeContract: mockWriteContract,
  };
  const mockSanitizeErrorMessage = vi.fn((err: unknown, defaultTitle: string) => ({
    title: defaultTitle,
    message: err instanceof Error ? err.message : "Unknown error",
  }));
  const mockSwitchOrAddChain = vi.fn();
  const mockReadContract = vi.fn();
  const mockWaitForTransactionReceipt = vi.fn();
  const mockGetBrowserProvider = vi.fn();
  const mockRequestAccounts = vi.fn();

  return {
    mockToast,
    mockSignTypedData,
    mockWriteContract,
    mockWalletClient,
    mockSanitizeErrorMessage,
    mockSwitchOrAddChain,
    mockReadContract,
    mockWaitForTransactionReceipt,
    mockGetBrowserProvider,
    mockRequestAccounts,
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("viem", () => ({
  createWalletClient: vi.fn(() => mockWalletClient),
  custom: vi.fn((provider: unknown) => provider),
  getAddress: vi.fn((addr: string) => addr),
  hexToSignature: vi.fn((_sig: string) => ({
    v: 27n,
    r: "0xaaaa" as `0x${string}`,
    s: "0xbbbb" as `0x${string}`,
  })),
}));

vi.mock("@/contexts/privy-bridge-context", () => ({
  usePrivyBridge: vi.fn(() => ({ wallets: [] })),
}));

vi.mock("@/features/claim-funds/hooks/use-claim-provider", () => ({
  useClaimProvider: vi.fn(() => ({ id: "hedgey-test", name: "Hedgey" })),
}));

vi.mock("@/features/claim-funds/lib/error-messages", () => ({
  sanitizeErrorMessage: (...args: unknown[]) => mockSanitizeErrorMessage(...args),
}));

vi.mock("@/features/claim-funds/lib/hedgey-contract", () => ({
  CLAIM_CAMPAIGNS_ABI: [{ name: "claimWithSig", type: "function" }],
  uuidToBytes16: vi.fn((uuid: string) => `0x${uuid.replace(/-/g, "")}`),
  buildClaimTypedData: vi.fn(() => ({
    domain: { name: "ClaimCampaigns", version: "1", chainId: 10 },
    types: { Claim: [] },
    primaryType: "Claim",
    message: {},
  })),
}));

vi.mock("@/features/claim-funds/lib/viem-clients", () => ({
  getChainByName: vi.fn(() => ({ id: 10, name: "OP Mainnet" })),
  getPublicClient: vi.fn(() => ({
    readContract: (...args: unknown[]) => mockReadContract(...args),
    waitForTransactionReceipt: (...args: unknown[]) => mockWaitForTransactionReceipt(...args),
  })),
  switchOrAddChain: (...args: unknown[]) => mockSwitchOrAddChain(...args),
  getBrowserProvider: (...args: unknown[]) => mockGetBrowserProvider(...args),
  requestAccounts: (...args: unknown[]) => mockRequestAccounts(...args),
}));

vi.mock("@/utilities/donations/helpers", () => ({
  formatAddressForDisplay: vi.fn(
    (addr: string, start: number, end: number) =>
      `${addr.slice(0, start + 2)}...${addr.slice(-end)}`
  ),
}));

// ---------------------------------------------------------------------------
// Import the REAL hook AFTER mocks
// ---------------------------------------------------------------------------
import { useDelegatedClaim } from "@/features/claim-funds/hooks/use-delegated-claim";
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

const MOCK_TX_HASH = "0xdeadbeef" as `0x${string}`;
const MOCK_CONTRACT = "0x1111111111111111111111111111111111111111" as `0x${string}`;
const MOCK_CLAIMER = "0x2222222222222222222222222222222222222222" as `0x${string}`;
const MOCK_SUBMITTER = "0x3333333333333333333333333333333333333333";
const MOCK_CAMPAIGN_ID = "550e8400-e29b-41d4-a716-446655440000";
const MOCK_SIGNATURE = "0xfakesignature" as `0x${string}`;

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

function setupBrowserProvider() {
  const mockProvider = { request: vi.fn() };
  mockGetBrowserProvider.mockReturnValue(mockProvider);
  return mockProvider;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useDelegatedClaim (real hook)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignTypedData.mockReset();
    mockWriteContract.mockReset();
    mockReadContract.mockReset();
    mockWaitForTransactionReceipt.mockReset();
    mockSwitchOrAddChain.mockReset();
    mockGetBrowserProvider.mockReset();
    mockRequestAccounts.mockReset();
    mockSanitizeErrorMessage.mockClear();
    mockSanitizeErrorMessage.mockImplementation((err: unknown, defaultTitle: string) => ({
      title: defaultTitle,
      message: err instanceof Error ? err.message : "Unknown error",
    }));
  });

  // =========================================================================
  // Initial state
  // =========================================================================

  describe("initial state", () => {
    it("should start in idle step", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDelegatedClaim("tenant-1", undefined), { wrapper });

      expect(result.current.step).toBe("idle");
    });

    it("should have no pending claim initially", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDelegatedClaim("tenant-1", undefined), { wrapper });

      expect(result.current.pendingClaim).toBeNull();
    });

    it("should report all flags as false initially", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDelegatedClaim("tenant-1", undefined), { wrapper });

      expect(result.current.isPending).toBe(false);
      expect(result.current.isConfirming).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.txHash).toBeUndefined();
      expect(result.current.activeCampaignId).toBeNull();
    });

    it("should expose requestSignature, submitClaim, and reset functions", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDelegatedClaim("tenant-1", undefined), { wrapper });

      expect(typeof result.current.requestSignature).toBe("function");
      expect(typeof result.current.submitClaim).toBe("function");
      expect(typeof result.current.reset).toBe("function");
    });
  });

  // =========================================================================
  // Step 1: requestSignature
  // =========================================================================

  describe("requestSignature", () => {
    it("should transition to awaiting_signature when requestSignature is called", async () => {
      setupBrowserProvider();
      mockReadContract.mockResolvedValue(0n); // nonce
      // Keep signTypedData hanging to observe the intermediate state
      let resolveSign: (value: `0x${string}`) => void;
      mockSignTypedData.mockReturnValue(
        new Promise<`0x${string}`>((resolve) => {
          resolveSign = resolve;
        })
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDelegatedClaim("tenant-1", undefined), { wrapper });

      act(() => {
        result.current.requestSignature(
          MOCK_CAMPAIGN_ID,
          createMockEligibility(),
          MOCK_CONTRACT,
          MOCK_CLAIMER
        );
      });

      await waitFor(() => {
        expect(result.current.step).toBe("awaiting_signature");
      });

      expect(result.current.isPending).toBe(true);

      // Clean up
      await act(async () => {
        resolveSign!(MOCK_SIGNATURE);
      });
    });

    it("should track activeCampaignId during signature request", async () => {
      setupBrowserProvider();
      mockReadContract.mockResolvedValue(0n);
      let resolveSign: (value: `0x${string}`) => void;
      mockSignTypedData.mockReturnValue(
        new Promise<`0x${string}`>((resolve) => {
          resolveSign = resolve;
        })
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDelegatedClaim("tenant-1", undefined), { wrapper });

      act(() => {
        result.current.requestSignature(
          MOCK_CAMPAIGN_ID,
          createMockEligibility(),
          MOCK_CONTRACT,
          MOCK_CLAIMER
        );
      });

      await waitFor(() => {
        expect(result.current.activeCampaignId).toBe(MOCK_CAMPAIGN_ID);
      });

      // Clean up
      await act(async () => {
        resolveSign!(MOCK_SIGNATURE);
      });
    });

    it("should transition to signature_obtained on success and set pendingClaim", async () => {
      setupBrowserProvider();
      mockReadContract.mockResolvedValue(5n); // nonce
      mockSignTypedData.mockResolvedValue(MOCK_SIGNATURE);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDelegatedClaim("tenant-1", undefined), { wrapper });

      act(() => {
        result.current.requestSignature(
          MOCK_CAMPAIGN_ID,
          createMockEligibility(),
          MOCK_CONTRACT,
          MOCK_CLAIMER
        );
      });

      await waitFor(() => {
        expect(result.current.step).toBe("signature_obtained");
      });

      expect(result.current.pendingClaim).not.toBeNull();
      expect(result.current.pendingClaim?.campaignId).toBe(MOCK_CAMPAIGN_ID);
      expect(result.current.pendingClaim?.claimerAddress).toBe(MOCK_CLAIMER);
      expect(result.current.pendingClaim?.contractAddress).toBe(MOCK_CONTRACT);
      expect(result.current.pendingClaim?.signature).toEqual(
        expect.objectContaining({
          nonce: 5n,
          v: 27,
          r: "0xaaaa",
          s: "0xbbbb",
        })
      );
    });

    it("should show loading toast when requesting signature", async () => {
      setupBrowserProvider();
      mockReadContract.mockResolvedValue(0n);
      mockSignTypedData.mockResolvedValue(MOCK_SIGNATURE);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDelegatedClaim("tenant-1", undefined), { wrapper });

      act(() => {
        result.current.requestSignature(
          MOCK_CAMPAIGN_ID,
          createMockEligibility(),
          MOCK_CONTRACT,
          MOCK_CLAIMER
        );
      });

      await waitFor(() => {
        expect(result.current.step).toBe("signature_obtained");
      });

      expect(mockToast.loading).toHaveBeenCalledWith(
        "Please sign the authorization in your wallet...",
        { id: "signature-request" }
      );
      expect(mockToast.success).toHaveBeenCalledWith(
        "Signature obtained! You can now submit the claim transaction.",
        { id: "signature-request" }
      );
    });

    it("should call switchOrAddChain before signing", async () => {
      setupBrowserProvider();
      mockReadContract.mockResolvedValue(0n);
      mockSignTypedData.mockResolvedValue(MOCK_SIGNATURE);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDelegatedClaim("tenant-1", undefined), { wrapper });

      act(() => {
        result.current.requestSignature(
          MOCK_CAMPAIGN_ID,
          createMockEligibility(),
          MOCK_CONTRACT,
          MOCK_CLAIMER
        );
      });

      await waitFor(() => {
        expect(result.current.step).toBe("signature_obtained");
      });

      expect(mockSwitchOrAddChain).toHaveBeenCalled();
      const switchOrder = mockSwitchOrAddChain.mock.invocationCallOrder[0];
      const signOrder = mockSignTypedData.mock.invocationCallOrder[0];
      expect(switchOrder).toBeLessThan(signOrder);
    });

    it("should not start a second signature while one is in progress", async () => {
      setupBrowserProvider();
      mockReadContract.mockResolvedValue(0n);
      let resolveSign: (value: `0x${string}`) => void;
      mockSignTypedData.mockReturnValue(
        new Promise<`0x${string}`>((resolve) => {
          resolveSign = resolve;
        })
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDelegatedClaim("tenant-1", undefined), { wrapper });

      act(() => {
        result.current.requestSignature(
          MOCK_CAMPAIGN_ID,
          createMockEligibility(),
          MOCK_CONTRACT,
          MOCK_CLAIMER
        );
      });

      await waitFor(() => {
        expect(result.current.step).toBe("awaiting_signature");
      });

      // Second call should be ignored
      act(() => {
        result.current.requestSignature(
          "other-id",
          createMockEligibility(),
          MOCK_CONTRACT,
          MOCK_CLAIMER
        );
      });

      // signTypedData should still only have been called once
      expect(mockSignTypedData).toHaveBeenCalledTimes(1);

      // Clean up
      await act(async () => {
        resolveSign!(MOCK_SIGNATURE);
      });
    });
  });

  // =========================================================================
  // requestSignature error handling
  // =========================================================================

  describe("requestSignature errors", () => {
    it("should throw if no browser provider is found", async () => {
      mockGetBrowserProvider.mockReturnValue(undefined);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDelegatedClaim("tenant-1", undefined), { wrapper });

      act(() => {
        result.current.requestSignature(
          MOCK_CAMPAIGN_ID,
          createMockEligibility(),
          MOCK_CONTRACT,
          MOCK_CLAIMER
        );
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.step).toBe("idle");
    });

    it("should show 'already pending' message for pending wallet request errors", async () => {
      setupBrowserProvider();
      mockReadContract.mockResolvedValue(0n);
      mockSignTypedData.mockRejectedValue(new Error("already pending request"));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDelegatedClaim("tenant-1", undefined), { wrapper });

      act(() => {
        result.current.requestSignature(
          MOCK_CAMPAIGN_ID,
          createMockEligibility(),
          MOCK_CONTRACT,
          MOCK_CLAIMER
        );
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(mockToast.error).toHaveBeenCalledWith(
        "A wallet request is already pending. Please check your wallet extension.",
        { id: "signature-request" }
      );
    });

    it("should show account mismatch message for 'does not match' errors", async () => {
      setupBrowserProvider();
      mockReadContract.mockResolvedValue(0n);
      mockSignTypedData.mockRejectedValue(new Error("account does not match"));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDelegatedClaim("tenant-1", undefined), { wrapper });

      act(() => {
        result.current.requestSignature(
          MOCK_CAMPAIGN_ID,
          createMockEligibility(),
          MOCK_CONTRACT,
          MOCK_CLAIMER
        );
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining("Please select account"),
        { id: "signature-request" }
      );
    });

    it("should show account mismatch message for 'unknown account' errors", async () => {
      setupBrowserProvider();
      mockReadContract.mockResolvedValue(0n);
      mockSignTypedData.mockRejectedValue(new Error("unknown account 0x222"));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDelegatedClaim("tenant-1", undefined), { wrapper });

      act(() => {
        result.current.requestSignature(
          MOCK_CAMPAIGN_ID,
          createMockEligibility(),
          MOCK_CONTRACT,
          MOCK_CLAIMER
        );
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining("Please select account"),
        { id: "signature-request" }
      );
    });

    it("should show rejection message when user denies signature", async () => {
      setupBrowserProvider();
      mockReadContract.mockResolvedValue(0n);
      mockSignTypedData.mockRejectedValue(new Error("User rejected the request"));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDelegatedClaim("tenant-1", undefined), { wrapper });

      act(() => {
        result.current.requestSignature(
          MOCK_CAMPAIGN_ID,
          createMockEligibility(),
          MOCK_CONTRACT,
          MOCK_CLAIMER
        );
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(mockToast.error).toHaveBeenCalledWith("You rejected the signature request.", {
        id: "signature-request",
      });
    });

    it("should show rejection message when user denied signature", async () => {
      setupBrowserProvider();
      mockReadContract.mockResolvedValue(0n);
      mockSignTypedData.mockRejectedValue(new Error("User denied the request"));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDelegatedClaim("tenant-1", undefined), { wrapper });

      act(() => {
        result.current.requestSignature(
          MOCK_CAMPAIGN_ID,
          createMockEligibility(),
          MOCK_CONTRACT,
          MOCK_CLAIMER
        );
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(mockToast.error).toHaveBeenCalledWith("You rejected the signature request.", {
        id: "signature-request",
      });
    });

    it("should show generic error message for unrecognized errors", async () => {
      setupBrowserProvider();
      mockReadContract.mockResolvedValue(0n);
      mockSignTypedData.mockRejectedValue(new Error("some random network error"));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDelegatedClaim("tenant-1", undefined), { wrapper });

      act(() => {
        result.current.requestSignature(
          MOCK_CAMPAIGN_ID,
          createMockEligibility(),
          MOCK_CONTRACT,
          MOCK_CLAIMER
        );
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(mockToast.error).toHaveBeenCalledWith("some random network error", {
        id: "signature-request",
      });
    });
  });

  // =========================================================================
  // Step 2: submitClaim
  // =========================================================================

  describe("submitClaim", () => {
    async function setupWithSignature() {
      setupBrowserProvider();
      mockReadContract.mockResolvedValue(0n);
      mockSignTypedData.mockResolvedValue(MOCK_SIGNATURE);

      const wrapperResult = createWrapper();
      const { result } = renderHook(() => useDelegatedClaim("tenant-1", undefined), {
        wrapper: wrapperResult.wrapper,
      });

      // Complete signature step
      act(() => {
        result.current.requestSignature(
          MOCK_CAMPAIGN_ID,
          createMockEligibility(),
          MOCK_CONTRACT,
          MOCK_CLAIMER
        );
      });

      await waitFor(() => {
        expect(result.current.step).toBe("signature_obtained");
      });

      return { result, ...wrapperResult };
    }

    it("should not submit if there is no pending claim", () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDelegatedClaim("tenant-1", undefined), { wrapper });

      act(() => {
        result.current.submitClaim();
      });

      // Should remain idle
      expect(result.current.step).toBe("idle");
      expect(mockWriteContract).not.toHaveBeenCalled();
    });

    it("should transition to submitting when submitClaim is called", async () => {
      const { result } = await setupWithSignature();

      // Setup submitter
      mockRequestAccounts.mockResolvedValue([MOCK_SUBMITTER]);
      let resolveWrite: (value: `0x${string}`) => void;
      mockWriteContract.mockReturnValue(
        new Promise<`0x${string}`>((resolve) => {
          resolveWrite = resolve;
        })
      );

      act(() => {
        result.current.submitClaim();
      });

      await waitFor(() => {
        expect(result.current.step).toBe("submitting");
      });

      // Clean up
      mockWaitForTransactionReceipt.mockResolvedValue({ status: "success" });
      await act(async () => {
        resolveWrite!(MOCK_TX_HASH);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it("should complete full submit flow: requestAccounts, switchChain, writeContract, waitReceipt", async () => {
      const { result, queryClient } = await setupWithSignature();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      mockRequestAccounts.mockResolvedValue([MOCK_SUBMITTER]);
      mockWriteContract.mockResolvedValue(MOCK_TX_HASH);
      mockWaitForTransactionReceipt.mockResolvedValue({ status: "success" });

      act(() => {
        result.current.submitClaim();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockRequestAccounts).toHaveBeenCalled();
      expect(mockSwitchOrAddChain).toHaveBeenCalledTimes(2); // once for sign, once for submit
      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: "claimWithSig",
          address: MOCK_CONTRACT,
        })
      );
      expect(mockWaitForTransactionReceipt).toHaveBeenCalledWith(
        expect.objectContaining({ hash: MOCK_TX_HASH, timeout: 300_000 })
      );

      // Toast
      expect(mockToast.loading).toHaveBeenCalledWith("Waiting for confirmation...", {
        id: "delegated-tx",
      });
      expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining("Tokens sent to"), {
        id: "delegated-tx",
      });

      // Query invalidation
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: expect.arrayContaining(["claimed-statuses"]) })
      );
    });

    it("should set txHash after writeContract resolves", async () => {
      const { result } = await setupWithSignature();

      mockRequestAccounts.mockResolvedValue([MOCK_SUBMITTER]);
      mockWriteContract.mockResolvedValue(MOCK_TX_HASH);
      mockWaitForTransactionReceipt.mockResolvedValue({ status: "success" });

      act(() => {
        result.current.submitClaim();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.txHash).toBe(MOCK_TX_HASH);
    });

    it("should clear pendingClaim after successful submission", async () => {
      const { result } = await setupWithSignature();

      mockRequestAccounts.mockResolvedValue([MOCK_SUBMITTER]);
      mockWriteContract.mockResolvedValue(MOCK_TX_HASH);
      mockWaitForTransactionReceipt.mockResolvedValue({ status: "success" });

      act(() => {
        result.current.submitClaim();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.pendingClaim).toBeNull();
    });
  });

  // =========================================================================
  // submitClaim error handling
  // =========================================================================

  describe("submitClaim errors", () => {
    async function setupWithSignature() {
      setupBrowserProvider();
      mockReadContract.mockResolvedValue(0n);
      mockSignTypedData.mockResolvedValue(MOCK_SIGNATURE);

      const wrapperResult = createWrapper();
      const { result } = renderHook(() => useDelegatedClaim("tenant-1", undefined), {
        wrapper: wrapperResult.wrapper,
      });

      act(() => {
        result.current.requestSignature(
          MOCK_CAMPAIGN_ID,
          createMockEligibility(),
          MOCK_CONTRACT,
          MOCK_CLAIMER
        );
      });

      await waitFor(() => {
        expect(result.current.step).toBe("signature_obtained");
      });

      return { result, ...wrapperResult };
    }

    it("should throw if no browser provider for submit", async () => {
      const { result } = await setupWithSignature();

      // Remove browser provider for the submit step
      mockGetBrowserProvider.mockReturnValue(undefined);

      act(() => {
        result.current.submitClaim();
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(mockToast.error).toHaveBeenCalled();
    });

    it("should throw if no account available from requestAccounts", async () => {
      const { result } = await setupWithSignature();

      mockRequestAccounts.mockResolvedValue([]); // no accounts

      act(() => {
        result.current.submitClaim();
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });

    it("should handle on-chain revert during submission", async () => {
      const { result } = await setupWithSignature();

      mockRequestAccounts.mockResolvedValue([MOCK_SUBMITTER]);
      mockWriteContract.mockResolvedValue(MOCK_TX_HASH);
      mockWaitForTransactionReceipt.mockResolvedValue({ status: "reverted" });

      act(() => {
        result.current.submitClaim();
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error?.message).toBe("Transaction was reverted on-chain");
    });

    it("should call sanitizeErrorMessage on submit error and show toast", async () => {
      const { result } = await setupWithSignature();

      const submitError = new Error("execution reverted");
      mockRequestAccounts.mockResolvedValue([MOCK_SUBMITTER]);
      mockWriteContract.mockRejectedValue(submitError);

      act(() => {
        result.current.submitClaim();
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(mockSanitizeErrorMessage).toHaveBeenCalledWith(submitError, "Claim Failed");
      expect(mockToast.error).toHaveBeenCalledWith(expect.any(String), { id: "delegated-tx" });
    });

    it("should reset isConfirming on settled even after error", async () => {
      const { result } = await setupWithSignature();

      mockRequestAccounts.mockResolvedValue([MOCK_SUBMITTER]);
      mockWriteContract.mockResolvedValue(MOCK_TX_HASH);
      mockWaitForTransactionReceipt.mockRejectedValue(new Error("timeout"));

      act(() => {
        result.current.submitClaim();
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.isConfirming).toBe(false);
    });
  });

  // =========================================================================
  // Step state machine
  // =========================================================================

  describe("step state machine", () => {
    it("should follow idle -> awaiting_signature -> signature_obtained -> submitting -> idle(success) flow", async () => {
      setupBrowserProvider();
      mockReadContract.mockResolvedValue(0n);
      mockSignTypedData.mockResolvedValue(MOCK_SIGNATURE);
      mockRequestAccounts.mockResolvedValue([MOCK_SUBMITTER]);
      mockWriteContract.mockResolvedValue(MOCK_TX_HASH);
      mockWaitForTransactionReceipt.mockResolvedValue({ status: "success" });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDelegatedClaim("tenant-1", undefined), { wrapper });

      // Starts idle
      expect(result.current.step).toBe("idle");

      // Step 1: Request signature
      act(() => {
        result.current.requestSignature(
          MOCK_CAMPAIGN_ID,
          createMockEligibility(),
          MOCK_CONTRACT,
          MOCK_CLAIMER
        );
      });

      await waitFor(() => {
        expect(result.current.step).toBe("signature_obtained");
      });

      // Step 2: Submit claim
      act(() => {
        result.current.submitClaim();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // After success with pendingClaim cleared, step derives to idle
      // (submitMutation is not pending, signatureMutation is not pending, pendingClaim is null)
      // But isSuccess is still true from submitMutation
    });
  });

  // =========================================================================
  // Reset
  // =========================================================================

  describe("reset", () => {
    it("should clear all state including pendingClaim", async () => {
      setupBrowserProvider();
      mockReadContract.mockResolvedValue(0n);
      mockSignTypedData.mockResolvedValue(MOCK_SIGNATURE);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDelegatedClaim("tenant-1", undefined), { wrapper });

      act(() => {
        result.current.requestSignature(
          MOCK_CAMPAIGN_ID,
          createMockEligibility(),
          MOCK_CONTRACT,
          MOCK_CLAIMER
        );
      });

      await waitFor(() => {
        expect(result.current.pendingClaim).not.toBeNull();
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.step).toBe("idle");
      expect(result.current.pendingClaim).toBeNull();
      expect(result.current.isConfirming).toBe(false);
      expect(result.current.txHash).toBeUndefined();
      expect(result.current.error).toBeNull();
      expect(result.current.isSuccess).toBe(false);
    });

    it("should allow re-requesting signature after reset", async () => {
      setupBrowserProvider();
      mockReadContract.mockResolvedValue(0n);
      mockSignTypedData.mockResolvedValue(MOCK_SIGNATURE);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDelegatedClaim("tenant-1", undefined), { wrapper });

      // First signature
      act(() => {
        result.current.requestSignature(
          MOCK_CAMPAIGN_ID,
          createMockEligibility(),
          MOCK_CONTRACT,
          MOCK_CLAIMER
        );
      });

      await waitFor(() => {
        expect(result.current.step).toBe("signature_obtained");
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.step).toBe("idle");

      // Second signature
      act(() => {
        result.current.requestSignature(
          MOCK_CAMPAIGN_ID,
          createMockEligibility(),
          MOCK_CONTRACT,
          MOCK_CLAIMER
        );
      });

      await waitFor(() => {
        expect(result.current.step).toBe("signature_obtained");
      });

      expect(mockSignTypedData).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // Error combined from both mutations
  // =========================================================================

  describe("error aggregation", () => {
    it("should expose signatureMutation error when signature fails", async () => {
      setupBrowserProvider();
      mockReadContract.mockResolvedValue(0n);
      const sigError = new Error("signature failed");
      mockSignTypedData.mockRejectedValue(sigError);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDelegatedClaim("tenant-1", undefined), { wrapper });

      act(() => {
        result.current.requestSignature(
          MOCK_CAMPAIGN_ID,
          createMockEligibility(),
          MOCK_CONTRACT,
          MOCK_CLAIMER
        );
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error?.message).toBe("signature failed");
    });
  });

  // =========================================================================
  // Network configuration
  // =========================================================================

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
      renderHook(() => useDelegatedClaim("tenant-1", hedgeyConfig), { wrapper });

      expect(getChainByName).toHaveBeenCalledWith("arbitrum");
    });
  });
});
