/**
 * Mutation integration tests for useGrantCompletionRevoke hook.
 *
 * This hook handles grant completion revocation with dual paths:
 * - On-chain: For project/contract owners via multiRevoke contract
 * - Off-chain: Fallback for unauthorized users via API
 *
 * Since the hook relies heavily on blockchain SDK calls and store state,
 * we mock the SDK/store and test:
 * - State transitions (isRevoking)
 * - Error handling for missing chain ID, missing completion UID
 * - Toast notifications
 * - Off-chain revocation path when not on-chain authorized
 */

import { act, waitFor } from "@testing-library/react";
import toast from "react-hot-toast";
import { useGrantCompletionRevoke } from "@/hooks/useGrantCompletionRevoke";
import type { Grant } from "@/types/v2/grant";
import type { Project as ProjectResponse } from "@/types/v2/project";
import { renderHookWithProviders } from "../../utils/render";

// Mock wagmi
vi.mock("wagmi", () => ({
  useAccount: () => ({
    address: "0x1234567890abcdef1234567890abcdef12345678",
    chain: { id: 10 },
    isConnected: true,
  }),
}));

vi.mock("@/hooks/useWallet", () => ({
  useWallet: () => ({
    switchChainAsync: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock("@/hooks/useGap", () => ({
  useGap: () => ({ gap: {} }),
}));

vi.mock("@/hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: () => ({
    setupChainAndWallet: vi.fn().mockResolvedValue(null), // Default: setup fails
  }),
}));

const mockPerformOffChainRevoke = vi.fn().mockResolvedValue(true);
vi.mock("@/hooks/useOffChainRevoke", () => ({
  useOffChainRevoke: () => ({
    performOffChainRevoke: mockPerformOffChainRevoke,
  }),
}));

const mockRefetchGrants = vi.fn().mockResolvedValue(undefined);
vi.mock("@/hooks/v2/useProjectGrants", () => ({
  useProjectGrants: () => ({
    refetch: mockRefetchGrants,
  }),
}));

vi.mock("@/store", () => ({
  useProjectStore: () => ({
    isProjectOwner: false,
  }),
  useOwnerStore: () => ({
    isOwner: false,
  }),
}));

vi.mock("@/store/grant", () => ({
  useGrantStore: () => ({
    refreshGrant: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@/utilities/grantCompletionHelpers", () => ({
  buildRevocationPayload: vi.fn(),
  createCheckIfCompletionExists: vi.fn(() => vi.fn()),
  validateGrantCompletion: vi.fn(),
}));

vi.mock("@/utilities/fetchData", () => ({
  default: vi.fn().mockResolvedValue([{}, null]),
}));

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

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
    completed: {
      uid: "0xcompletion-uid-001",
      chainID: 10,
      createdAt: "2024-06-01T00:00:00Z",
      attester: "0xAttester",
      data: { reason: "Grant completed" },
    },
    createdAt: "2024-06-01T00:00:00Z",
    ...overrides,
  } as Grant;
}

function createMockProject(overrides?: Partial<ProjectResponse>): ProjectResponse {
  return {
    uid: "project-uid-001",
    details: {
      slug: "test-project",
      name: "Test Project",
    },
    ...overrides,
  } as ProjectResponse;
}

describe("useGrantCompletionRevoke (mutation integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformOffChainRevoke.mockResolvedValue(true);
  });

  it("starts in idle state", () => {
    const { result } = renderHookWithProviders(() =>
      useGrantCompletionRevoke({
        grant: createMockGrant(),
        project: createMockProject(),
      })
    );

    expect(result.current.isRevoking).toBe(false);
    expect(typeof result.current.revokeCompletion).toBe("function");
  });

  it("does nothing when grant is not completed", async () => {
    const { result } = renderHookWithProviders(() =>
      useGrantCompletionRevoke({
        grant: createMockGrant({ completed: undefined }),
        project: createMockProject(),
      })
    );

    await act(async () => {
      await result.current.revokeCompletion();
    });

    // Should return early without calling any revocation
    expect(mockPerformOffChainRevoke).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("uses off-chain revocation for non-authorized users", async () => {
    // Default store mock has isProjectOwner=false and isOwner=false
    const grant = createMockGrant();
    const project = createMockProject();

    const { result } = renderHookWithProviders(() => useGrantCompletionRevoke({ grant, project }));

    await act(async () => {
      await result.current.revokeCompletion();
    });

    await waitFor(() => {
      expect(result.current.isRevoking).toBe(false);
    });

    // Off-chain revoke should be called
    expect(mockPerformOffChainRevoke).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: "0xcompletion-uid-001",
        chainID: 10,
      })
    );

    // Grants should be refetched
    expect(mockRefetchGrants).toHaveBeenCalled();
  });

  it("shows error when chain ID is missing", async () => {
    const grant = createMockGrant({ chainID: undefined as any });
    const project = createMockProject();

    const { result } = renderHookWithProviders(() => useGrantCompletionRevoke({ grant, project }));

    await act(async () => {
      await result.current.revokeCompletion();
    });

    await waitFor(() => {
      expect(result.current.isRevoking).toBe(false);
    });

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining("Chain ID not found"),
      expect.any(Object)
    );
  });

  it("shows error when completion UID is missing", async () => {
    const grant = createMockGrant({
      completed: {
        uid: "",
        chainID: 10,
        createdAt: "2024-06-01T00:00:00Z",
        attester: "0xAttester",
        data: { reason: "Done" },
      },
    });
    const project = createMockProject();

    const { result } = renderHookWithProviders(() => useGrantCompletionRevoke({ grant, project }));

    await act(async () => {
      await result.current.revokeCompletion();
    });

    await waitFor(() => {
      expect(result.current.isRevoking).toBe(false);
    });

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining("Grant completion UID not found"),
      expect.any(Object)
    );
  });

  it("handles off-chain revocation failure with error toast", async () => {
    mockPerformOffChainRevoke.mockRejectedValue(new Error("Off-chain revocation failed"));

    const { result } = renderHookWithProviders(() =>
      useGrantCompletionRevoke({
        grant: createMockGrant(),
        project: createMockProject(),
      })
    );

    await act(async () => {
      await result.current.revokeCompletion();
    });

    await waitFor(() => {
      expect(result.current.isRevoking).toBe(false);
    });

    expect(toast.error).toHaveBeenCalled();
  });
});
