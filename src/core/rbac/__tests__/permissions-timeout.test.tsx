import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { PermissionProvider } from "../context/permission-context";
import { useStaff } from "../hooks/use-staff-bridge";
import {
  authorizationService,
  isPermissionsTimeoutError,
  PERMISSIONS_TIMEOUT_MS,
  PERMISSIONS_TRANSPORT_TIMEOUT_MS,
} from "../services/authorization.service";

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

/**
 * The retry exemption keys off the error TYPE, so the type a stall produces
 * must not depend on which of two timers happens to fire first.
 *
 * Both our deadline and the transport's own timeout are armed against the same
 * request. If they shared a bound they would fire in the same tick and
 * `Promise.race` would pick arbitrarily; when the transport won, the error was
 * an ordinary retryable transport failure and the query retried — turning an
 * intended 15s failure into a ~48s one, still skeleton the whole way. QA saw
 * exactly that: the page never reached the error state within the expected
 * window.
 */
describe("timeout ordering is deterministic", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    apiGet.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("gives the transport a strictly longer bound than the deadline", () => {
    expect(PERMISSIONS_TRANSPORT_TIMEOUT_MS).toBeGreaterThan(PERMISSIONS_TIMEOUT_MS);
  });

  it("passes the transport bound (not the deadline) to the api client", async () => {
    apiGet.mockImplementation(() => new Promise(() => {}));

    const pending = authorizationService.getPermissions().catch((e) => e);
    await vi.advanceTimersByTimeAsync(PERMISSIONS_TIMEOUT_MS + 1);
    await pending;

    expect(apiGet.mock.calls[0]?.[1]).toMatchObject({
      timeoutMs: PERMISSIONS_TRANSPORT_TIMEOUT_MS,
    });
  });

  it("reports a timeout even when the transport rejects first with its own error", async () => {
    // The transport losing the race is the ordering we design for; this covers
    // the inverse, where it rejects (e.g. reacting to our abort) before the
    // deadline's rejection is observed. The outcome must still be a timeout.
    apiGet.mockImplementation(
      (_path: string, opts: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          opts.signal.addEventListener("abort", () => {
            reject(new Error("Network Error"));
          });
        })
    );

    const settled = authorizationService.getPermissions().catch((error) => error);
    await vi.advanceTimersByTimeAsync(PERMISSIONS_TIMEOUT_MS + 1);

    expect(isPermissionsTimeoutError(await settled)).toBe(true);
  });
});
