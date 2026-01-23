/**
 * @file Tests for useGrantCompletion hook
 * @description Tests grant completion workflow with utilities
 */

import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import * as attestationPollingModule from "@/utilities/attestation-polling";
// Import modules for spyOn
import * as grantHelpersModule from "@/utilities/grant-helpers";
import * as indexerNotificationModule from "@/utilities/indexer-notification";
import * as sanitizeModule from "@/utilities/sanitize";

// Mock ALL dependencies to avoid ESM import issues
const mockSetupChainAndWallet = jest.fn();
// NOTE: Toast mock removed - using global mock from bun-setup.ts
const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();

// Spies for modules - will be set up in beforeEach
let mockFetchGrantInstance: ReturnType<typeof spyOn>;
let mockNotifyIndexerForGrant: ReturnType<typeof spyOn>;
let mockPollForGrantCompletion: ReturnType<typeof spyOn>;
let mockSanitizeObject: ReturnType<typeof spyOn>;

// NOTE: grant-helpers, attestation-polling, sanitize, and indexer-notification
// are NOT mocked via jest.mock() to avoid polluting other test files.
// Instead, we use spyOn in beforeEach/afterEach.

// NOTE: react-hot-toast mock is provided globally via bun-setup.ts
// Access it via getMocks().toast in beforeEach to avoid polluting global mock state
const getMocks = () => (globalThis as any).__mocks__;

// NOTE: errorManager mock is provided globally via bun-setup.ts
// Do NOT use jest.mock() here as it pollutes global mock state

// Access wagmi mock state via globalThis.__wagmiMockState__
// NOTE: Do NOT use jest.mock("wagmi", ...) as it pollutes global mock state
const getWagmiState = () => (globalThis as any).__wagmiMockState__;

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

import { act, renderHook } from "@testing-library/react";

// Import the hook to test AFTER mocking dependencies
const { useGrantCompletion } = require("@/hooks/useGrantCompletion");

describe("useGrantCompletion", () => {
  let wagmiState: any;
  let mockToast: any;

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

    // Get wagmi state and toast mock from global mocks
    wagmiState = getWagmiState();
    const mocks = getMocks();
    mockToast = mocks.toast;

    // Configure wagmi mock state
    wagmiState.account = {
      address: "0x123",
      isConnected: true,
      connector: null,
      chain: { id: 1 },
    };
    wagmiState.chainId = 1;

    // Set up spies for utility modules
    mockFetchGrantInstance = spyOn(grantHelpersModule, "getSDKGrantInstance").mockImplementation(
      () => Promise.resolve({} as any)
    );

    mockNotifyIndexerForGrant = spyOn(
      indexerNotificationModule,
      "notifyIndexerForGrant"
    ).mockImplementation(() => Promise.resolve(undefined));

    mockPollForGrantCompletion = spyOn(
      attestationPollingModule,
      "pollForGrantCompletion"
    ).mockImplementation(() => Promise.resolve(undefined));

    mockSanitizeObject = spyOn(sanitizeModule, "sanitizeObject").mockImplementation((obj) => obj);

    // Clear mock call history
    if (mockToast?.mockClear) mockToast.mockClear();
    if (mockToast?.success?.mockClear) mockToast.success.mockClear();
    if (mockToast?.error?.mockClear) mockToast.error.mockClear();
  });

  afterEach(() => {
    // Restore all spies
    mockFetchGrantInstance?.mockRestore();
    mockNotifyIndexerForGrant?.mockRestore();
    mockPollForGrantCompletion?.mockRestore();
    mockSanitizeObject?.mockRestore();
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
      // Configure wagmi state with no address
      wagmiState.account = {
        address: undefined,
        isConnected: false,
        connector: null,
        chain: { id: 1 },
      };

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
