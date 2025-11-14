/**
 * @file Tests for useGrantCompletion hook
 * @description Tests grant completion workflow with utilities
 */

// Mock ALL dependencies BEFORE importing anything else
jest.mock("@/utilities/chain-wallet-setup");
jest.mock("@/utilities/grant-helpers");
jest.mock("@/utilities/indexer-notification");
jest.mock("@/utilities/attestation-polling");
jest.mock("react-hot-toast");
jest.mock("@/components/Utilities/errorManager");
jest.mock("wagmi", () => ({
  useAccount: jest.fn(() => ({ chain: { id: 1 }, address: "0x123" })),
}));
jest.mock("@/hooks/useWallet", () => ({
  useWallet: jest.fn(() => ({ switchChainAsync: jest.fn() })),
}));
jest.mock("@/store/modals/txStepper", () => ({
  useStepper: jest.fn(() => ({
    changeStepperStep: jest.fn(),
    setIsStepper: jest.fn(),
  })),
}));
jest.mock("@/utilities/sanitize", () => ({
  sanitizeObject: jest.fn((obj) => obj),
}));

import { renderHook, act } from "@testing-library/react";
import { useGrantCompletion } from "@/hooks/useGrantCompletion";
import * as chainWalletSetupModule from "@/utilities/chain-wallet-setup";
import * as grantHelpersModule from "@/utilities/grant-helpers";
import * as indexerNotificationModule from "@/utilities/indexer-notification";
import * as attestationPollingModule from "@/utilities/attestation-polling";
import toast from "react-hot-toast";
import * as errorManagerModule from "@/components/Utilities/errorManager";

const mockSetupChainAndWallet = chainWalletSetupModule.setupChainAndWallet as jest.MockedFunction<
  typeof chainWalletSetupModule.setupChainAndWallet
>;
const mockFetchGrantInstance = grantHelpersModule.fetchGrantInstance as jest.MockedFunction<
  typeof grantHelpersModule.fetchGrantInstance
>;
const mockNotifyIndexerForGrant = indexerNotificationModule.notifyIndexerForGrant as jest.MockedFunction<
  typeof indexerNotificationModule.notifyIndexerForGrant
>;
const mockPollForGrantCompletion = attestationPollingModule.pollForGrantCompletion as jest.MockedFunction<
  typeof attestationPollingModule.pollForGrantCompletion
>;
const mockToast = toast as jest.Mocked<typeof toast>;

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

      expect(mockNotifyIndexerForGrant).toHaveBeenCalledWith(
        "0xabc123",
        42161,
        "project-456"
      );

      expect(mockPollForGrantCompletion).toHaveBeenCalledWith({
        gapClient: mockGapClient,
        projectUid: "project-456",
        grantUid: "grant-123",
      });

      expect(mockToast.success).toHaveBeenCalled();
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

      expect(mockToast.success).toHaveBeenCalled();
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

      expect(mockToast.error).toHaveBeenCalledWith(
        "Please switch to the correct network and try again"
      );
      expect(mockFetchGrantInstance).not.toHaveBeenCalled();
      expect(result.current.isCompleting).toBe(false);
    });
  });

  describe("Validation", () => {
    it("should not proceed without address", async () => {
      const useAccount = require("wagmi").useAccount;
      useAccount.mockReturnValue({ chain: { id: 1 }, address: undefined });

      const { result } = renderHook(() => useGrantCompletion({}));

      await act(async () => {
        await result.current.completeGrant(mockGrant, mockProject);
      });

      expect(mockToast.error).toHaveBeenCalledWith("Please connect your wallet");
      expect(mockSetupChainAndWallet).not.toHaveBeenCalled();
    });

    it("should not proceed without project", async () => {
      const { result } = renderHook(() => useGrantCompletion({}));

      await act(async () => {
        await result.current.completeGrant(mockGrant, null as any);
      });

      expect(mockToast.error).toHaveBeenCalledWith("Please connect your wallet");
      expect(mockSetupChainAndWallet).not.toHaveBeenCalled();
    });

    it("should not proceed without grant", async () => {
      const { result } = renderHook(() => useGrantCompletion({}));

      await act(async () => {
        await result.current.completeGrant(null as any, mockProject);
      });

      expect(mockToast.error).toHaveBeenCalledWith("Please connect your wallet");
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

      expect(mockToast.error).toHaveBeenCalledWith("Grant completion cancelled");
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

      expect(mockToast.error).toHaveBeenCalledWith("Grant completion cancelled");
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

      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining("Error")
      );
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

      expect(mockNotifyIndexerForGrant).toHaveBeenCalledWith(
        undefined,
        42161,
        "project-456"
      );
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

      expect(mockNotifyIndexerForGrant).toHaveBeenCalledWith(
        undefined,
        42161,
        "project-456"
      );
    });
  });
});
