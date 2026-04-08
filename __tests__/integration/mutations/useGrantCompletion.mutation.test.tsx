/**
 * Mutation integration tests for useGrantCompletion hook.
 *
 * This hook orchestrates blockchain attestation via SDK calls, so we mock
 * the SDK and chain setup while testing the hook's state management,
 * error handling, and toast notifications.
 *
 * The hook does NOT use React Query useMutation -- it uses useState for
 * isCompleting and calls SDK methods directly. We verify:
 * - State transitions (isCompleting)
 * - Toast messages (startAttestation, showSuccess, showError)
 * - Error handling for wallet rejection, missing address, and generic errors
 * - onComplete callback invocation
 */

import { act, waitFor } from "@testing-library/react";
import toast from "react-hot-toast";
import { useGrantCompletion } from "@/hooks/useGrantCompletion";
import type { Grant } from "@/types/v2/grant";
import { renderHookWithProviders } from "../../utils/render";

// Mock wagmi
vi.mock("wagmi", () => ({
  useAccount: () => ({
    address: "0x1234567890abcdef1234567890abcdef12345678",
    chain: { id: 10 },
    isConnected: true,
  }),
}));

// Mock useWallet
vi.mock("@/hooks/useWallet", () => ({
  useWallet: () => ({
    switchChainAsync: vi.fn().mockResolvedValue(true),
  }),
}));

// Mock useSetupChainAndWallet
const mockGapClient = {
  fetch: {
    projectById: vi.fn(),
  },
};

const mockWalletSigner = { address: "0x1234" };

vi.mock("@/hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: () => ({
    setupChainAndWallet: vi.fn().mockResolvedValue({
      gapClient: { fetch: { projectById: vi.fn() } },
      walletSigner: { address: "0x1234" },
    }),
  }),
}));

// Mock getSDKGrantInstance -- use a module-level ref accessed via vi.hoisted
const { mockComplete } = vi.hoisted(() => ({
  mockComplete: vi.fn().mockResolvedValue({ tx: [{ hash: "0xTxHash" }] }),
}));

vi.mock("@/utilities/grant-helpers", () => ({
  getSDKGrantInstance: vi.fn().mockResolvedValue({
    complete: mockComplete,
  }),
}));

// Mock notifyIndexerForGrant
vi.mock("@/utilities/indexer-notification", () => ({
  notifyIndexerForGrant: vi.fn().mockResolvedValue(undefined),
}));

// Mock pollForGrantCompletion
vi.mock("@/utilities/attestation-polling", () => ({
  pollForGrantCompletion: vi.fn().mockResolvedValue(undefined),
}));

// Mock sanitizeObject
vi.mock("@/utilities/sanitize", () => ({
  sanitizeObject: vi.fn((obj: any) => obj),
}));

// Mock errorManager
vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

// Mock toast
vi.mock("react-hot-toast", async () => {
  const actual = await vi.importActual<typeof import("react-hot-toast")>("react-hot-toast");
  return {
    ...actual,
    default: {
      ...actual.default,
      success: vi.fn(),
      error: vi.fn(),
      loading: vi.fn().mockReturnValue("toast-id"),
      dismiss: vi.fn(),
    },
  };
});

function createMockGrant(overrides?: Partial<Grant>): Grant {
  return {
    uid: "grant-uid-001",
    chainID: 10,
    projectUID: "project-uid-001",
    communityUID: "community-uid-001",
    amount: "10000",
    createdAt: "2024-06-01T00:00:00Z",
    ...overrides,
  } as Grant;
}

describe("useGrantCompletion (mutation integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockComplete.mockResolvedValue({ tx: [{ hash: "0xTxHash" }] });
  });

  it("starts in idle state", () => {
    const { result } = renderHookWithProviders(() => useGrantCompletion({ onComplete: vi.fn() }));

    expect(result.current.isCompleting).toBe(false);
    expect(typeof result.current.completeGrant).toBe("function");
  });

  it("completes grant successfully and calls onComplete callback", async () => {
    const onComplete = vi.fn();
    const { result } = renderHookWithProviders(() => useGrantCompletion({ onComplete }));

    const grant = createMockGrant();

    await act(async () => {
      await result.current.completeGrant(grant, { uid: "project-uid-001" });
    });

    await waitFor(() => {
      expect(result.current.isCompleting).toBe(false);
    });

    // Verify SDK complete was called
    expect(mockComplete).toHaveBeenCalledWith(
      mockWalletSigner,
      expect.objectContaining({ title: "", text: "" }),
      expect.any(Function) // changeStepperStep callback
    );

    // Verify success toast
    expect(toast.success).toHaveBeenCalled();

    // Verify onComplete was called
    expect(onComplete).toHaveBeenCalled();
  });

  it("shows error when grant is null", async () => {
    const onComplete = vi.fn();
    const { result } = renderHookWithProviders(() => useGrantCompletion({ onComplete }));

    await act(async () => {
      // Passing null grant triggers early return with "Please connect your wallet"
      await result.current.completeGrant(null as any, { uid: "project-uid-001" });
    });

    // The hook checks !address || !project || !grant -- with null grant, shows error
    expect(toast.error).toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("handles user rejection (code 4001) gracefully", async () => {
    mockComplete.mockRejectedValue({
      message: "User rejected the request",
      code: 4001,
    });

    const { result } = renderHookWithProviders(() => useGrantCompletion({ onComplete: vi.fn() }));

    await act(async () => {
      await result.current.completeGrant(createMockGrant(), { uid: "project-uid-001" });
    });

    await waitFor(() => {
      expect(result.current.isCompleting).toBe(false);
    });

    expect(toast.error).toHaveBeenCalledWith("Grant completion cancelled", expect.any(Object));
  });

  it("handles generic errors", async () => {
    mockComplete.mockRejectedValue(new Error("Network error"));

    const onComplete = vi.fn();
    const { result } = renderHookWithProviders(() => useGrantCompletion({ onComplete }));

    await act(async () => {
      await result.current.completeGrant(createMockGrant(), { uid: "project-uid-001" });
    });

    await waitFor(() => {
      expect(result.current.isCompleting).toBe(false);
    });

    // Should show error toast (not the "cancelled" message)
    expect(toast.error).toHaveBeenCalled();
    const errorCall = vi.mocked(toast.error).mock.calls[0];
    expect(errorCall[0]).not.toBe("Grant completion cancelled");

    // onComplete should NOT be called on error
    expect(onComplete).not.toHaveBeenCalled();
  });
});
