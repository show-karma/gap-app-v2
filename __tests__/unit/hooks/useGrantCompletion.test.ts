/**
 * @file Tests for useGrantCompletion hook
 * @description Tests grant completion workflow with utilities
 */

// Mock ESM modules to avoid parsing issues
vi.mock("@/utilities/gasless", () => ({
  createGaslessClient: vi.fn().mockResolvedValue(null),
  getGaslessSigner: vi.fn().mockResolvedValue(null),
  isChainSupportedForGasless: vi.fn().mockReturnValue(false),
  createPrivySignerForGasless: vi.fn().mockResolvedValue(null),
  getChainGaslessConfig: vi.fn().mockReturnValue(null),
  getProviderForChain: vi.fn().mockReturnValue(null),
  SUPPORTED_GASLESS_CHAINS: [],
  GaslessProviderError: class GaslessProviderError extends Error {},
}));

vi.mock("@/hooks/useZeroDevSigner", () => ({
  useZeroDevSigner: vi.fn(() => ({
    getSignerForChain: vi.fn().mockResolvedValue(null),
    getAttestationSigner: vi.fn().mockResolvedValue({}),
    isGaslessAvailable: false,
    attestationAddress: null,
    hasEmbeddedWallet: false,
    hasExternalWallet: true,
    isLoading: false,
    error: null,
  })),
}));

// Mock ALL dependencies to avoid ESM import issues
const mockFetchGrantInstance = vi.fn();
const mockNotifyIndexerForGrant = vi.fn();
const mockPollForGrantCompletion = vi.fn();
const mockToastSuccess = vi.fn();
const mockShowError = vi.fn();
const mockShowSuccess = vi.fn();

vi.mock("@/utilities/grant-helpers", () => ({
  getSDKGrantInstance: mockFetchGrantInstance,
}));

vi.mock("@/utilities/indexer-notification", () => ({
  notifyIndexerForGrant: mockNotifyIndexerForGrant,
}));

vi.mock("@/utilities/attestation-polling", () => ({
  pollForGrantCompletion: mockPollForGrantCompletion,
}));

const mockUseAccount = vi.fn();
const mockUseChainId = vi.fn(() => 1);
vi.mock("wagmi", () => ({
  useAccount: mockUseAccount,
  useChainId: mockUseChainId,
}));

vi.mock("@/hooks/useWallet", () => ({
  useWallet: vi.fn(() => ({ switchChainAsync: vi.fn() })),
}));

vi.mock("@/hooks/useAttestationToast", () => ({
  useAttestationToast: vi.fn(() => ({
    startAttestation: vi.fn(),
    changeStepperStep: vi.fn(),
    setIsStepper: vi.fn(),
    showLoading: vi.fn(),
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    updateStep: vi.fn(),
    dismiss: vi.fn(),
  })),
}));

// SWC transforms @/ aliases to relative paths at compile time, so vi.mock("@/hooks/...")
// doesn't intercept the hook's internal import. We must mock the actual file path instead.
const mockSetupChainAndWallet = vi.fn().mockResolvedValue(null);
vi.mock("../../../hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: vi.fn(() => ({
    setupChainAndWallet: mockSetupChainAndWallet,
    isSmartWalletReady: false,
    smartWalletAddress: null,
    hasEmbeddedWallet: false,
    hasExternalWallet: true,
  })),
}));

vi.mock("@/utilities/sanitize", () => ({
  sanitizeObject: vi.fn((obj) => obj),
}));

import { act, renderHook } from "@testing-library/react";

// Import the hook to test AFTER mocking dependencies
const { useGrantCompletion } = require("@/hooks/useGrantCompletion");

describe("useGrantCompletion", () => {
  const mockGrant = {
    uid: "grant-123",
    chainID: 42161,
    completed: false,
  } as any;

  const mockProject = {
    uid: "project-456",
  };

  const mockGapClient = { fetch: { projectById: vi.fn() } } as any;
  const mockWalletSigner = { getAddress: vi.fn() } as any;
  const mockGrantInstance = {
    complete: vi.fn(),
  } as any;

  let consoleSpy: vi.SpyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    // Re-apply mock return values that clearAllMocks doesn't reset
    // (restoreAllMocks in afterEach DOES reset them)
    mockUseAccount.mockReturnValue({ chain: { id: 1 }, address: "0x123" });
    mockSetupChainAndWallet.mockResolvedValue(null);
    // Suppress expected console.error from the hook's catch blocks
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe("Initialization", () => {
    it("should initialize with isCompleting false", () => {
      const { result } = renderHook(() => useGrantCompletion({}));

      expect(result.current.isCompleting).toBe(false);
      expect(typeof result.current.completeGrant).toBe("function");
    });

    it("should accept onComplete callback", () => {
      const onComplete = vi.fn();
      const { result } = renderHook(() => useGrantCompletion({ onComplete }));

      expect(typeof result.current.completeGrant).toBe("function");
    });
  });

  describe("Successful Grant Completion", () => {
    it("should complete grant successfully", async () => {
      const onComplete = vi.fn();

      mockSetupChainAndWallet.mockResolvedValue({
        gapClient: mockGapClient,
        walletSigner: mockWalletSigner,
        chainId: 42161,
      });

      mockFetchGrantInstance.mockResolvedValue(mockGrantInstance);

      mockGrantInstance.complete.mockResolvedValue({
        tx: [{ hash: "0xabc123" }],
      });

      mockNotifyIndexerForGrant.mockResolvedValue(undefined);
      mockPollForGrantCompletion.mockResolvedValue(undefined);

      const { result } = renderHook(() => useGrantCompletion({ onComplete }));

      await act(async () => {
        await result.current.completeGrant(mockGrant, mockProject);
      });

      expect(mockSetupChainAndWallet).toHaveBeenCalledWith({
        targetChainId: 42161,
        currentChainId: 1,
        switchChainAsync: expect.any(Function),
      });

      expect(mockFetchGrantInstance).toHaveBeenCalledWith({
        gapClient: mockGapClient,
        projectUid: "project-456",
        grantUid: "grant-123",
      });

      expect(mockGrantInstance.complete).toHaveBeenCalled();

      expect(mockNotifyIndexerForGrant).toHaveBeenCalledWith("0xabc123", 42161, "project-456");

      expect(mockPollForGrantCompletion).toHaveBeenCalledWith({
        gapClient: mockGapClient,
        projectUid: "project-456",
        grantUid: "grant-123",
      });

      expect(mockShowSuccess).toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalled();
      expect(result.current.isCompleting).toBe(false);
    });

    it("should work without onComplete callback", async () => {
      mockSetupChainAndWallet.mockResolvedValue({
        gapClient: mockGapClient,
        walletSigner: mockWalletSigner,
        chainId: 42161,
      });

      mockFetchGrantInstance.mockResolvedValue(mockGrantInstance);

      mockGrantInstance.complete.mockResolvedValue({
        tx: [{ hash: "0xabc123" }],
      });

      mockNotifyIndexerForGrant.mockResolvedValue(undefined);
      mockPollForGrantCompletion.mockResolvedValue(undefined);

      const { result } = renderHook(() => useGrantCompletion({}));

      await act(async () => {
        await result.current.completeGrant(mockGrant, mockProject);
      });

      expect(mockShowSuccess).toHaveBeenCalled();
      expect(result.current.isCompleting).toBe(false);
    });
  });

  describe("Chain Setup Failures", () => {
    it("should handle chain setup failure", async () => {
      // Default mock already returns null for setupChainAndWallet
      const { result } = renderHook(() => useGrantCompletion({}));

      await act(async () => {
        await result.current.completeGrant(mockGrant, mockProject);
      });

      expect(mockSetupChainAndWallet).toHaveBeenCalled();

      expect(mockShowError).toHaveBeenCalledWith(
        "Please switch to the correct network and try again"
      );
      expect(mockFetchGrantInstance).not.toHaveBeenCalled();
      expect(result.current.isCompleting).toBe(false);
    });
  });

  describe("Validation", () => {
    it("should not proceed without address", async () => {
      mockUseAccount.mockReturnValue({ chain: { id: 1 }, address: undefined });

      const { result } = renderHook(() => useGrantCompletion({}));

      await act(async () => {
        await result.current.completeGrant(mockGrant, mockProject);
      });

      expect(mockShowError).toHaveBeenCalledWith("Please connect your wallet");
      expect(mockSetupChainAndWallet).not.toHaveBeenCalled();
    });

    it("should not proceed without project", async () => {
      const { result } = renderHook(() => useGrantCompletion({}));

      await act(async () => {
        await result.current.completeGrant(mockGrant, null as any);
      });

      expect(mockShowError).toHaveBeenCalledWith("Please connect your wallet");
      expect(mockSetupChainAndWallet).not.toHaveBeenCalled();
    });

    it("should not proceed without grant", async () => {
      const { result } = renderHook(() => useGrantCompletion({}));

      await act(async () => {
        await result.current.completeGrant(null as any, mockProject);
      });

      expect(mockShowError).toHaveBeenCalledWith("Please connect your wallet");
      expect(mockSetupChainAndWallet).not.toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should handle user rejection (code 4001)", async () => {
      mockSetupChainAndWallet.mockResolvedValue({
        gapClient: mockGapClient,
        walletSigner: mockWalletSigner,
        chainId: 42161,
      });

      mockFetchGrantInstance.mockResolvedValue(mockGrantInstance);

      const userRejectionError = new Error("User rejected");
      (userRejectionError as any).code = 4001;
      mockGrantInstance.complete.mockRejectedValue(userRejectionError);

      const { result } = renderHook(() => useGrantCompletion({}));

      await act(async () => {
        await result.current.completeGrant(mockGrant, mockProject);
      });

      expect(mockShowError).toHaveBeenCalledWith("Grant completion cancelled");
      expect(result.current.isCompleting).toBe(false);
    });

    it("should handle user rejection (message contains 'User rejected')", async () => {
      mockSetupChainAndWallet.mockResolvedValue({
        gapClient: mockGapClient,
        walletSigner: mockWalletSigner,
        chainId: 42161,
      });

      mockFetchGrantInstance.mockResolvedValue(mockGrantInstance);

      mockGrantInstance.complete.mockRejectedValue(new Error("User rejected the request"));

      const { result } = renderHook(() => useGrantCompletion({}));

      await act(async () => {
        await result.current.completeGrant(mockGrant, mockProject);
      });

      expect(mockShowError).toHaveBeenCalledWith("Grant completion cancelled");
    });

    it("should handle general errors", async () => {
      mockSetupChainAndWallet.mockResolvedValue({
        gapClient: mockGapClient,
        walletSigner: mockWalletSigner,
        chainId: 42161,
      });

      mockFetchGrantInstance.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useGrantCompletion({}));

      await act(async () => {
        await result.current.completeGrant(mockGrant, mockProject);
      });

      expect(mockShowError).toHaveBeenCalledWith("There was an error doing the grant completion.");
      expect(result.current.isCompleting).toBe(false);
    });
  });

  describe("State Management", () => {
    it("should set isCompleting to true during operation", async () => {
      let resolveSetup: any;
      const setupPromise = new Promise((resolve) => {
        resolveSetup = resolve;
      });

      mockSetupChainAndWallet.mockReturnValue(setupPromise as any);

      const { result } = renderHook(() => useGrantCompletion({}));

      let completionPromise: Promise<void>;
      act(() => {
        completionPromise = result.current.completeGrant(mockGrant, mockProject);
      });

      // isCompleting should be true during operation
      expect(result.current.isCompleting).toBe(true);

      // Resolve the setup
      await act(async () => {
        resolveSetup(null);
        await completionPromise!;
      });

      // isCompleting should be false after completion
      expect(result.current.isCompleting).toBe(false);
    });
  });

  describe("Transaction Hash Handling", () => {
    it("should handle missing transaction hash", async () => {
      mockSetupChainAndWallet.mockResolvedValue({
        gapClient: mockGapClient,
        walletSigner: mockWalletSigner,
        chainId: 42161,
      });

      mockFetchGrantInstance.mockResolvedValue(mockGrantInstance);

      mockGrantInstance.complete.mockResolvedValue({
        tx: [],
      });

      mockNotifyIndexerForGrant.mockResolvedValue(undefined);
      mockPollForGrantCompletion.mockResolvedValue(undefined);

      const { result } = renderHook(() => useGrantCompletion({}));

      await act(async () => {
        await result.current.completeGrant(mockGrant, mockProject);
      });

      expect(mockNotifyIndexerForGrant).toHaveBeenCalledWith(undefined, 42161, "project-456");
    });

    it("should handle null transaction hash", async () => {
      mockSetupChainAndWallet.mockResolvedValue({
        gapClient: mockGapClient,
        walletSigner: mockWalletSigner,
        chainId: 42161,
      });

      mockFetchGrantInstance.mockResolvedValue(mockGrantInstance);

      mockGrantInstance.complete.mockResolvedValue({
        tx: [{ hash: null }],
      });

      mockNotifyIndexerForGrant.mockResolvedValue(undefined);
      mockPollForGrantCompletion.mockResolvedValue(undefined);

      const { result } = renderHook(() => useGrantCompletion({}));

      await act(async () => {
        await result.current.completeGrant(mockGrant, mockProject);
      });

      expect(mockNotifyIndexerForGrant).toHaveBeenCalledWith(undefined, 42161, "project-456");
    });
  });
});
