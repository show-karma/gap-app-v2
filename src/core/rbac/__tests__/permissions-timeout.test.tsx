import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { PermissionProvider } from "../context/permission-context";
import { useStaff } from "../hooks/use-staff-bridge";
import { PERMISSIONS_TIMEOUT_MS } from "../services/authorization.service";

/**
 * REGRESSION: `GET /v2/auth/permissions` had no meaningful deadline, so a
 * request that never completed left `useStaff()` reporting `isLoading: true`
 * forever — and every RBAC-gated surface holding a skeleton behind it.
 *
 * The fix must satisfy both halves of the tri-state rule at once:
 *  1. the gate TERMINATES (`isLoading` goes false), and
 *  2. it terminates CLOSED (`isStaff` stays false, `isError` is raised so the
 *     caller can say so out loud).
 *
 * Asserting only (2) would pass against the buggy code, which also never
 * granted staff — it simply never answered. The two assertions are load-bearing
 * together.
 */

const apiGet = vi.fn();
vi.mock("@/utilities/api/client", () => ({
  api: {
    get: (...args: unknown[]) => apiGet(...args),
  },
}));

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: vi.fn().mockResolvedValue("test-token"), clearCache: vi.fn() },
}));

let bridgeState = { ready: true, authenticated: true };
vi.mock("@/contexts/privy-bridge-context", () => ({
  usePrivyBridge: () => bridgeState,
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: 0 } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <PermissionProvider>{children}</PermissionProvider>
    </QueryClientProvider>
  );
}

async function advancePastAllRetries() {
  await act(async () => {
    // Generous enough to cover the deadline plus any retry backoff, so the test
    // fails on "never settles" rather than on "settled a little later".
    await vi.advanceTimersByTimeAsync(PERMISSIONS_TIMEOUT_MS * 5);
  });
}

describe("permissions fetch that never resolves", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    bridgeState = { ready: true, authenticated: true };
    apiGet.mockReset();
    apiGet.mockImplementation(() => new Promise(() => {}));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("terminates the loading gate instead of hanging forever", async () => {
    const { result } = renderHook(() => useStaff(), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.isLoading).toBe(true);

    await advancePastAllRetries();

    expect(result.current.isLoading).toBe(false);
  });

  it("does not grant staff privileges on a timed-out permissions result", async () => {
    const { result } = renderHook(() => useStaff(), { wrapper });

    await advancePastAllRetries();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isStaff).toBe(false);
    expect(result.current.isError).toBe(true);
  });

  it("stops re-issuing the request once the timeout is final", async () => {
    renderHook(() => useStaff(), { wrapper });

    await advancePastAllRetries();

    // A timeout is not retried: three more 15s waits only extend the freeze.
    expect(apiGet).toHaveBeenCalledTimes(1);
  });
});
