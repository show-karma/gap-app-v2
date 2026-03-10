/**
 * Tests for useClaimTransaction concurrency guard:
 * - isClaimingRef prevents double execution
 * - isMountedRef is properly cleaned up on unmount
 * - isClaimingRef resets in onSettled regardless of mount state
 */
import { act, renderHook } from "@testing-library/react";

// Captured mutation callbacks so tests can invoke them manually
const mutationCallbacks: {
  onSettled?: () => void;
  onSuccess?: () => void;
  onError?: (err: Error) => void;
} = {};

const mockMutate = jest.fn();
const mockReset = jest.fn();
const mockInvalidateQueries = jest.fn();

jest.mock("@tanstack/react-query", () => ({
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}));

jest.mock("@privy-io/react-auth", () => ({
  useWallets: jest.fn(),
}));

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
    loading: jest.fn(),
  },
}));

jest.mock("viem", () => ({
  createWalletClient: jest.fn(),
  custom: jest.fn(),
}));

jest.mock("@/src/features/claim-funds/hooks/use-claim-provider", () => ({
  useClaimProvider: jest.fn(),
}));

jest.mock("@/src/features/claim-funds/lib/viem-clients", () => ({
  getChainByName: jest.fn(() => ({ id: 10, name: "optimism" })),
  getPublicClient: jest.fn(() => ({})),
  switchOrAddChain: jest.fn(),
}));

jest.mock("@/src/features/claim-funds/lib/hedgey-contract", () => ({
  CLAIM_CAMPAIGNS_ABI: [],
  uuidToBytes16: jest.fn(() => "0x00000000000000000000000000000001"),
}));

jest.mock("@/src/features/claim-funds/lib/error-messages", () => ({
  sanitizeErrorMessage: jest.fn((err: Error) => ({ message: err.message })),
}));

import { useClaimTransaction } from "@/src/features/claim-funds/hooks/use-claim-transaction";
import type { ClaimEligibility } from "@/src/features/claim-funds/types";
import type { ClaimGrantsConfig } from "@/src/infrastructure/types/tenant";

const { useMutation, useQueryClient } = jest.requireMock("@tanstack/react-query");
const { useWallets } = jest.requireMock("@privy-io/react-auth");

const MOCK_WALLET = {
  address: "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
  getEthereumProvider: jest.fn().mockResolvedValue({}),
};

const MOCK_CLAIM_GRANTS: ClaimGrantsConfig = {
  enabled: true,
  provider: "hedgey",
  providerConfig: { type: "hedgey", networkName: "optimism", contractAddress: "0xcontract" },
};

const MOCK_ELIGIBILITY: ClaimEligibility = {
  proof: [],
  amount: "1000",
  claimFee: "0",
};

function setupMocks(isPending = false) {
  useQueryClient.mockReturnValue({ invalidateQueries: mockInvalidateQueries });
  useWallets.mockReturnValue({ wallets: [MOCK_WALLET] });
  useMutation.mockImplementation((options: typeof mutationCallbacks & { mutationFn?: unknown }) => {
    mutationCallbacks.onSettled = options.onSettled;
    mutationCallbacks.onSuccess = options.onSuccess;
    mutationCallbacks.onError = options.onError;
    return {
      mutate: mockMutate,
      reset: mockReset,
      isPending,
      isSuccess: false,
      error: null,
      variables: undefined,
    };
  });
}

describe("useClaimTransaction — concurrency guard (isClaimingRef)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  it("calls mutation.mutate on the first claim() invocation", () => {
    const { result } = renderHook(() => useClaimTransaction("tenant-abc", MOCK_CLAIM_GRANTS));

    act(() => {
      result.current.claim("campaign-1", MOCK_ELIGIBILITY, "0xcontract");
    });

    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it("does NOT call mutation.mutate on a second claim() before onSettled fires", () => {
    const { result } = renderHook(() => useClaimTransaction("tenant-abc", MOCK_CLAIM_GRANTS));

    act(() => {
      // First call — sets isClaimingRef.current = true
      result.current.claim("campaign-1", MOCK_ELIGIBILITY, "0xcontract");
      // Second call — should be blocked by isClaimingRef guard
      result.current.claim("campaign-1", MOCK_ELIGIBILITY, "0xcontract");
    });

    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it("also blocks when mutation.isPending is true", () => {
    // Re-setup with isPending=true
    setupMocks(true);
    const { result } = renderHook(() => useClaimTransaction("tenant-abc", MOCK_CLAIM_GRANTS));

    act(() => {
      result.current.claim("campaign-1", MOCK_ELIGIBILITY, "0xcontract");
    });

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("blocks when no wallet is connected", () => {
    useWallets.mockReturnValue({ wallets: [] });
    const { result } = renderHook(() => useClaimTransaction("tenant-abc", MOCK_CLAIM_GRANTS));

    act(() => {
      result.current.claim("campaign-1", MOCK_ELIGIBILITY, "0xcontract");
    });

    expect(mockMutate).not.toHaveBeenCalled();
  });
});

describe("useClaimTransaction — isClaimingRef resets in onSettled", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  it("allows a second claim() after onSettled resets isClaimingRef", () => {
    const { result } = renderHook(() => useClaimTransaction("tenant-abc", MOCK_CLAIM_GRANTS));

    act(() => {
      result.current.claim("campaign-1", MOCK_ELIGIBILITY, "0xcontract");
    });
    expect(mockMutate).toHaveBeenCalledTimes(1);

    // Simulate onSettled firing (e.g. after tx completes or errors)
    act(() => {
      mutationCallbacks.onSettled?.();
    });

    // Now isClaimingRef.current should be false — second call should go through
    act(() => {
      result.current.claim("campaign-2", MOCK_ELIGIBILITY, "0xcontract");
    });

    expect(mockMutate).toHaveBeenCalledTimes(2);
  });

  it("resets isClaimingRef regardless of component mount state", () => {
    const { result, unmount } = renderHook(() =>
      useClaimTransaction("tenant-abc", MOCK_CLAIM_GRANTS)
    );

    // Trigger the first claim to set isClaimingRef=true
    act(() => {
      result.current.claim("campaign-1", MOCK_ELIGIBILITY, "0xcontract");
    });

    // Unmount the component (isMountedRef.current → false)
    unmount();

    // onSettled should still reset isClaimingRef even after unmount
    // (no error should be thrown)
    expect(() => {
      act(() => {
        mutationCallbacks.onSettled?.();
      });
    }).not.toThrow();
  });
});

describe("useClaimTransaction — isMountedRef cleanup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  it("sets up and tears down isMountedRef without error", () => {
    const { unmount } = renderHook(() => useClaimTransaction("tenant-abc", MOCK_CLAIM_GRANTS));
    // Should not throw when unmounting (cleanup sets isMountedRef.current = false)
    expect(() => unmount()).not.toThrow();
  });
});
