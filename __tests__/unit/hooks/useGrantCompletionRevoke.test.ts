/**
 * @file Tests for useGrantCompletionRevoke hook
 * @description Tests grant completion revocation workflow with dual paths (on-chain and off-chain)
 */

// Hoist all mock variables for use in vi.mock factories
const {
  mockEnsureCorrectChain,
  mockSafeGetWalletClient,
  mockWalletClientToSigner,
  mockFetchData,
  mockPerformOffChainRevoke,
  mockCreateCheckIfCompletionExists,
  mockValidateGrantCompletion,
  mockBuildRevocationPayload,
  mockGetMulticall,
  mockToastSuccess,
  mockToastError,
  mockErrorManager,
  mockShowError,
  mockShowSuccess,
  mockUseAccount,
  mockUseChainId,
  mockSwitchChainAsync,
  mockGap,
  mockSetupChainAndWallet,
  mockChangeStepperStep,
  mockSetIsStepper,
  mockDismiss,
  mockStartAttestation,
  mockRefetchGrants,
  mockRefreshGrant,
} = vi.hoisted(() => ({
  mockEnsureCorrectChain: vi.fn(),
  mockSafeGetWalletClient: vi.fn(),
  mockWalletClientToSigner: vi.fn(),
  mockFetchData: vi.fn(),
  mockPerformOffChainRevoke: vi.fn(),
  mockCreateCheckIfCompletionExists: vi.fn(),
  mockValidateGrantCompletion: vi.fn(),
  mockBuildRevocationPayload: vi.fn(),
  mockGetMulticall: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockErrorManager: vi.fn(),
  mockShowError: vi.fn(),
  mockShowSuccess: vi.fn(),
  mockUseAccount: vi.fn(),
  mockUseChainId: vi.fn(() => 1),
  mockSwitchChainAsync: vi.fn(),
  mockGap: { fetch: { projectById: vi.fn() } },
  mockSetupChainAndWallet: vi.fn(),
  mockChangeStepperStep: vi.fn(),
  mockSetIsStepper: vi.fn(),
  mockDismiss: vi.fn(),
  mockStartAttestation: vi.fn(),
  mockRefetchGrants: vi.fn(),
  mockRefreshGrant: vi.fn(),
}));

// Create a mock toast function that can be called directly
const createMockToastDefault = () => {
  const fn = vi.fn() as vi.Mock & {
    success: vi.Mock;
    error: vi.Mock;
    loading: vi.Mock;
    dismiss: vi.Mock;
  };
  fn.success = mockToastSuccess;
  fn.error = mockToastError;
  fn.loading = vi.fn();
  fn.dismiss = vi.fn();
  return fn;
};

// Mock gasless utilities to avoid ESM parsing issues with @account-kit/infra
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

// Mock useZeroDevSigner to avoid gasless import chain
vi.mock("@/hooks/useZeroDevSigner", () => ({
  useZeroDevSigner: vi.fn(() => ({
    getSignerForChain: vi.fn().mockResolvedValue(null),
    isLoading: false,
    error: null,
  })),
}));

vi.mock("@/utilities/ensureCorrectChain", () => ({
  ensureCorrectChain: mockEnsureCorrectChain,
}));

vi.mock("@/utilities/wallet-helpers", () => ({
  safeGetWalletClient: mockSafeGetWalletClient,
}));

vi.mock("@/utilities/eas-wagmi-utils", () => ({
  walletClientToSigner: mockWalletClientToSigner,
}));

vi.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: mockFetchData,
}));

vi.mock("@/hooks/useOffChainRevoke", () => ({
  useOffChainRevoke: vi.fn(() => ({
    performOffChainRevoke: mockPerformOffChainRevoke,
  })),
}));

vi.mock("@/utilities/grantCompletionHelpers", () => ({
  createCheckIfCompletionExists: mockCreateCheckIfCompletionExists,
  validateGrantCompletion: mockValidateGrantCompletion,
  buildRevocationPayload: mockBuildRevocationPayload,
}));

vi.mock("@show-karma/karma-gap-sdk", () => ({
  GAP: {
    getMulticall: mockGetMulticall,
  },
}));

vi.mock("react-hot-toast", () => {
  const fn = vi.fn();
  (fn as Record<string, unknown>).success = mockToastSuccess;
  (fn as Record<string, unknown>).error = mockToastError;
  (fn as Record<string, unknown>).loading = vi.fn();
  (fn as Record<string, unknown>).dismiss = vi.fn();
  return {
    __esModule: true,
    default: fn,
  };
});

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: mockErrorManager,
}));

vi.mock("wagmi", () => ({
  useAccount: mockUseAccount,
  useChainId: mockUseChainId,
}));

vi.mock("@/hooks/useWallet", () => ({
  useWallet: vi.fn(() => ({ switchChainAsync: mockSwitchChainAsync })),
}));

vi.mock("@/hooks/useGap", () => ({
  useGap: vi.fn(() => ({ gap: mockGap })),
}));

vi.mock("@/hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: vi.fn(() => ({
    setupChainAndWallet: mockSetupChainAndWallet,
    isSmartWalletReady: false,
    smartWalletAddress: null,
    hasEmbeddedWallet: false,
    hasExternalWallet: true,
  })),
}));

vi.mock("@/hooks/useAttestationToast", () => ({
  useAttestationToast: vi.fn(() => ({
    startAttestation: mockStartAttestation,
    changeStepperStep: mockChangeStepperStep,
    setIsStepper: mockSetIsStepper,
    showLoading: vi.fn(),
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    updateStep: vi.fn(),
    dismiss: mockDismiss,
  })),
}));

// Define mock state inside the factory - it will be accessible via require("@/store").__mockState
vi.mock("@/store", () => {
  // This state object is created when the mock is set up and persists across tests
  const state = { isProjectOwner: false, isOwner: false };
  return {
    // Expose state for tests to modify
    __mockState: state,
    useProjectStore: vi.fn((selector?: any) => {
      const storeState = { isProjectOwner: state.isProjectOwner };
      if (!selector) return storeState;
      if (typeof selector === "function") return selector(storeState);
      return storeState;
    }),
    useOwnerStore: vi.fn((selector?: any) => {
      const storeState = { isOwner: state.isOwner };
      if (!selector) return storeState;
      if (typeof selector === "function") return selector(storeState);
      return storeState;
    }),
  };
});

vi.mock("@/hooks/v2/useProjectGrants", () => ({
  useProjectGrants: vi.fn(() => ({
    refetch: mockRefetchGrants,
    grants: [],
  })),
}));

vi.mock("@/store/grant", () => ({
  useGrantStore: vi.fn(() => ({ refreshGrant: mockRefreshGrant })),
}));

import { act, renderHook } from "@testing-library/react";
// Get the mocked toast function
import toast from "react-hot-toast";

// Import the hook to test AFTER mocking dependencies
import { useGrantCompletionRevoke } from "@/hooks/useGrantCompletionRevoke";
import { MESSAGES } from "@/utilities/messages";

const mockToastFn = (global as Record<string, unknown>).__mockToastFn || toast;

// Get reference to mock store state for modifying in tests
import * as storeModule from "@/store";

const mockStoreState = (storeModule as Record<string, unknown>).__mockState;

describe("useGrantCompletionRevoke", () => {
  const mockGrant = {
    uid: "grant-123",
    chainID: 42161,
    completed: {
      uid: "0xcompletion123",
      chainID: 42161,
      schema: {
        uid: "0xschema123",
        revocable: true,
        multiRevoke: vi.fn(),
      },
      revoked: false,
    },
  } as any;

  const mockProject = {
    uid: "project-456",
  } as any;

  const mockGapClient = {
    fetch: {
      projectById: vi.fn(),
    },
  } as any;

  const mockWalletClient = {} as any;
  const mockWalletSigner = {} as any;

  const mockGrantInstance = {
    uid: "grant-123",
    chainID: 42161,
    completed: {
      uid: "0xcompletion123",
      schema: {
        uid: "0xschema123",
        revocable: true,
        multiRevoke: vi.fn(),
      },
      revoked: false,
    },
  } as any;

  const mockInstanceProject = {
    grants: [mockGrantInstance],
  } as any;

  const mockMulticallContract = {
    multiRevoke: vi.fn(),
  } as any;

  const mockTransaction = {
    wait: vi.fn(),
  } as any;

  const mockCheckIfCompletionExists = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAccount.mockReturnValue({ chain: { id: 42161 } });
    mockStoreState.isProjectOwner = false;
    mockStoreState.isOwner = false;
    mockCreateCheckIfCompletionExists.mockReturnValue(mockCheckIfCompletionExists);
    mockCheckIfCompletionExists.mockResolvedValue(undefined);
    mockRefetchGrants.mockResolvedValue(undefined);
  });

  describe("Initialization", () => {
    it("should initialize with isRevoking false", () => {
      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      expect(result.current.isRevoking).toBe(false);
      expect(typeof result.current.revokeCompletion).toBe("function");
    });
  });

  describe("Early Returns", () => {
    it("should return early if grant.completed is falsy", async () => {
      const grantWithoutCompletion = { ...mockGrant, completed: null };
      const { result } = renderHook(() =>
        useGrantCompletionRevoke({
          grant: grantWithoutCompletion,
          project: mockProject,
        })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      expect(mockChangeStepperStep).not.toHaveBeenCalled();
      expect(result.current.isRevoking).toBe(false);
    });

    it("should return early if project is falsy", async () => {
      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: null as any })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      expect(mockChangeStepperStep).not.toHaveBeenCalled();
      expect(result.current.isRevoking).toBe(false);
    });
  });

  describe("Validation Errors", () => {
    it("should throw error when chainID is missing", async () => {
      const grantWithoutChainID = {
        ...mockGrant,
        completed: { ...mockGrant.completed, chainID: undefined },
        chainID: undefined,
      };
      const { result } = renderHook(() =>
        useGrantCompletionRevoke({
          grant: grantWithoutChainID,
          project: mockProject,
        })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining("Chain ID not found"));
      expect(mockErrorManager).toHaveBeenCalled();
    });

    it("should throw error when completion UID is missing", async () => {
      const grantWithoutUID = {
        ...mockGrant,
        completed: { ...mockGrant.completed, uid: undefined },
      };
      const { result } = renderHook(() =>
        useGrantCompletionRevoke({
          grant: grantWithoutUID,
          project: mockProject,
        })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      expect(mockShowError).toHaveBeenCalledWith("Grant completion UID not found");
      expect(mockErrorManager).toHaveBeenCalled();
    });

    it("should use grant.chainID for chain switching", async () => {
      const grantWithChainID = {
        ...mockGrant,
        chainID: 42161,
      };
      mockStoreState.isProjectOwner = true;
      mockSetupChainAndWallet.mockResolvedValue({
        gapClient: mockGapClient,
        walletSigner: mockWalletSigner,
        chainId: 42161,
        isGasless: false,
      });
      mockGapClient.fetch.projectById.mockResolvedValue(mockInstanceProject);
      mockBuildRevocationPayload.mockReturnValue([{ schema: "0xschema123", data: [] }]);
      mockGetMulticall.mockResolvedValue(mockMulticallContract);
      mockMulticallContract.multiRevoke.mockResolvedValue(mockTransaction);
      mockTransaction.wait.mockResolvedValue({
        transactionHash: "0xtxhash123",
      });

      const { result } = renderHook(() =>
        useGrantCompletionRevoke({
          grant: grantWithChainID,
          project: mockProject,
        })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      // Verify setupChainAndWallet is called with grant.chainID
      expect(mockSetupChainAndWallet).toHaveBeenCalledWith({
        targetChainId: 42161,
        currentChainId: 42161,
        switchChainAsync: mockSwitchChainAsync,
      });
    });
  });

  describe("Off-chain Direct Path (Unauthorized Users)", () => {
    beforeEach(() => {
      mockStoreState.isProjectOwner = false;
      mockStoreState.isOwner = false;
    });

    it("should use off-chain revocation when not authorized", async () => {
      mockPerformOffChainRevoke.mockResolvedValue(true);

      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      // Off-chain path goes directly to performOffChainRevoke without chain setup
      expect(mockPerformOffChainRevoke).toHaveBeenCalledWith({
        uid: "0xcompletion123",
        chainID: 42161,
        checkIfExists: mockCheckIfCompletionExists,
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
        toastMessages: {
          success: MESSAGES.GRANT.MARK_AS_COMPLETE.UNDO.SUCCESS,
          loading: MESSAGES.GRANT.MARK_AS_COMPLETE.UNDO.LOADING,
        },
      });
      expect(mockRefreshGrant).toHaveBeenCalled();
      // Chain setup should NOT be called for off-chain path
      expect(mockSetupChainAndWallet).not.toHaveBeenCalled();
    });

    it("should handle off-chain revocation success callback", async () => {
      let onSuccessCallback: (() => void) | undefined;
      mockPerformOffChainRevoke.mockImplementation((options: any) => {
        onSuccessCallback = options.onSuccess;
        return Promise.resolve(true);
      });

      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      await act(async () => {
        onSuccessCallback?.();
      });

      expect(mockChangeStepperStep).toHaveBeenCalledWith("indexed");
      expect(mockDismiss).toHaveBeenCalled();
    });

    it("should handle off-chain revocation error callback", async () => {
      // Suppress expected console.error from error callback
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const mockError = new Error("Off-chain error");
      let onErrorCallback: ((error: any) => void) | undefined;
      mockPerformOffChainRevoke.mockImplementation((options: any) => {
        onErrorCallback = options.onError;
        return Promise.resolve(false);
      });

      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      await act(async () => {
        onErrorCallback?.(mockError);
      });

      expect(mockDismiss).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith("Off-chain revocation failed:", mockError);

      // Restore console.error
      consoleSpy.mockRestore();
    });
  });

  describe("On-chain Revocation Success Path", () => {
    beforeEach(() => {
      mockStoreState.isProjectOwner = true;
      // Mock the new setupChainAndWallet hook
      mockSetupChainAndWallet.mockResolvedValue({
        gapClient: mockGapClient,
        walletSigner: mockWalletSigner,
        chainId: 42161,
        isGasless: false,
      });
      // Keep old mocks for backward compatibility in case they're still checked
      mockEnsureCorrectChain.mockResolvedValue({
        success: true,
        chainId: 42161,
        gapClient: mockGapClient,
      });
      mockSafeGetWalletClient.mockResolvedValue({
        walletClient: mockWalletClient,
        error: null,
      });
      mockWalletClientToSigner.mockResolvedValue(mockWalletSigner);
      mockGapClient.fetch.projectById.mockResolvedValue(mockInstanceProject);
      mockBuildRevocationPayload.mockReturnValue([
        { schema: "0xschema123", data: [{ uid: "0xcompletion123", value: 0n }] },
      ]);
      mockGetMulticall.mockResolvedValue(mockMulticallContract);
      mockMulticallContract.multiRevoke.mockResolvedValue(mockTransaction);
      mockTransaction.wait.mockResolvedValue({
        transactionHash: "0xtxhash123",
      });
    });

    it("should complete on-chain revocation successfully", async () => {
      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      // Hook uses setupChainAndWallet which encapsulates chain and wallet setup
      expect(mockSetupChainAndWallet).toHaveBeenCalledWith({
        targetChainId: 42161,
        currentChainId: 42161,
        switchChainAsync: mockSwitchChainAsync,
      });
      expect(mockGapClient.fetch.projectById).toHaveBeenCalledWith("project-456");
      expect(mockValidateGrantCompletion).toHaveBeenCalledWith(mockGrantInstance.completed);
      expect(mockBuildRevocationPayload).toHaveBeenCalledWith("0xschema123", "0xcompletion123");
      expect(mockGetMulticall).toHaveBeenCalledWith(mockWalletSigner);
      expect(mockMulticallContract.multiRevoke).toHaveBeenCalledWith([
        { schema: "0xschema123", data: [{ uid: "0xcompletion123", value: 0n }] },
      ]);
      expect(mockChangeStepperStep).toHaveBeenCalledWith("confirmed");
      expect(mockFetchData).toHaveBeenCalled();
      expect(mockChangeStepperStep).toHaveBeenCalledWith("indexing");
      expect(mockCheckIfCompletionExists).toHaveBeenCalled();
      expect(mockRefreshGrant).toHaveBeenCalled();
      expect(mockShowSuccess).toHaveBeenCalledWith(MESSAGES.GRANT.MARK_AS_COMPLETE.UNDO.SUCCESS);
      expect(result.current.isRevoking).toBe(false);
    });

    it("should handle transaction hash correctly", async () => {
      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      expect(mockFetchData).toHaveBeenCalledWith(
        expect.stringContaining("0xtxhash123"),
        "POST",
        {}
      );
    });

    it("should handle missing transaction hash", async () => {
      mockTransaction.wait.mockResolvedValue({
        transactionHash: null,
      });

      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      expect(mockFetchData).not.toHaveBeenCalled();
      expect(mockChangeStepperStep).toHaveBeenCalledWith("indexing");
    });

    it("should call checkIfCompletionExists callback", async () => {
      let callbackFn: (() => void) | undefined;
      mockCheckIfCompletionExists.mockImplementation((cb?: () => void) => {
        callbackFn = cb;
        return Promise.resolve();
      });

      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      await act(async () => {
        callbackFn?.();
      });

      expect(mockChangeStepperStep).toHaveBeenCalledWith("indexed");
    });
  });

  describe("On-chain Chain Setup Failures", () => {
    beforeEach(() => {
      mockStoreState.isProjectOwner = true;
    });

    it("should handle chain setup failure", async () => {
      // Mock setupChainAndWallet returning null (chain setup failed)
      mockSetupChainAndWallet.mockResolvedValue(null);

      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      // When setupChainAndWallet fails, it returns null and the hook returns early
      expect(mockSetupChainAndWallet).toHaveBeenCalled();
      expect(result.current.isRevoking).toBe(false);
    });
  });

  describe("On-chain Wallet Connection Failures", () => {
    beforeEach(() => {
      mockStoreState.isProjectOwner = true;
    });

    it("should handle wallet connection failure via setupChainAndWallet", async () => {
      // setupChainAndWallet returns null when wallet connection fails
      mockSetupChainAndWallet.mockResolvedValue(null);

      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      // When setupChainAndWallet returns null, the hook returns early
      expect(mockSetupChainAndWallet).toHaveBeenCalled();
      expect(result.current.isRevoking).toBe(false);
    });

    it("should handle missing gapClient via setupChainAndWallet", async () => {
      // setupChainAndWallet returns null when gapClient is not available
      mockSetupChainAndWallet.mockResolvedValue(null);

      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      // When setupChainAndWallet returns null, the hook returns early
      expect(mockSetupChainAndWallet).toHaveBeenCalled();
      expect(result.current.isRevoking).toBe(false);
    });
  });

  describe("On-chain Grant Instance Not Found", () => {
    beforeEach(() => {
      mockStoreState.isProjectOwner = true;
      mockSetupChainAndWallet.mockResolvedValue({
        gapClient: mockGapClient,
        walletSigner: mockWalletSigner,
        chainId: 42161,
        isGasless: false,
      });
    });

    it("should handle grant instance not found", async () => {
      mockGapClient.fetch.projectById.mockResolvedValue({
        grants: [],
      });

      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      expect(mockShowError).toHaveBeenCalledWith("Grant completion not found");
      expect(mockErrorManager).toHaveBeenCalled();
    });

    it("should handle grant instance without completion", async () => {
      const grantWithoutCompletion = {
        ...mockGrantInstance,
        completed: null,
      };
      mockGapClient.fetch.projectById.mockResolvedValue({
        grants: [grantWithoutCompletion],
      });

      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      expect(mockShowError).toHaveBeenCalledWith("Grant completion not found");
    });
  });

  describe("On-chain Schema Validation Failures", () => {
    beforeEach(() => {
      mockStoreState.isProjectOwner = true;
      mockSetupChainAndWallet.mockResolvedValue({
        gapClient: mockGapClient,
        walletSigner: mockWalletSigner,
        chainId: 42161,
        isGasless: false,
      });
      mockGapClient.fetch.projectById.mockResolvedValue(mockInstanceProject);
    });

    it("should handle missing schema", async () => {
      const grantInstanceWithoutSchema = {
        ...mockGrantInstance,
        completed: { ...mockGrantInstance.completed, schema: null },
      };
      mockGapClient.fetch.projectById.mockResolvedValue({
        grants: [grantInstanceWithoutSchema],
      });

      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      expect(mockShowError).toHaveBeenCalledWith("Grant completion schema not found");
    });

    it("should handle schema without multiRevoke", async () => {
      const grantInstanceWithoutMultiRevoke = {
        ...mockGrantInstance,
        completed: {
          ...mockGrantInstance.completed,
          schema: {
            ...mockGrantInstance.completed.schema,
            multiRevoke: undefined,
          },
        },
      };
      mockGapClient.fetch.projectById.mockResolvedValue({
        grants: [grantInstanceWithoutMultiRevoke],
      });

      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      expect(mockShowError).toHaveBeenCalledWith(
        "Grant completion schema does not support multiRevoke"
      );
    });
  });

  describe("Off-chain Fallback When On-chain Fails", () => {
    beforeEach(() => {
      mockStoreState.isProjectOwner = true;
      mockSetupChainAndWallet.mockResolvedValue({
        gapClient: mockGapClient,
        walletSigner: mockWalletSigner,
        chainId: 42161,
        isGasless: false,
      });
      mockGapClient.fetch.projectById.mockResolvedValue(mockInstanceProject);
      mockBuildRevocationPayload.mockReturnValue([{ schema: "0xschema123", data: [] }]);
      mockGetMulticall.mockResolvedValue(mockMulticallContract);
    });

    it("should fallback to off-chain when on-chain fails", async () => {
      const onChainError = new Error("On-chain error");
      mockMulticallContract.multiRevoke.mockRejectedValue(onChainError);
      mockPerformOffChainRevoke.mockResolvedValue(true);

      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      expect(mockDismiss).toHaveBeenCalled();
      /**
       * Note: Indirect toast() assertion
       *
       * The toast() call at line 190 of useGrantCompletionRevoke.ts is not directly verified here
       * due to Jest mock setup timing issues. The toast mock is created in vi.mock() before the
       * hook is imported, which can cause the mock reference to not be properly captured.
       *
       * Instead, we verify the toast call indirectly by:
       * 1. Confirming that performOffChainRevoke is called (which only happens after the toast call)
       * 2. Verifying the fallback path execution through mockPerformOffChainRevoke being called
       * 3. Checking that mockDismiss() was called (which happens when falling back)
       *
       * The actual toast call is: toast("On-chain revocation unavailable. Attempting off-chain revocation...")
       * See: hooks/useGrantCompletionRevoke.ts:190
       *
       * For direct toast verification, see integration tests in:
       * __tests__/integration/features/grant-completion-revocation-flow.test.tsx
       */
      expect(mockPerformOffChainRevoke).toHaveBeenCalledWith({
        uid: "0xcompletion123",
        chainID: 42161,
        checkIfExists: mockCheckIfCompletionExists,
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
        toastMessages: {
          success: MESSAGES.GRANT.MARK_AS_COMPLETE.UNDO.SUCCESS,
          loading: MESSAGES.GRANT.MARK_AS_COMPLETE.UNDO.LOADING,
        },
      });
      expect(mockRefreshGrant).toHaveBeenCalled();
    });

    it("should throw original error when fallback also fails", async () => {
      const onChainError = new Error("On-chain error");
      mockMulticallContract.multiRevoke.mockRejectedValue(onChainError);
      mockPerformOffChainRevoke.mockResolvedValue(false);

      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      expect(mockShowError).toHaveBeenCalledWith("On-chain error");
      expect(mockErrorManager).toHaveBeenCalled();
    });

    it("should handle fallback success callback", async () => {
      const onChainError = new Error("On-chain error");
      mockMulticallContract.multiRevoke.mockRejectedValue(onChainError);
      let onSuccessCallback: (() => void) | undefined;
      mockPerformOffChainRevoke.mockImplementation((options: any) => {
        onSuccessCallback = options.onSuccess;
        return Promise.resolve(true);
      });

      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      await act(async () => {
        onSuccessCallback?.();
      });

      expect(mockChangeStepperStep).toHaveBeenCalledWith("indexed");
      expect(mockDismiss).toHaveBeenCalled();
    });
  });

  describe("Authorization Checks", () => {
    it("should use on-chain path when isProjectOwner is true", async () => {
      mockStoreState.isProjectOwner = true;
      mockStoreState.isOwner = false;
      mockSetupChainAndWallet.mockResolvedValue({
        gapClient: mockGapClient,
        walletSigner: mockWalletSigner,
        chainId: 42161,
        isGasless: false,
      });
      mockGapClient.fetch.projectById.mockResolvedValue(mockInstanceProject);
      mockBuildRevocationPayload.mockReturnValue([{ schema: "0xschema123", data: [] }]);
      mockGetMulticall.mockResolvedValue(mockMulticallContract);
      mockMulticallContract.multiRevoke.mockResolvedValue(mockTransaction);
      mockTransaction.wait.mockResolvedValue({
        transactionHash: "0xtxhash123",
      });

      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      expect(mockSetupChainAndWallet).toHaveBeenCalled();
      expect(mockPerformOffChainRevoke).not.toHaveBeenCalled();
    });

    it("should use on-chain path when isContractOwner is true", async () => {
      mockStoreState.isProjectOwner = false;
      mockStoreState.isOwner = true;
      mockSetupChainAndWallet.mockResolvedValue({
        gapClient: mockGapClient,
        walletSigner: mockWalletSigner,
        chainId: 42161,
        isGasless: false,
      });
      mockGapClient.fetch.projectById.mockResolvedValue(mockInstanceProject);
      mockBuildRevocationPayload.mockReturnValue([{ schema: "0xschema123", data: [] }]);
      mockGetMulticall.mockResolvedValue(mockMulticallContract);
      mockMulticallContract.multiRevoke.mockResolvedValue(mockTransaction);
      mockTransaction.wait.mockResolvedValue({
        transactionHash: "0xtxhash123",
      });

      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      expect(mockSetupChainAndWallet).toHaveBeenCalled();
      expect(mockPerformOffChainRevoke).not.toHaveBeenCalled();
    });
  });

  describe("Stepper State Transitions", () => {
    beforeEach(() => {
      mockStoreState.isProjectOwner = true;
      mockSetupChainAndWallet.mockResolvedValue({
        gapClient: mockGapClient,
        walletSigner: mockWalletSigner,
        chainId: 42161,
        isGasless: false,
      });
      mockGapClient.fetch.projectById.mockResolvedValue(mockInstanceProject);
      mockBuildRevocationPayload.mockReturnValue([{ schema: "0xschema123", data: [] }]);
      mockGetMulticall.mockResolvedValue(mockMulticallContract);
      mockMulticallContract.multiRevoke.mockResolvedValue(mockTransaction);
      mockTransaction.wait.mockResolvedValue({
        transactionHash: "0xtxhash123",
      });
    });

    it("should set stepper to true at start", async () => {
      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      expect(mockChangeStepperStep).toHaveBeenCalledWith("confirmed");
    });

    it("should transition through stepper states", async () => {
      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      expect(mockChangeStepperStep).toHaveBeenCalledWith("confirmed");
      expect(mockChangeStepperStep).toHaveBeenCalledWith("indexing");
    });

    it("should reset stepper on error", async () => {
      mockMulticallContract.multiRevoke.mockRejectedValue(new Error("Error"));
      mockPerformOffChainRevoke.mockResolvedValue(false);

      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      expect(mockDismiss).toHaveBeenCalled();
    });

    it("should reset stepper in finally block", async () => {
      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      expect(mockDismiss).toHaveBeenCalled();
    });
  });

  describe("State Management", () => {
    it("should set isRevoking to true during operation", async () => {
      mockStoreState.isProjectOwner = false;
      let resolveOffChain: any;
      const offChainPromise = new Promise((resolve) => {
        resolveOffChain = resolve;
      });
      mockPerformOffChainRevoke.mockReturnValue(offChainPromise);

      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      let revokePromise: Promise<void>;
      act(() => {
        revokePromise = result.current.revokeCompletion();
      });

      expect(result.current.isRevoking).toBe(true);

      await act(async () => {
        resolveOffChain(true);
        await revokePromise!;
      });

      expect(result.current.isRevoking).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should handle non-Error objects", async () => {
      mockStoreState.isProjectOwner = false;
      mockPerformOffChainRevoke.mockRejectedValue("String error");

      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      expect(mockShowError).toHaveBeenCalledWith(MESSAGES.GRANT.MARK_AS_COMPLETE.UNDO.ERROR);
      expect(mockErrorManager).toHaveBeenCalled();
    });
  });
});
