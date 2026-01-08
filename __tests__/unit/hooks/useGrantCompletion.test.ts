/**
 * @file Tests for useGrantCompletion hook
 * @description Tests grant completion workflow with utilities
 */

// Mock ALL dependencies to avoid ESM import issues
const mockSetupChainAndWallet = jest.fn();
const mockFetchGrantInstance = jest.fn();
const mockNotifyIndexerForGrant = jest.fn();
const mockPollForGrantCompletion = jest.fn();
const mockToastSuccess = jest.fn();
const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();

jest.mock("@/utilities/grant-helpers", () => ({
  getSDKGrantInstance: mockFetchGrantInstance,
}));

jest.mock("@/utilities/indexer-notification", () => ({
  notifyIndexerForGrant: mockNotifyIndexerForGrant,
}));

jest.mock("@/utilities/attestation-polling", () => ({
  pollForGrantCompletion: mockPollForGrantCompletion,
}));

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: mockToastSuccess,
    error: mockShowError,
  },
}));

jest.mock("@/components/Utilities/errorManager", () => ({
  errorManager: jest.fn(),
}));

const mockUseAccount = jest.fn();
const mockUseChainId = jest.fn(() => 1);
jest.mock("wagmi", () => ({
  useAccount: mockUseAccount,
  useChainId: mockUseChainId,
}));

jest.mock("@/hooks/useWallet", () => ({
  useWallet: jest.fn(() => ({ switchChainAsync: jest.fn() })),
}));

jest.mock("@/hooks/useAttestationToast", () => ({
  useAttestationToast: jest.fn(() => ({
    startAttestation: jest.fn(),
    changeStepperStep: jest.fn(),
    setIsStepper: jest.fn(),
    showLoading: jest.fn(),
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    updateStep: jest.fn(),
    dismiss: jest.fn(),
  })),
}));

jest.mock("@/hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: jest.fn(() => ({
    setupChainAndWallet: mockSetupChainAndWallet,
    isSmartWalletReady: false,
    smartWalletAddress: null,
    hasEmbeddedWallet: false,
    hasExternalWallet: true,
  })),
}));

jest.mock("@/utilities/sanitize", () => ({
  sanitizeObject: jest.fn((obj) => obj),
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

  const mockGapClient = { fetch: { projectById: jest.fn() } } as any;
  const mockWalletSigner = { getAddress: jest.fn() } as any;
  const mockGrantInstance = {
    complete: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset useAccount mock to default values
    mockUseAccount.mockReturnValue({ chain: { id: 1 }, address: "0x123" });
  });

  describe("Initialization", () => {
    it("should initialize with isCompleting false", () => {
      const { result } = renderHook(() => useGrantCompletion({}));

      expect(result.current.isCompleting).toBe(false);
      expect(typeof result.current.completeGrant).toBe("function");
    });

    it("should accept onComplete callback", () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() => useGrantCompletion({ onComplete }));

      expect(typeof result.current.completeGrant).toBe("function");
    });
  });

  describe("Successful Grant Completion", () => {
    it("should complete grant successfully", async () => {
      const onComplete = jest.fn();

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
      mockSetupChainAndWallet.mockResolvedValue(null);

      const { result } = renderHook(() => useGrantCompletion({}));

      await act(async () => {
        await result.current.completeGrant(mockGrant, mockProject);
      });

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
