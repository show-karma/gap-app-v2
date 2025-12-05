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

// Mock dependencies
jest.mock("wagmi", () => ({
  useAccount: jest.fn(),
}));

jest.mock("@/hooks/useWallet", () => ({
  useWallet: jest.fn(() => ({
    switchChainAsync: jest.fn(),
  })),
}));

jest.mock("@/hooks/useGap", () => ({
  useGap: jest.fn(() => ({
    gap: {
      fetch: {
        projectById: jest.fn(),
      },
    },
  })),
}));

jest.mock("@/store/modals/txStepper", () => ({
  useStepper: jest.fn(() => ({
    changeStepperStep: jest.fn(),
    setIsStepper: jest.fn(),
  })),
}));

jest.mock("@/utilities/ensureCorrectChain", () => ({
  ensureCorrectChain: jest.fn(),
}));

jest.mock("@/utilities/wallet-helpers", () => ({
  safeGetWalletClient: jest.fn(),
}));

jest.mock("@/utilities/eas-wagmi-utils", () => ({
  walletClientToSigner: jest.fn(),
}));

jest.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("@/hooks/useOffChainRevoke", () => ({
  useOffChainRevoke: jest.fn(() => ({
    performOffChainRevoke: jest.fn(),
  })),
}));

jest.mock("@/utilities/grantCompletionHelpers", () => ({
  createCheckIfCompletionExists: jest.fn(),
  validateGrantCompletion: jest.fn(),
  buildRevocationPayload: jest.fn(),
}));

jest.mock("@show-karma/karma-gap-sdk", () => ({
  GAP: {
    getMulticall: jest.fn(),
  },
}));

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("@/components/Utilities/errorManager", () => ({
  errorManager: jest.fn(),
}));

jest.mock("@/store/grant", () => ({
  useGrantStore: jest.fn(() => ({
    refreshGrant: jest.fn(),
  })),
}));

jest.mock("@/store", () => ({
  useProjectStore: jest.fn(),
  useOwnerStore: jest.fn(),
}));

jest.mock("@/store/communityAdmin", () => ({
  useCommunityAdminStore: jest.fn(),
}));

// Note: We don't mock useGrantCompletionRevoke here - we want to test the actual hook
// All its dependencies are mocked above

// Mock Spinner component
jest.mock("@/components/ui/spinner", () => ({
  Spinner: ({ className }: { className?: string }) => (
    <div data-testid="spinner" className={className}>
      Loading...
    </div>
  ),
}));

// Mock Heroicons
jest.mock("@heroicons/react/24/outline", () => ({
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
        multiRevoke: jest.fn(),
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
        multiRevoke: jest.fn(),
      },
      revoked: false,
    },
  };

  const mockInstanceProject = {
    grants: [mockGrantInstance],
  };

  const mockMulticallContract = {
    multiRevoke: jest.fn(),
  };

  const mockTransaction = {
    wait: jest.fn(),
  };

  const mockCheckIfCompletionExists = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    const wagmi = require("wagmi");
    wagmi.useAccount.mockReturnValue({ chain: { id: 42161 } });

    const { useStepper } = require("@/store/modals/txStepper");
    const mockChangeStepperStep = jest.fn();
    const mockSetIsStepper = jest.fn();
    useStepper.mockReturnValue({
      changeStepperStep: mockChangeStepperStep,
      setIsStepper: mockSetIsStepper,
    });

    const { useProjectStore } = require("@/store");
    const { useOwnerStore } = require("@/store");
    const { useCommunityAdminStore } = require("@/store/communityAdmin");
    const mockRefreshProject = jest.fn();
    const mockIsProjectOwner = jest.fn(() => false);
    const mockIsOwner = jest.fn(() => false);
    const mockIsProjectAdmin = jest.fn(() => false);
    const mockIsCommunityAdmin = jest.fn(() => false);

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
    const mockRefreshGrant = jest.fn();
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
    const mockPerformOffChainRevoke = jest.fn();
    useOffChainRevoke.mockReturnValue({
      performOffChainRevoke: mockPerformOffChainRevoke,
    });

    const { useGap } = require("@/hooks/useGap");
    const mockGapClient = {
      fetch: {
        projectById: jest.fn().mockResolvedValue(mockInstanceProject),
      },
    };
    useGap.mockReturnValue({ gap: mockGapClient });

    // Setup toast mock - the default export is callable
    const mockToastFn = jest.fn();
    mockToastFn.success = jest.fn();
    mockToastFn.error = jest.fn();
    mockToastFn.loading = jest.fn();
    mockToastFn.dismiss = jest.fn();
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
      const mockIsProjectOwner = jest.fn(() => true);
      const mockRefreshProject = jest.fn();

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

      // Setup: On-chain path mocks
      const { ensureCorrectChain } = require("@/utilities/ensureCorrectChain");
      const mockGapClient = {
        fetch: {
          projectById: jest.fn().mockResolvedValue(mockInstanceProject),
        },
      };
      ensureCorrectChain.mockResolvedValue({
        success: true,
        chainId: 42161,
        gapClient: mockGapClient,
      });

      const { safeGetWalletClient } = require("@/utilities/wallet-helpers");
      safeGetWalletClient.mockResolvedValue({
        walletClient: {},
        error: null,
      });

      const { walletClientToSigner } = require("@/utilities/eas-wagmi-utils");
      walletClientToSigner.mockResolvedValue({});

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

      // Verify stepper was activated
      const { useStepper } = require("@/store/modals/txStepper");
      const stepper = useStepper();
      await waitFor(() => {
        expect(stepper.setIsStepper).toHaveBeenCalledWith(true);
      });

      // Verify on-chain path was taken
      await waitFor(() => {
        expect(ensureCorrectChain).toHaveBeenCalled();
        expect(mockMulticallContract.multiRevoke).toHaveBeenCalled();
      });

      // Verify stepper transitions
      await waitFor(() => {
        expect(stepper.changeStepperStep).toHaveBeenCalledWith("pending");
        expect(stepper.changeStepperStep).toHaveBeenCalledWith("indexing");
      });

      // Verify success toast
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });

      // Verify final state: stepper reset
      await waitFor(() => {
        expect(stepper.setIsStepper).toHaveBeenCalledWith(false);
      });
    });
  });

  describe("2. Complete Off-Chain Revocation Flow", () => {
    it("should complete full off-chain revocation flow for unauthorized user", async () => {
      // Setup: Unauthorized user
      const { useProjectStore } = require("@/store");
      const { useOwnerStore } = require("@/store");
      const { useCommunityAdminStore } = require("@/store/communityAdmin");
      const mockRefreshProject = jest.fn();

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
      const mockPerformOffChainRevoke = jest.fn().mockImplementation(async (options: any) => {
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

      // Verify stepper was used
      const { useStepper } = require("@/store/modals/txStepper");
      const stepper = useStepper();
      await waitFor(() => {
        expect(stepper.setIsStepper).toHaveBeenCalledWith(true);
        expect(stepper.changeStepperStep).toHaveBeenCalledWith("indexed");
        expect(stepper.setIsStepper).toHaveBeenCalledWith(false);
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
      const mockRefreshProject = jest.fn();

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

      // Setup: On-chain fails
      const { ensureCorrectChain } = require("@/utilities/ensureCorrectChain");
      const mockGapClient = {
        fetch: {
          projectById: jest.fn().mockResolvedValue(mockInstanceProject),
        },
      };
      ensureCorrectChain.mockResolvedValue({
        success: true,
        chainId: 42161,
        gapClient: mockGapClient,
      });

      const { safeGetWalletClient } = require("@/utilities/wallet-helpers");
      safeGetWalletClient.mockResolvedValue({
        walletClient: {},
        error: null,
      });

      const { walletClientToSigner } = require("@/utilities/eas-wagmi-utils");
      walletClientToSigner.mockResolvedValue({});

      const { GAP } = require("@show-karma/karma-gap-sdk");
      GAP.getMulticall.mockResolvedValue(mockMulticallContract);
      const onChainError = new Error("On-chain error");
      mockMulticallContract.multiRevoke.mockRejectedValue(onChainError);

      // Setup: Off-chain succeeds
      const { useOffChainRevoke } = require("@/hooks/useOffChainRevoke");
      const mockPerformOffChainRevoke = jest.fn().mockImplementation(async (options: any) => {
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

      // Verify on-chain was attempted
      await waitFor(() => {
        expect(mockMulticallContract.multiRevoke).toHaveBeenCalled();
      });

      // Verify fallback to off-chain
      await waitFor(() => {
        expect(mockPerformOffChainRevoke).toHaveBeenCalled();
      });

      // Verify toast notification about fallback
      // toast() is called directly as default export from react-hot-toast
      // The mock is set up in beforeEach, so we check the mock function directly
      await waitFor(() => {
        // Get the actual toast mock from the module
        const toastModule = require("react-hot-toast");
        const toastMock = toastModule.default;
        expect(toastMock).toHaveBeenCalled();
        const toastCalls = (toastMock as jest.Mock).mock.calls;
        const hasFallbackMessage = toastCalls.some((call: any[]) =>
          call[0]?.includes("On-chain revocation unavailable")
        );
        expect(hasFallbackMessage).toBe(true);
      });

      // Verify stepper transitions
      const { useStepper } = require("@/store/modals/txStepper");
      const stepper = useStepper();
      await waitFor(() => {
        expect(stepper.setIsStepper).toHaveBeenCalledWith(false); // Reset before fallback
        expect(stepper.changeStepperStep).toHaveBeenCalledWith("indexed");
      });
    });
  });

  describe("4. Error Handling Flow", () => {
    it("should handle errors when both paths fail", async () => {
      // Setup: Authorized user
      const { useProjectStore } = require("@/store");
      useProjectStore.mockImplementation(() => ({
        refreshProject: jest.fn(),
        isProjectOwner: true,
        isProjectAdmin: false,
      }));

      // Setup: On-chain fails
      const { ensureCorrectChain } = require("@/utilities/ensureCorrectChain");
      const mockGapClient = {
        fetch: {
          projectById: jest.fn().mockResolvedValue(mockInstanceProject),
        },
      };
      ensureCorrectChain.mockResolvedValue({
        success: true,
        chainId: 42161,
        gapClient: mockGapClient,
      });

      const { safeGetWalletClient } = require("@/utilities/wallet-helpers");
      safeGetWalletClient.mockResolvedValue({
        walletClient: {},
        error: null,
      });

      const { walletClientToSigner } = require("@/utilities/eas-wagmi-utils");
      walletClientToSigner.mockResolvedValue({});

      const { GAP } = require("@show-karma/karma-gap-sdk");
      GAP.getMulticall.mockResolvedValue(mockMulticallContract);
      const onChainError = new Error("On-chain error");
      mockMulticallContract.multiRevoke.mockRejectedValue(onChainError);

      // Setup: Off-chain also fails
      const { useOffChainRevoke } = require("@/hooks/useOffChainRevoke");
      const mockPerformOffChainRevoke = jest.fn().mockResolvedValue(false);
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
        expect(mockMulticallContract.multiRevoke).toHaveBeenCalled();
        expect(mockPerformOffChainRevoke).toHaveBeenCalled();
      });

      // Verify error handling
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("On-chain error");
        expect(errorManager).toHaveBeenCalled();
      });

      // Verify stepper was reset
      const { useStepper } = require("@/store/modals/txStepper");
      const stepper = useStepper();
      await waitFor(() => {
        expect(stepper.setIsStepper).toHaveBeenCalledWith(false);
      });
    });
  });

  describe("5. State Transitions", () => {
    it("should transition through all stepper states during on-chain flow", async () => {
      // Setup: Authorized user
      const { useProjectStore } = require("@/store");
      useProjectStore.mockImplementation(() => ({
        refreshProject: jest.fn(),
        isProjectOwner: true,
        isProjectAdmin: false,
      }));

      // Setup: On-chain path
      const { ensureCorrectChain } = require("@/utilities/ensureCorrectChain");
      const mockGapClient = {
        fetch: {
          projectById: jest.fn().mockResolvedValue(mockInstanceProject),
        },
      };
      ensureCorrectChain.mockResolvedValue({
        success: true,
        chainId: 42161,
        gapClient: mockGapClient,
      });

      const { safeGetWalletClient } = require("@/utilities/wallet-helpers");
      safeGetWalletClient.mockResolvedValue({
        walletClient: {},
        error: null,
      });

      const { walletClientToSigner } = require("@/utilities/eas-wagmi-utils");
      walletClientToSigner.mockResolvedValue({});

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

      const { useStepper } = require("@/store/modals/txStepper");
      const mockChangeStepperStep = jest.fn();
      const mockSetIsStepper = jest.fn();
      useStepper.mockReturnValue({
        changeStepperStep: mockChangeStepperStep,
        setIsStepper: mockSetIsStepper,
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

      // Verify all stepper state transitions
      await waitFor(() => {
        expect(mockSetIsStepper).toHaveBeenCalledWith(true);
        expect(mockChangeStepperStep).toHaveBeenCalledWith("pending");
        expect(mockChangeStepperStep).toHaveBeenCalledWith("indexing");
      });

      // The 'indexed' step is called in the checkIfCompletionExists callback
      // which is invoked asynchronously, so we wait for it separately
      await waitFor(
        () => {
          expect(mockChangeStepperStep).toHaveBeenCalledWith("indexed");
          expect(mockSetIsStepper).toHaveBeenCalledWith(false);
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
            refreshProject: jest.fn(),
            isProjectOwner: true,
            isProjectAdmin: false,
          };
        }
        if (typeof selector === "function") {
          const state = {
            refreshProject: jest.fn(),
            isProjectOwner: true,
            isProjectAdmin: false,
          };
          // Execute the selector function with the state
          return selector(state);
        }
        return {
          refreshProject: jest.fn(),
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
            refreshProject: jest.fn(),
            isProjectOwner: false,
            isProjectAdmin: false,
          };
        }
        if (typeof selector === "function") {
          const state = {
            refreshProject: jest.fn(),
            isProjectOwner: false,
            isProjectAdmin: false,
          };
          return selector(state);
        }
        return {
          refreshProject: jest.fn(),
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
            refreshProject: jest.fn(),
            isProjectOwner: true,
            isProjectAdmin: false,
          };
        }
        if (typeof selector === "function") {
          const state = {
            refreshProject: jest.fn(),
            isProjectOwner: true,
            isProjectAdmin: false,
          };
          return selector(state);
        }
        return {
          refreshProject: jest.fn(),
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

      // Verify not completed button is rendered
      const link = screen.getByRole("link");
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", expect.stringContaining("complete-grant"));
    });
  });
});
