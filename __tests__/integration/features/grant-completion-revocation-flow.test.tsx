/**
 * Integration Tests for Grant Completion Revocation Flow
 *
 * Tests complete grant completion revocation flows with components and hooks interacting.
 * These tests verify realistic user scenarios end-to-end within the React environment.
 *
 * Test Coverage:
 * - Complete on-chain revocation flow (authorized user)
 * - Complete off-chain revocation flow (unauthorized user)
 * - Fallback flow (on-chain failure → off-chain success)
 * - Error handling flow (both paths fail)
 * - State transitions (stepper states, loading states)
 * - Authorization checks (component rendering based on permissions)
 * - UI state changes (button disabled states, spinner visibility, text changes)
 */

import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import toast from "react-hot-toast";
import { GrantCompleteButton } from "@/components/Pages/GrantMilestonesAndUpdates/GrantCompleteButton";
import { useGrantCompletionRevoke } from "@/hooks/useGrantCompletionRevoke";
import type { GrantResponse } from "@/types/v2/grant";
import type { ProjectResponse } from "@/types/v2/project";

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
    getAttestationSigner: vi.fn().mockResolvedValue(null),
    isGaslessAvailable: false,
    attestationAddress: null,
    hasEmbeddedWallet: false,
    hasExternalWallet: true,
    isLoading: false,
    error: null,
  })),
}));

// Mock dependencies
vi.mock("wagmi", () => ({
  useAccount: vi.fn(),
  useChainId: vi.fn(() => 1),
}));

vi.mock("@/hooks/useWallet", () => ({
  useWallet: vi.fn(() => ({
    switchChainAsync: vi.fn(),
  })),
}));

vi.mock("@/hooks/useGap", () => ({
  useGap: vi.fn(() => ({
    gap: {
      fetch: {
        projectById: vi.fn(),
      },
    },
  })),
}));

<<<<<<< HEAD
// SWC transforms @/ aliases to relative paths at compile time, so we must mock
// the actual file path for the mock to intercept the hook's internal import.
jest.mock("../../../hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: jest.fn(() => ({
    setupChainAndWallet: jest.fn(),
=======
vi.mock("@/hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: vi.fn(() => ({
    setupChainAndWallet: vi.fn(),
>>>>>>> 8322801b (test: migrate Jest to Vitest for unit/integration tests)
    isSmartWalletReady: false,
    smartWalletAddress: null,
    hasEmbeddedWallet: false,
    hasExternalWallet: true,
  })),
}));

vi.mock("@/hooks/useAttestationToast", () => ({
  useAttestationToast: vi.fn(() => ({
    startAttestation: vi.fn(),
    changeStepperStep: vi.fn(),
    setIsStepper: vi.fn(),
    showLoading: vi.fn(),
    showSuccess: vi.fn(),
    showError: vi.fn(),
    updateStep: vi.fn(),
    dismiss: vi.fn(),
  })),
}));

vi.mock("@/utilities/ensureCorrectChain", () => ({
  ensureCorrectChain: vi.fn(),
}));

vi.mock("@/utilities/wallet-helpers", () => ({
  safeGetWalletClient: vi.fn(),
}));

vi.mock("@/utilities/eas-wagmi-utils", () => ({
  walletClientToSigner: vi.fn(),
}));

vi.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock("@/hooks/useOffChainRevoke", () => ({
  useOffChainRevoke: vi.fn(() => ({
    performOffChainRevoke: vi.fn(),
  })),
}));

vi.mock("@/utilities/grantCompletionHelpers", () => ({
  createCheckIfCompletionExists: vi.fn(),
  validateGrantCompletion: vi.fn(),
  buildRevocationPayload: vi.fn(),
}));

vi.mock("@show-karma/karma-gap-sdk", () => ({
  GAP: {
    getMulticall: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

vi.mock("@/store/grant", () => ({
  useGrantStore: vi.fn(() => ({
    refreshGrant: vi.fn(),
  })),
}));

vi.mock("@/store", () => ({
  useProjectStore: vi.fn(),
  useOwnerStore: vi.fn(),
}));

vi.mock("@/hooks/v2/useProjectGrants", () => ({
  useProjectGrants: vi.fn(() => ({
    refetch: vi.fn(),
    grants: [],
  })),
}));

vi.mock("@/store/communityAdmin", () => ({
  useCommunityAdminStore: vi.fn(),
}));

// Note: We don't mock useGrantCompletionRevoke here - we want to test the actual hook
// All its dependencies are mocked above

// Mock Spinner component
vi.mock("@/components/ui/spinner", () => ({
  Spinner: ({ className }: { className?: string }) => (
    <div data-testid="spinner" className={className}>
      Loading...
    </div>
  ),
}));

// Mock Heroicons
vi.mock("@heroicons/react/24/outline", () => ({
  CheckCircleIcon: ({ className }: { className?: string }) => (
    <svg data-testid="check-circle-icon" className={className} />
  ),
  XCircleIcon: ({ className }: { className?: string }) => (
    <svg data-testid="x-circle-icon" className={className} />
  ),
}));

describe("Integration: Grant Completion Revocation Flow", () => {
  const mockGrant: GrantResponse = {
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

  const mockProject: ProjectResponse = {
    uid: "0xproject456" as `0x${string}`,
    chainID: 42161,
    owner: "0x1234567890123456789012345678901234567890" as `0x${string}`,
    details: {
      title: "Test Project",
      description: "Test project description",
      slug: "test-project",
    },
    members: [],
  } as ProjectResponse;

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
  };

  const mockInstanceProject = {
    grants: [mockGrantInstance],
  };

  const mockMulticallContract = {
    multiRevoke: vi.fn(),
  };

  const mockTransaction = {
    wait: vi.fn(),
  };

  const mockCheckIfCompletionExists = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    const wagmi = require("wagmi");
    wagmi.useAccount.mockReturnValue({ chain: { id: 42161 } });

    const { useAttestationToast } = require("@/hooks/useAttestationToast");
    const mockChangeStepperStep = vi.fn();
    const mockSetIsStepper = vi.fn();
    const mockDismiss = vi.fn();
    const mockStartAttestation = vi.fn();
    useAttestationToast.mockReturnValue({
      startAttestation: mockStartAttestation,
      changeStepperStep: mockChangeStepperStep,
      setIsStepper: mockSetIsStepper,
      showLoading: vi.fn(),
      showSuccess: vi.fn(),
      showError: vi.fn(),
      updateStep: vi.fn(),
      dismiss: mockDismiss,
    });

    // Setup default useSetupChainAndWallet mock (returns null by default, tests override as needed)
    const { useSetupChainAndWallet } = require("../../../hooks/useSetupChainAndWallet");
    useSetupChainAndWallet.mockReturnValue({
      setupChainAndWallet: vi.fn().mockResolvedValue(null),
      isSmartWalletReady: false,
      smartWalletAddress: null,
      hasEmbeddedWallet: false,
      hasExternalWallet: true,
    });

    const { useProjectStore } = require("@/store");
    const { useOwnerStore } = require("@/store");
    const { useCommunityAdminStore } = require("@/store/communityAdmin");
    const mockRefreshProject = vi.fn();
    const mockIsProjectOwner = vi.fn(() => false);
    const mockIsOwner = vi.fn(() => false);
    const mockIsProjectAdmin = vi.fn(() => false);
    const mockIsCommunityAdmin = vi.fn(() => false);

    useProjectStore.mockImplementation((selector?: any) => {
      if (!selector) {
        return {
          refreshProject: mockRefreshProject,
          isProjectOwner: mockIsProjectOwner(),
          isProjectAdmin: mockIsProjectAdmin(),
        };
      }
      if (typeof selector === "function") {
        const state = {
          refreshProject: mockRefreshProject,
          isProjectOwner: mockIsProjectOwner(),
          isProjectAdmin: mockIsProjectAdmin(),
        };
        return selector(state);
      }
      return {
        refreshProject: mockRefreshProject,
        isProjectOwner: mockIsProjectOwner(),
        isProjectAdmin: mockIsProjectAdmin(),
      };
    });

    useOwnerStore.mockImplementation((selector?: any) => {
      if (!selector) {
        return { isOwner: mockIsOwner() };
      }
      if (typeof selector === "function") {
        const state = { isOwner: mockIsOwner() };
        return selector(state);
      }
      return { isOwner: mockIsOwner() };
    });

    useCommunityAdminStore.mockImplementation((selector?: any) => {
      if (!selector) {
        return { isCommunityAdmin: mockIsCommunityAdmin() };
      }
      if (typeof selector === "function") {
        const state = { isCommunityAdmin: mockIsCommunityAdmin() };
        return selector(state);
      }
      return { isCommunityAdmin: mockIsCommunityAdmin() };
    });

    const { useGrantStore } = require("@/store/grant");
    const mockRefreshGrant = vi.fn();
    useGrantStore.mockReturnValue({ refreshGrant: mockRefreshGrant });

    const { createCheckIfCompletionExists } = require("@/utilities/grantCompletionHelpers");
    // Mock checkIfCompletionExists to invoke the callback when called
    mockCheckIfCompletionExists.mockImplementation(async (callback?: () => void) => {
      // Simulate async completion check
      await new Promise((resolve) => setTimeout(resolve, 10));
      // Invoke callback if provided (this triggers the 'indexed' stepper step)
      callback?.();
      return undefined;
    });
    createCheckIfCompletionExists.mockReturnValue(mockCheckIfCompletionExists);

    const { useOffChainRevoke } = require("@/hooks/useOffChainRevoke");
    const mockPerformOffChainRevoke = vi.fn();
    useOffChainRevoke.mockReturnValue({
      performOffChainRevoke: mockPerformOffChainRevoke,
    });

    const { useGap } = require("@/hooks/useGap");
    const mockGapClient = {
      fetch: {
        projectById: vi.fn().mockResolvedValue(mockInstanceProject),
      },
    };
    useGap.mockReturnValue({ gap: mockGapClient });

    // Setup toast mock - the default export is callable
    const mockToastFn = vi.fn();
    mockToastFn.success = vi.fn();
    mockToastFn.error = vi.fn();
    mockToastFn.loading = vi.fn();
    mockToastFn.dismiss = vi.fn();
    toast.default = mockToastFn;
    toast.success = mockToastFn.success;
    toast.error = mockToastFn.error;
  });

  describe("1. Complete On-Chain Revocation Flow", () => {
    it("should complete full on-chain revocation flow with UI state changes", async () => {
      // Setup: Authorized user (project owner)
      const { useProjectStore } = require("@/store");
      const { useOwnerStore } = require("@/store");
      const { useCommunityAdminStore } = require("@/store/communityAdmin");
      const mockIsProjectOwner = vi.fn(() => true);
      const mockRefreshProject = vi.fn();

      useProjectStore.mockImplementation((selector?: any) => {
        const state = {
          refreshProject: mockRefreshProject,
          isProjectOwner: mockIsProjectOwner(),
          isProjectAdmin: false,
        };
        if (!selector) {
          return state;
        }
        if (typeof selector === "function") {
          return selector(state);
        }
        return state;
      });

      useOwnerStore.mockImplementation((selector?: any) => {
        const state = { isOwner: true }; // Authorized via isOwner
        if (!selector) {
          return state;
        }
        if (typeof selector === "function") {
          return selector(state);
        }
        return state;
      });

      useCommunityAdminStore.mockImplementation((selector?: any) => {
        const state = { isCommunityAdmin: false };
        if (!selector) {
          return state;
        }
        if (typeof selector === "function") {
          return selector(state);
        }
        return state;
      });

      // Setup: useSetupChainAndWallet mock for authorized user
      const mockGapClient = {
        fetch: {
          projectById: vi.fn().mockResolvedValue(mockInstanceProject),
        },
      };
      const mockWalletSigner = {};
      const mockSetupChainAndWallet = vi.fn().mockResolvedValue({
        gapClient: mockGapClient,
        walletSigner: mockWalletSigner,
        chainId: 42161,
        isGasless: false,
      });
      const { useSetupChainAndWallet } = require("../../../hooks/useSetupChainAndWallet");
      useSetupChainAndWallet.mockReturnValue({
        setupChainAndWallet: mockSetupChainAndWallet,
        isSmartWalletReady: false,
        smartWalletAddress: null,
        hasEmbeddedWallet: false,
        hasExternalWallet: true,
      });

      const { GAP } = require("@show-karma/karma-gap-sdk");
      GAP.getMulticall.mockResolvedValue(mockMulticallContract);
      mockMulticallContract.multiRevoke.mockResolvedValue(mockTransaction);
      mockTransaction.wait.mockResolvedValue({
        transactionHash: "0xtxhash123",
      });

      const { buildRevocationPayload } = require("@/utilities/grantCompletionHelpers");
      buildRevocationPayload.mockReturnValue([{ schema: "0xschema123", data: [] }]);

      const fetchData = require("@/utilities/fetchData").default;
      fetchData.mockResolvedValue({});

      // Render component
      render(<GrantCompleteButton grant={mockGrant} project={mockProject} />);

      // Verify initial state: button should be visible and enabled
      const button = screen.getByRole("button", {
        name: /revoke grant completion/i,
      });
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();

      // Verify initial text
      expect(screen.getByText("Marked as complete")).toBeInTheDocument();

      // Click button to trigger revocation
      fireEvent.click(button);

      // Verify loading state: button should be disabled and show spinner
      await waitFor(() => {
        expect(button).toBeDisabled();
        expect(screen.getByTestId("spinner")).toBeInTheDocument();
        expect(screen.getByText("Revoking...")).toBeInTheDocument();
      });

      // Verify stepper was activated (now uses changeStepperStep instead of setIsStepper)
      const { useAttestationToast } = require("@/hooks/useAttestationToast");
      const stepper = useAttestationToast();

      // Verify on-chain path was taken via setupChainAndWallet
      await waitFor(() => {
        expect(mockSetupChainAndWallet).toHaveBeenCalled();
        expect(mockMulticallContract.multiRevoke).toHaveBeenCalled();
      });

      // Verify stepper transitions (preparing/pending are skipped in new toast system)
      await waitFor(() => {
        expect(stepper.changeStepperStep).toHaveBeenCalledWith("confirmed");
        expect(stepper.changeStepperStep).toHaveBeenCalledWith("indexing");
      });

      // Verify success (now uses showSuccess from useAttestationToast)
      await waitFor(() => {
        expect(stepper.showSuccess).toHaveBeenCalled();
      });

      // Verify final state: stepper dismissed (now uses dismiss instead of setIsStepper)
      await waitFor(() => {
        expect(stepper.dismiss).toHaveBeenCalled();
      });
    });
  });

  describe("2. Complete Off-Chain Revocation Flow", () => {
    it("should complete full off-chain revocation flow for unauthorized user", async () => {
      // Setup: Unauthorized user
      const { useProjectStore } = require("@/store");
      const { useOwnerStore } = require("@/store");
      const { useCommunityAdminStore } = require("@/store/communityAdmin");
      const mockRefreshProject = vi.fn();

      useProjectStore.mockImplementation((selector?: any) => {
        const state = {
          refreshProject: mockRefreshProject,
          isProjectOwner: false,
          isProjectAdmin: false,
        };
        if (!selector) {
          return state;
        }
        if (typeof selector === "function") {
          return selector(state);
        }
        return state;
      });

      useOwnerStore.mockImplementation((selector?: any) => {
        const state = { isOwner: false };
        if (!selector) {
          return state;
        }
        if (typeof selector === "function") {
          return selector(state);
        }
        return state;
      });

      useCommunityAdminStore.mockImplementation((selector?: any) => {
        const state = { isCommunityAdmin: false };
        if (!selector) {
          return state;
        }
        if (typeof selector === "function") {
          return selector(state);
        }
        return state;
      });

      const { useOffChainRevoke } = require("@/hooks/useOffChainRevoke");
      const mockPerformOffChainRevoke = vi.fn().mockImplementation(async (options: any) => {
        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 10));
        // Call onSuccess callback if provided
        if (options?.onSuccess) {
          options.onSuccess();
        }
        return true;
      });
      useOffChainRevoke.mockReturnValue({
        performOffChainRevoke: mockPerformOffChainRevoke,
      });

      // Render component
      render(<GrantCompleteButton grant={mockGrant} project={mockProject} />);

      // Verify button is visible but disabled (unauthorized)
      const button = screen.getByRole("button", {
        name: /revoke grant completion/i,
      });
      expect(button).toBeInTheDocument();
      expect(button).toBeDisabled();

      // For unauthorized users, button should be disabled
      // But if we simulate authorization change, we can test the flow
      // Let's test via hook directly for unauthorized flow
      const { result } = renderHook(() =>
        useGrantCompletionRevoke({
          grant: mockGrant,
          project: mockProject,
        })
      );

      // Trigger revocation
      await act(async () => {
        await result.current.revokeCompletion();
      });

      // Verify off-chain path was taken
      await waitFor(() => {
        expect(mockPerformOffChainRevoke).toHaveBeenCalled();
      });

      // Verify stepper was used (off-chain flow calls changeStepperStep and dismiss in onSuccess callback)
      const { useAttestationToast } = require("@/hooks/useAttestationToast");
      const stepper = useAttestationToast();
      await waitFor(() => {
        expect(stepper.changeStepperStep).toHaveBeenCalledWith("indexed");
        expect(stepper.dismiss).toHaveBeenCalled();
      });

      // Verify loading state was managed
      expect(result.current.isRevoking).toBe(false);
    });
  });

  describe("3. Fallback Flow (On-Chain Failure → Off-Chain Success)", () => {
    it("should fallback to off-chain when on-chain fails", async () => {
      // Setup: Authorized user
      const { useProjectStore } = require("@/store");
      const { useOwnerStore } = require("@/store");
      const { useCommunityAdminStore } = require("@/store/communityAdmin");
      const mockRefreshProject = vi.fn();

      useProjectStore.mockImplementation((selector?: any) => {
        const state = {
          refreshProject: mockRefreshProject,
          isProjectOwner: true,
          isProjectAdmin: false,
        };
        if (!selector) {
          return state;
        }
        if (typeof selector === "function") {
          return selector(state);
        }
        return state;
      });

      useOwnerStore.mockImplementation((selector?: any) => {
        const state = { isOwner: true }; // Authorized via isOwner
        if (!selector) {
          return state;
        }
        if (typeof selector === "function") {
          return selector(state);
        }
        return state;
      });

      useCommunityAdminStore.mockImplementation((selector?: any) => {
        const state = { isCommunityAdmin: false };
        if (!selector) {
          return state;
        }
        if (typeof selector === "function") {
          return selector(state);
        }
        return state;
      });

      // Setup: useSetupChainAndWallet mock for authorized user
      const mockGapClient = {
        fetch: {
          projectById: vi.fn().mockResolvedValue(mockInstanceProject),
        },
      };
      const mockWalletSigner = {};
      const mockSetupChainAndWallet = vi.fn().mockResolvedValue({
        gapClient: mockGapClient,
        walletSigner: mockWalletSigner,
        chainId: 42161,
        isGasless: false,
      });
      const { useSetupChainAndWallet } = require("../../../hooks/useSetupChainAndWallet");
      useSetupChainAndWallet.mockReturnValue({
        setupChainAndWallet: mockSetupChainAndWallet,
        isSmartWalletReady: false,
        smartWalletAddress: null,
        hasEmbeddedWallet: false,
        hasExternalWallet: true,
      });

      // Setup: On-chain fails
      const { GAP } = require("@show-karma/karma-gap-sdk");
      GAP.getMulticall.mockResolvedValue(mockMulticallContract);
      const onChainError = new Error("On-chain error");
      mockMulticallContract.multiRevoke.mockRejectedValue(onChainError);

      // Setup: Off-chain succeeds
      const { useOffChainRevoke } = require("@/hooks/useOffChainRevoke");
      const mockPerformOffChainRevoke = vi.fn().mockImplementation(async (options: any) => {
        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 10));
        // Call onSuccess callback if provided
        if (options?.onSuccess) {
          options.onSuccess();
        }
        return true;
      });
      useOffChainRevoke.mockReturnValue({
        performOffChainRevoke: mockPerformOffChainRevoke,
      });

      // Render component
      render(<GrantCompleteButton grant={mockGrant} project={mockProject} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      // Verify on-chain was attempted via setupChainAndWallet
      await waitFor(() => {
        expect(mockSetupChainAndWallet).toHaveBeenCalled();
        expect(mockMulticallContract.multiRevoke).toHaveBeenCalled();
      });

      // Verify fallback to off-chain
      await waitFor(() => {
        expect(mockPerformOffChainRevoke).toHaveBeenCalled();
      });

      // Verify fallback notification (now uses showLoading from useAttestationToast)
      const { useAttestationToast } = require("@/hooks/useAttestationToast");
      const stepper = useAttestationToast();
      await waitFor(() => {
        expect(stepper.showLoading).toHaveBeenCalledWith(
          "On-chain revocation unavailable. Attempting off-chain revocation..."
        );
      });

      // Verify stepper transitions (dismiss is called before fallback, then indexed and dismiss again in onSuccess)
      await waitFor(() => {
        expect(stepper.dismiss).toHaveBeenCalled(); // Reset before fallback
        expect(stepper.changeStepperStep).toHaveBeenCalledWith("indexed");
      });
    });
  });

  describe("4. Error Handling Flow", () => {
    it("should handle errors when both paths fail", async () => {
      // Setup: Authorized user
      const { useProjectStore } = require("@/store");
      const { useOwnerStore } = require("@/store");
      useProjectStore.mockImplementation((selector?: any) => {
        const state = {
          refreshProject: vi.fn(),
          isProjectOwner: true,
          isProjectAdmin: false,
        };
        if (!selector) return state;
        if (typeof selector === "function") return selector(state);
        return state;
      });
      useOwnerStore.mockImplementation((selector?: any) => {
        const state = { isOwner: true };
        if (!selector) return state;
        if (typeof selector === "function") return selector(state);
        return state;
      });

      // Setup: useSetupChainAndWallet mock for authorized user
      const mockGapClient = {
        fetch: {
          projectById: vi.fn().mockResolvedValue(mockInstanceProject),
        },
      };
      const mockWalletSigner = {};
      const mockSetupChainAndWallet = vi.fn().mockResolvedValue({
        gapClient: mockGapClient,
        walletSigner: mockWalletSigner,
        chainId: 42161,
        isGasless: false,
      });
      const { useSetupChainAndWallet } = require("../../../hooks/useSetupChainAndWallet");
      useSetupChainAndWallet.mockReturnValue({
        setupChainAndWallet: mockSetupChainAndWallet,
        isSmartWalletReady: false,
        smartWalletAddress: null,
        hasEmbeddedWallet: false,
        hasExternalWallet: true,
      });

      // Setup: On-chain fails
      const { GAP } = require("@show-karma/karma-gap-sdk");
      GAP.getMulticall.mockResolvedValue(mockMulticallContract);
      const onChainError = new Error("On-chain error");
      mockMulticallContract.multiRevoke.mockRejectedValue(onChainError);

      // Setup: Off-chain also fails
      const { useOffChainRevoke } = require("@/hooks/useOffChainRevoke");
      const mockPerformOffChainRevoke = vi.fn().mockResolvedValue(false);
      useOffChainRevoke.mockReturnValue({
        performOffChainRevoke: mockPerformOffChainRevoke,
      });

      const { errorManager } = require("@/components/Utilities/errorManager");

      // Render component
      render(<GrantCompleteButton grant={mockGrant} project={mockProject} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      // Verify both paths were attempted
      await waitFor(() => {
        expect(mockSetupChainAndWallet).toHaveBeenCalled();
        expect(mockMulticallContract.multiRevoke).toHaveBeenCalled();
        expect(mockPerformOffChainRevoke).toHaveBeenCalled();
      });

      // Verify error handling (now uses showError from useAttestationToast)
      const { useAttestationToast } = require("@/hooks/useAttestationToast");
      const stepper = useAttestationToast();
      await waitFor(() => {
        expect(stepper.showError).toHaveBeenCalledWith("On-chain error");
        expect(errorManager).toHaveBeenCalled();
      });

      // Verify stepper was dismissed (now uses dismiss instead of setIsStepper)
      await waitFor(() => {
        expect(stepper.dismiss).toHaveBeenCalled();
      });
    });
  });

  describe("5. State Transitions", () => {
    it("should transition through all stepper states during on-chain flow", async () => {
      // Setup: Authorized user
      const { useProjectStore } = require("@/store");
      const { useOwnerStore } = require("@/store");
      useProjectStore.mockImplementation((selector?: any) => {
        const state = {
          refreshProject: vi.fn(),
          isProjectOwner: true,
          isProjectAdmin: false,
        };
        if (!selector) return state;
        if (typeof selector === "function") return selector(state);
        return state;
      });
      useOwnerStore.mockImplementation((selector?: any) => {
        const state = { isOwner: true };
        if (!selector) return state;
        if (typeof selector === "function") return selector(state);
        return state;
      });

      // Setup: useSetupChainAndWallet mock for authorized user
      const mockGapClient = {
        fetch: {
          projectById: vi.fn().mockResolvedValue(mockInstanceProject),
        },
      };
      const mockWalletSigner = {};
      const mockSetupChainAndWallet = vi.fn().mockResolvedValue({
        gapClient: mockGapClient,
        walletSigner: mockWalletSigner,
        chainId: 42161,
        isGasless: false,
      });
      const { useSetupChainAndWallet } = require("../../../hooks/useSetupChainAndWallet");
      useSetupChainAndWallet.mockReturnValue({
        setupChainAndWallet: mockSetupChainAndWallet,
        isSmartWalletReady: false,
        smartWalletAddress: null,
        hasEmbeddedWallet: false,
        hasExternalWallet: true,
      });

      const { GAP } = require("@show-karma/karma-gap-sdk");
      GAP.getMulticall.mockResolvedValue(mockMulticallContract);
      mockMulticallContract.multiRevoke.mockResolvedValue(mockTransaction);
      mockTransaction.wait.mockResolvedValue({
        transactionHash: "0xtxhash123",
      });

      const { buildRevocationPayload } = require("@/utilities/grantCompletionHelpers");
      buildRevocationPayload.mockReturnValue([{ schema: "0xschema123", data: [] }]);

      const fetchData = require("@/utilities/fetchData").default;
      fetchData.mockResolvedValue({});

      const { useAttestationToast } = require("@/hooks/useAttestationToast");
      const mockChangeStepperStep = vi.fn();
      const mockSetIsStepper = vi.fn();
      const mockDismiss = vi.fn();
      const mockStartAttestation = vi.fn();
      useAttestationToast.mockReturnValue({
        startAttestation: mockStartAttestation,
        changeStepperStep: mockChangeStepperStep,
        setIsStepper: mockSetIsStepper,
        showLoading: vi.fn(),
        showSuccess: vi.fn(),
        showError: vi.fn(),
        updateStep: vi.fn(),
        dismiss: mockDismiss,
      });

      // Test via hook to verify state transitions
      const { result } = renderHook(() =>
        useGrantCompletionRevoke({
          grant: mockGrant,
          project: mockProject,
        })
      );

      // Verify initial state
      expect(result.current.isRevoking).toBe(false);

      // Trigger revocation
      await act(async () => {
        await result.current.revokeCompletion();
      });

      // Verify all stepper state transitions (preparing/pending are skipped in new toast system)
      await waitFor(() => {
        expect(mockChangeStepperStep).toHaveBeenCalledWith("confirmed");
        expect(mockChangeStepperStep).toHaveBeenCalledWith("indexing");
      });

      // The 'indexed' step is called in the checkIfCompletionExists callback
      // which is invoked asynchronously, so we wait for it separately
      await waitFor(
        () => {
          expect(mockChangeStepperStep).toHaveBeenCalledWith("indexed");
          expect(mockDismiss).toHaveBeenCalled(); // Now uses dismiss instead of setIsStepper(false)
        },
        { timeout: 3000 }
      );

      // Verify final state
      expect(result.current.isRevoking).toBe(false);
    });
  });

  describe("6. Authorization Checks", () => {
    it("should render GrantCompletedButton when user is authorized", () => {
      // Setup: Authorized user (project owner) - set up mocks before rendering
      const { useProjectStore } = require("@/store");
      const { useOwnerStore } = require("@/store");
      const { useCommunityAdminStore } = require("@/store/communityAdmin");

      // Override mocks for this test with proper selector handling
      // Component uses: useProjectStore((state) => state.isProjectAdmin)
      // So selector(state) should return true for isProjectAdmin or isProjectOwner
      useProjectStore.mockImplementation((selector?: any) => {
        if (!selector) {
          return {
            refreshProject: vi.fn(),
            isProjectOwner: true,
            isProjectAdmin: false,
          };
        }
        if (typeof selector === "function") {
          const state = {
            refreshProject: vi.fn(),
            isProjectOwner: true,
            isProjectAdmin: false,
          };
          // Execute the selector function with the state
          return selector(state);
        }
        return {
          refreshProject: vi.fn(),
          isProjectOwner: true,
          isProjectAdmin: false,
        };
      });

      useOwnerStore.mockImplementation((selector?: any) => {
        const state = { isOwner: true }; // Set to true so component is authorized
        if (!selector) {
          return state;
        }
        if (typeof selector === "function") {
          return selector(state);
        }
        return state;
      });

      useCommunityAdminStore.mockImplementation((selector?: any) => {
        if (!selector) {
          return { isCommunityAdmin: false };
        }
        if (typeof selector === "function") {
          const state = { isCommunityAdmin: false };
          return selector(state);
        }
        return { isCommunityAdmin: false };
      });

      render(<GrantCompleteButton grant={mockGrant} project={mockProject} />);

      // Verify completed button is rendered
      const button = screen.getByRole("button", {
        name: /revoke grant completion/i,
      });
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });

    it("should disable button when user is not authorized", () => {
      // Setup: Unauthorized user - need to set up mocks before rendering
      const { useProjectStore } = require("@/store");
      const { useOwnerStore } = require("@/store");
      const { useCommunityAdminStore } = require("@/store/communityAdmin");

      // Override mocks for this test - all authorization flags should be false
      useProjectStore.mockImplementation((selector?: any) => {
        if (!selector) {
          return {
            refreshProject: vi.fn(),
            isProjectOwner: false,
            isProjectAdmin: false,
          };
        }
        if (typeof selector === "function") {
          const state = {
            refreshProject: vi.fn(),
            isProjectOwner: false,
            isProjectAdmin: false,
          };
          return selector(state);
        }
        return {
          refreshProject: vi.fn(),
          isProjectOwner: false,
          isProjectAdmin: false,
        };
      });

      useOwnerStore.mockImplementation((selector?: any) => {
        const state = { isOwner: false }; // Set to false for unauthorized test
        if (!selector) {
          return state;
        }
        if (typeof selector === "function") {
          return selector(state);
        }
        return state;
      });

      useCommunityAdminStore.mockImplementation((selector?: any) => {
        const state = { isCommunityAdmin: false };
        if (!selector) {
          return state;
        }
        if (typeof selector === "function") {
          return selector(state);
        }
        return state;
      });

      render(<GrantCompleteButton grant={mockGrant} project={mockProject} />);

      // Verify button is disabled (disabled={isRevoking || !isAuthorized})
      // Since isAuthorized is false, button should be disabled
      const button = screen.getByRole("button", {
        name: /revoke grant completion/i,
      });
      expect(button).toBeInTheDocument();
      expect(button).toBeDisabled();
    });

    it("should render GrantNotCompletedButton when grant is not completed and user is authorized", () => {
      // Setup: Authorized user - set up mocks before rendering
      const { useProjectStore } = require("@/store");
      const { useOwnerStore } = require("@/store");
      const { useCommunityAdminStore } = require("@/store/communityAdmin");

      // Override mocks for this test with proper selector handling
      useProjectStore.mockImplementation((selector?: any) => {
        if (!selector) {
          return {
            refreshProject: vi.fn(),
            isProjectOwner: true,
            isProjectAdmin: false,
          };
        }
        if (typeof selector === "function") {
          const state = {
            refreshProject: vi.fn(),
            isProjectOwner: true,
            isProjectAdmin: false,
          };
          return selector(state);
        }
        return {
          refreshProject: vi.fn(),
          isProjectOwner: true,
          isProjectAdmin: false,
        };
      });

      useOwnerStore.mockImplementation((selector?: any) => {
        const state = { isOwner: true }; // Set to true so component is authorized
        if (!selector) {
          return state;
        }
        if (typeof selector === "function") {
          return selector(state);
        }
        return state;
      });

      useCommunityAdminStore.mockImplementation((selector?: any) => {
        if (!selector) {
          return { isCommunityAdmin: false };
        }
        if (typeof selector === "function") {
          const state = { isCommunityAdmin: false };
          return selector(state);
        }
        return { isCommunityAdmin: false };
      });

      // Grant without completion
      const grantWithoutCompletion = {
        ...mockGrant,
        completed: null,
      };

      render(<GrantCompleteButton grant={grantWithoutCompletion} project={mockProject} />);

      // Verify not completed link is rendered (links to grant completion page)
      const link = screen.getByRole("link");
      expect(link).toBeInTheDocument();
      expect(link).toHaveTextContent("Mark as Complete");
    });
  });
});
