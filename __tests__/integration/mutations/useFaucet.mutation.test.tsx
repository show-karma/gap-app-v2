/**
 * Mutation integration tests for useFaucetClaim hook.
 *
 * Tests the complete faucet claim flow:
 * - Creates a faucet request (POST /v2/faucet/request)
 * - Claims faucet funds (POST /v2/faucet/claim)
 * - Invalidates eligibility, history, and balance caches on success
 * - Shows success/error toasts
 */

import { act } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import toast from "react-hot-toast";
import { useFaucetClaim } from "@/hooks/useFaucet";
import { installMswLifecycle, server } from "../../msw/server";
import { createTestQueryClient, renderHookWithProviders } from "../../utils/render";

// Mock wagmi
vi.mock("wagmi", () => ({
  useAccount: () => ({
    address: "0x1234567890abcdef1234567890abcdef12345678",
    chain: { id: 10 },
    isConnected: true,
  }),
}));

// Mock auth token
vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: vi.fn().mockResolvedValue("test-token") },
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

installMswLifecycle();

const CHAIN_ID = 10;
const TRANSACTION = {
  to: "0xContractAddress",
  data: "0xCallData",
};

describe("useFaucetClaim (mutation integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completes full claim flow: create request then claim", async () => {
    let createRequestCalled = false;
    let claimCalled = false;
    let capturedCreateBody: any = null;
    let capturedClaimBody: any = null;

    server.use(
      http.post("*/v2/faucet/request", async ({ request }) => {
        createRequestCalled = true;
        capturedCreateBody = await request.json();
        return HttpResponse.json({
          requestId: "req-001",
          eligible: true,
          gasUnits: "21000",
          gasPrice: "1000000000",
          totalAmount: "0.000021",
          expiresAt: new Date(Date.now() + 300000).toISOString(),
          faucetAddress: "0xFaucet",
        });
      }),
      http.post("*/v2/faucet/claim", async ({ request }) => {
        claimCalled = true;
        capturedClaimBody = await request.json();
        return HttpResponse.json({
          requestId: "req-001",
          transactionHash: "0xTxHash123",
          status: "CLAIMED",
        });
      })
    );

    const { result } = renderHookWithProviders(() => useFaucetClaim());

    await act(async () => {
      await result.current.claimFaucet(CHAIN_ID, TRANSACTION);
    });

    // Verify create request was called correctly
    expect(createRequestCalled).toBe(true);
    expect(capturedCreateBody).toEqual({
      chainId: CHAIN_ID,
      walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
      transaction: TRANSACTION,
    });

    // Verify claim was called with request ID
    expect(claimCalled).toBe(true);
    expect(capturedClaimBody).toEqual({ requestId: "req-001" });

    // Verify transaction hash is stored
    expect(result.current.transactionHash).toBe("0xTxHash123");

    // Verify success toast
    expect(toast.success).toHaveBeenCalledWith("Funds received successfully!");
  });

  it("invalidates eligibility, history, and balance caches on success", async () => {
    server.use(
      http.post("*/v2/faucet/request", () =>
        HttpResponse.json({
          requestId: "req-002",
          eligible: true,
          gasUnits: "21000",
          gasPrice: "1000000000",
          totalAmount: "0.000021",
          expiresAt: new Date(Date.now() + 300000).toISOString(),
          faucetAddress: "0xFaucet",
        })
      ),
      http.post("*/v2/faucet/claim", () =>
        HttpResponse.json({
          requestId: "req-002",
          transactionHash: "0xTxHash456",
          status: "CLAIMED",
        })
      )
    );

    const queryClient = createTestQueryClient();

    // Pre-populate caches
    queryClient.setQueryData(["faucet", "eligibility", CHAIN_ID], { eligible: true });
    queryClient.setQueryData(["faucet", "history", "0x1234567890abcdef1234567890abcdef12345678"], {
      requests: [],
    });
    queryClient.setQueryData(["faucet", "balance", CHAIN_ID], { balance: "1.0" });

    const { result } = renderHookWithProviders(() => useFaucetClaim(), { queryClient });

    await act(async () => {
      await result.current.claimFaucet(CHAIN_ID, TRANSACTION);
    });

    // After successful claim, caches should be invalidated.
    // With gcTime: 0 and no observers, invalidated queries get garbage collected,
    // so the query state becomes undefined (data is removed).
    const eligibilityState = queryClient.getQueryState(["faucet", "eligibility", CHAIN_ID]);
    const historyState = queryClient.getQueryState([
      "faucet",
      "history",
      "0x1234567890abcdef1234567890abcdef12345678",
    ]);
    const balanceState = queryClient.getQueryState(["faucet", "balance", CHAIN_ID]);

    // Invalidated queries with gcTime:0 get GC'd (undefined) or marked invalidated
    const isInvalidatedOrGCd = (state: any) => state === undefined || state?.isInvalidated === true;

    expect(isInvalidatedOrGCd(eligibilityState)).toBe(true);
    expect(isInvalidatedOrGCd(historyState)).toBe(true);
    expect(isInvalidatedOrGCd(balanceState)).toBe(true);
  });

  it("shows error toast when not eligible", async () => {
    server.use(
      http.post("*/v2/faucet/request", () =>
        HttpResponse.json({
          requestId: "req-003",
          eligible: false,
          faucetAddress: "0xFaucet",
        })
      )
    );

    const { result } = renderHookWithProviders(() => useFaucetClaim());

    // claimFaucet re-throws the error, so we need to catch it
    let thrownError: any;
    await act(async () => {
      try {
        await result.current.claimFaucet(CHAIN_ID, TRANSACTION);
      } catch (err) {
        thrownError = err;
      }
    });

    expect(thrownError).toBeDefined();
    expect(result.current.claimError).toBe("Not eligible for faucet");
    expect(toast.error).toHaveBeenCalledWith("Not eligible for faucet");
  });

  it("shows error toast when claim endpoint fails", async () => {
    server.use(
      http.post("*/v2/faucet/request", () =>
        HttpResponse.json({
          requestId: "req-004",
          eligible: true,
          gasUnits: "21000",
          gasPrice: "1000000000",
          totalAmount: "0.000021",
          expiresAt: new Date(Date.now() + 300000).toISOString(),
          faucetAddress: "0xFaucet",
        })
      ),
      http.post("*/v2/faucet/claim", () =>
        HttpResponse.json({ error: "Insufficient funds" }, { status: 400 })
      )
    );

    const { result } = renderHookWithProviders(() => useFaucetClaim());

    let thrownError: any;
    await act(async () => {
      try {
        await result.current.claimFaucet(CHAIN_ID, TRANSACTION);
      } catch (err) {
        thrownError = err;
      }
    });

    expect(thrownError).toBeDefined();
    expect(result.current.isClaimingFaucet).toBe(false);
    expect(toast.error).toHaveBeenCalled();
  });

  it("resets state via resetFaucetState", () => {
    const { result } = renderHookWithProviders(() => useFaucetClaim());

    act(() => {
      result.current.resetFaucetState();
    });

    expect(result.current.isClaimingFaucet).toBe(false);
    expect(result.current.claimError).toBeNull();
    expect(result.current.transactionHash).toBeNull();
  });
});
