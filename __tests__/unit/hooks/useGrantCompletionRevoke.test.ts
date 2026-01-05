/**
 * @file Tests for useGrantCompletionRevoke hook
 * @description Tests grant completion revocation workflow with dual paths (on-chain and off-chain)
 */

// Mock ALL dependencies to avoid ESM import issues
const mockEnsureCorrectChain = jest.fn();
const mockSafeGetWalletClient = jest.fn();
const mockWalletClientToSigner = jest.fn();
const mockFetchData = jest.fn();
const mockPerformOffChainRevoke = jest.fn();
const mockCreateCheckIfCompletionExists = jest.fn();
const mockValidateGrantCompletion = jest.fn();
const mockBuildRevocationPayload = jest.fn();
const mockGetMulticall = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
const mockToast = jest.fn();
const mockErrorManager = jest.fn();

// Create a mock toast function that can be called directly
const createMockToastDefault = () => {
  const fn = jest.fn();
  fn.success = mockToastSuccess;
  fn.error = mockToastError;
  fn.loading = jest.fn();
  fn.dismiss = jest.fn();
  return fn;
};

jest.mock("@/utilities/ensureCorrectChain", () => ({
  ensureCorrectChain: mockEnsureCorrectChain,
}));

jest.mock("@/utilities/wallet-helpers", () => ({
  safeGetWalletClient: mockSafeGetWalletClient,
}));

jest.mock("@/utilities/eas-wagmi-utils", () => ({
  walletClientToSigner: mockWalletClientToSigner,
}));

jest.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: mockFetchData,
}));

jest.mock("@/hooks/useOffChainRevoke", () => ({
  useOffChainRevoke: jest.fn(() => ({
    performOffChainRevoke: mockPerformOffChainRevoke,
  })),
}));

jest.mock("@/utilities/grantCompletionHelpers", () => ({
  createCheckIfCompletionExists: mockCreateCheckIfCompletionExists,
  validateGrantCompletion: mockValidateGrantCompletion,
  buildRevocationPayload: mockBuildRevocationPayload,
}));

jest.mock("@show-karma/karma-gap-sdk", () => ({
  GAP: {
    getMulticall: mockGetMulticall,
  },
}));

const mockToastDefault = createMockToastDefault();
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: mockToastDefault,
}));

jest.mock("@/components/Utilities/errorManager", () => ({
  errorManager: mockErrorManager,
}));

const mockUseAccount = jest.fn();
jest.mock("wagmi", () => ({
  useAccount: mockUseAccount,
}));

const mockSwitchChainAsync = jest.fn();
jest.mock("@/hooks/useWallet", () => ({
  useWallet: jest.fn(() => ({ switchChainAsync: mockSwitchChainAsync })),
}));

const mockGap = { fetch: { projectById: jest.fn() } };
jest.mock("@/hooks/useGap", () => ({
  useGap: jest.fn(() => ({ gap: mockGap })),
}));

const mockChangeStepperStep = jest.fn();
const mockSetIsStepper = jest.fn();
jest.mock("@/hooks/useAttestationToast", () => ({
  useAttestationToast: jest.fn(() => ({
    changeStepperStep: mockChangeStepperStep,
    setIsStepper: mockSetIsStepper,
    showLoading: jest.fn(),
    showSuccess: jest.fn(),
    showError: jest.fn(),
    updateStep: jest.fn(),
    dismiss: jest.fn(),
  })),
}));

const mockIsProjectOwner = jest.fn();
const mockIsOwner = jest.fn();

jest.mock("@/store", () => ({
  useProjectStore: jest.fn((selector?: any) => {
    // When called without selector or with destructuring pattern, return object
    if (!selector) {
      return {
        isProjectOwner: mockIsProjectOwner(),
      };
    }
    // When called with selector function
    if (typeof selector === "function") {
      const state = {
        isProjectOwner: mockIsProjectOwner(),
      };
      return selector(state);
    }
    return {
      isProjectOwner: mockIsProjectOwner(),
    };
  }),
  useOwnerStore: jest.fn((selector?: any) => {
    // When called without selector or with destructuring pattern, return object
    if (!selector) {
      return { isOwner: mockIsOwner() };
    }
    // When called with selector function
    if (typeof selector === "function") {
      const state = { isOwner: mockIsOwner() };
      return selector(state);
    }
    return { isOwner: mockIsOwner() };
  }),
}));

const mockRefetchGrants = jest.fn();
jest.mock("@/hooks/v2/useProjectGrants", () => ({
  useProjectGrants: jest.fn(() => ({
    refetch: mockRefetchGrants,
    grants: [],
  })),
}));

const mockRefreshGrant = jest.fn();
jest.mock("@/store/grant", () => ({
  useGrantStore: jest.fn(() => ({ refreshGrant: mockRefreshGrant })),
}));

import { act, renderHook } from "@testing-library/react";
import { MESSAGES } from "@/utilities/messages";

// Import the hook to test AFTER mocking dependencies
const { useGrantCompletionRevoke } = require("@/hooks/useGrantCompletionRevoke");

// Get the mocked toast function
const toast = require("react-hot-toast").default;
const mockToastFn = (global as any).__mockToastFn || toast;

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
        multiRevoke: jest.fn(),
      },
      revoked: false,
    },
  } as any;

  const mockProject = {
    uid: "project-456",
  } as any;

  const mockGapClient = {
    fetch: {
      projectById: jest.fn(),
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
        multiRevoke: jest.fn(),
      },
      revoked: false,
    },
  } as any;

  const mockInstanceProject = {
    grants: [mockGrantInstance],
  } as any;

  const mockMulticallContract = {
    multiRevoke: jest.fn(),
  } as any;

  const mockTransaction = {
    wait: jest.fn(),
  } as any;

  const mockCheckIfCompletionExists = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAccount.mockReturnValue({ chain: { id: 42161 } });
    mockIsProjectOwner.mockReturnValue(false);
    mockIsOwner.mockReturnValue(false);
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

      expect(mockSetIsStepper).not.toHaveBeenCalled();
      expect(result.current.isRevoking).toBe(false);
    });

    it("should return early if project is falsy", async () => {
      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: null as any })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      expect(mockSetIsStepper).not.toHaveBeenCalled();
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

      expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining("Chain ID not found"));
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

      expect(mockToastError).toHaveBeenCalledWith("Grant completion UID not found");
      expect(mockErrorManager).toHaveBeenCalled();
    });

    it("should use grant.chainID for chain switching", async () => {
      const grantWithChainID = {
        ...mockGrant,
        chainID: 42161,
      };
      mockIsProjectOwner.mockReturnValue(true);
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

      expect(mockEnsureCorrectChain).toHaveBeenCalledWith({
        targetChainId: 42161,
        currentChainId: 42161,
        switchChainAsync: mockSwitchChainAsync,
      });
    });
  });

  describe("Off-chain Direct Path (Unauthorized Users)", () => {
    beforeEach(() => {
      mockIsProjectOwner.mockReturnValue(false);
      mockIsOwner.mockReturnValue(false);
    });

    it("should use off-chain revocation when not authorized", async () => {
      mockPerformOffChainRevoke.mockResolvedValue(true);

      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      expect(mockSetIsStepper).toHaveBeenCalledWith(true);
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
      expect(mockEnsureCorrectChain).not.toHaveBeenCalled();
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
      expect(mockSetIsStepper).toHaveBeenCalledWith(false);
    });

    it("should handle off-chain revocation error callback", async () => {
      // Suppress expected console.error from error callback
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

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

      expect(mockSetIsStepper).toHaveBeenCalledWith(false);
      expect(consoleSpy).toHaveBeenCalledWith("Off-chain revocation failed:", mockError);

      // Restore console.error
      consoleSpy.mockRestore();
    });
  });

  describe("On-chain Revocation Success Path", () => {
    beforeEach(() => {
      mockIsProjectOwner.mockReturnValue(true);
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

      expect(mockEnsureCorrectChain).toHaveBeenCalledWith({
        targetChainId: 42161,
        currentChainId: 42161,
        switchChainAsync: mockSwitchChainAsync,
      });
      expect(mockSafeGetWalletClient).toHaveBeenCalledWith(42161);
      expect(mockWalletClientToSigner).toHaveBeenCalledWith(mockWalletClient);
      expect(mockGapClient.fetch.projectById).toHaveBeenCalledWith("project-456");
      expect(mockValidateGrantCompletion).toHaveBeenCalledWith(mockGrantInstance.completed);
      expect(mockBuildRevocationPayload).toHaveBeenCalledWith("0xschema123", "0xcompletion123");
      expect(mockGetMulticall).toHaveBeenCalledWith(mockWalletSigner);
      expect(mockMulticallContract.multiRevoke).toHaveBeenCalledWith([
        { schema: "0xschema123", data: [{ uid: "0xcompletion123", value: 0n }] },
      ]);
      expect(mockChangeStepperStep).toHaveBeenCalledWith("pending");
      expect(mockFetchData).toHaveBeenCalled();
      expect(mockChangeStepperStep).toHaveBeenCalledWith("indexing");
      expect(mockCheckIfCompletionExists).toHaveBeenCalled();
      expect(mockRefreshGrant).toHaveBeenCalled();
      expect(mockToastSuccess).toHaveBeenCalledWith(MESSAGES.GRANT.MARK_AS_COMPLETE.UNDO.SUCCESS);
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
      mockIsProjectOwner.mockReturnValue(true);
    });

    it("should handle chain setup failure", async () => {
      mockEnsureCorrectChain.mockResolvedValue({
        success: false,
        chainId: null,
        gapClient: null,
      });

      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      expect(mockSafeGetWalletClient).not.toHaveBeenCalled();
      expect(result.current.isRevoking).toBe(false);
    });
  });

  describe("On-chain Wallet Connection Failures", () => {
    beforeEach(() => {
      mockIsProjectOwner.mockReturnValue(true);
      mockEnsureCorrectChain.mockResolvedValue({
        success: true,
        chainId: 42161,
        gapClient: mockGapClient,
      });
    });

    it("should handle wallet client error", async () => {
      mockSafeGetWalletClient.mockResolvedValue({
        walletClient: null,
        error: new Error("Wallet connection failed"),
      });

      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      expect(mockToastError).toHaveBeenCalledWith("Failed to connect to wallet");
      expect(mockErrorManager).toHaveBeenCalled();
    });

    it("should handle missing gapClient", async () => {
      mockEnsureCorrectChain.mockResolvedValue({
        success: true,
        chainId: 42161,
        gapClient: null,
      });
      mockSafeGetWalletClient.mockResolvedValue({
        walletClient: mockWalletClient,
        error: null,
      });

      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      expect(mockToastError).toHaveBeenCalled();
    });
  });

  describe("On-chain Grant Instance Not Found", () => {
    beforeEach(() => {
      mockIsProjectOwner.mockReturnValue(true);
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

      expect(mockToastError).toHaveBeenCalledWith("Grant completion not found");
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

      expect(mockToastError).toHaveBeenCalledWith("Grant completion not found");
    });
  });

  describe("On-chain Schema Validation Failures", () => {
    beforeEach(() => {
      mockIsProjectOwner.mockReturnValue(true);
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

      expect(mockToastError).toHaveBeenCalledWith("Grant completion schema not found");
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

      expect(mockToastError).toHaveBeenCalledWith(
        "Grant completion schema does not support multiRevoke"
      );
    });
  });

  describe("Off-chain Fallback When On-chain Fails", () => {
    beforeEach(() => {
      mockIsProjectOwner.mockReturnValue(true);
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

      expect(mockSetIsStepper).toHaveBeenCalledWith(false);
      /**
       * Note: Indirect toast() assertion
       *
       * The toast() call at line 190 of useGrantCompletionRevoke.ts is not directly verified here
       * due to Jest mock setup timing issues. The toast mock is created in jest.mock() before the
       * hook is imported, which can cause the mock reference to not be properly captured.
       *
       * Instead, we verify the toast call indirectly by:
       * 1. Confirming that performOffChainRevoke is called (which only happens after the toast call)
       * 2. Verifying the fallback path execution through mockPerformOffChainRevoke being called
       * 3. Checking that mockSetIsStepper(false) was called (which happens right before the toast)
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

      expect(mockToastError).toHaveBeenCalledWith("On-chain error");
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
      expect(mockSetIsStepper).toHaveBeenCalledWith(false);
    });
  });

  describe("Authorization Checks", () => {
    it("should use on-chain path when isProjectOwner is true", async () => {
      mockIsProjectOwner.mockReturnValue(true);
      mockIsOwner.mockReturnValue(false);
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

      expect(mockEnsureCorrectChain).toHaveBeenCalled();
      expect(mockPerformOffChainRevoke).not.toHaveBeenCalled();
    });

    it("should use on-chain path when isContractOwner is true", async () => {
      mockIsProjectOwner.mockReturnValue(false);
      mockIsOwner.mockReturnValue(true);
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

      expect(mockEnsureCorrectChain).toHaveBeenCalled();
      expect(mockPerformOffChainRevoke).not.toHaveBeenCalled();
    });
  });

  describe("Stepper State Transitions", () => {
    beforeEach(() => {
      mockIsProjectOwner.mockReturnValue(true);
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

      expect(mockSetIsStepper).toHaveBeenCalledWith(true);
    });

    it("should transition through stepper states", async () => {
      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      expect(mockChangeStepperStep).toHaveBeenCalledWith("pending");
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

      expect(mockSetIsStepper).toHaveBeenCalledWith(false);
    });

    it("should reset stepper in finally block", async () => {
      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      expect(mockSetIsStepper).toHaveBeenCalledWith(false);
    });
  });

  describe("State Management", () => {
    it("should set isRevoking to true during operation", async () => {
      mockIsProjectOwner.mockReturnValue(false);
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
      mockIsProjectOwner.mockReturnValue(false);
      mockPerformOffChainRevoke.mockRejectedValue("String error");

      const { result } = renderHook(() =>
        useGrantCompletionRevoke({ grant: mockGrant, project: mockProject })
      );

      await act(async () => {
        await result.current.revokeCompletion();
      });

      expect(mockToastError).toHaveBeenCalledWith(MESSAGES.GRANT.MARK_AS_COMPLETE.UNDO.ERROR);
      expect(mockErrorManager).toHaveBeenCalled();
    });
  });
});
