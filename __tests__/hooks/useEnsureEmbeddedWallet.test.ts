/**
 * @file Tests for useEnsureEmbeddedWallet
 * @description Guards against the duplicate-embedded-wallet bug: a new user must
 * get exactly one embedded wallet even when the Privy provider re-initializes
 * (React Strict Mode, remount, concurrent render). The create decision is based
 * only on LINKED wallets, so a stale connected-but-unlinked wallet (e.g. a
 * lingering MetaMask) does not suppress creation.
 */

import type { User } from "@privy-io/react-auth";
import { renderHook, waitFor } from "@testing-library/react";
import { RETRY_BASE_DELAY_MS, useEnsureEmbeddedWallet } from "@/hooks/useEnsureEmbeddedWallet";

const mockCreateWallet = vi.fn<() => Promise<unknown>>();

vi.mock("@privy-io/react-auth", () => ({
  useCreateWallet: () => ({ createWallet: mockCreateWallet }),
}));

const mockGetLinkedWalletAddresses = vi.fn<() => string[]>();

vi.mock("@/utilities/auth/compare-all-wallets", () => ({
  getLinkedWalletAddresses: () => mockGetLinkedWalletAddresses(),
}));

const mockErrorManager = vi.fn();

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: (...args: unknown[]) => mockErrorManager(...args),
}));

const makeUser = (id: string): User => ({ id }) as User;

describe("useEnsureEmbeddedWallet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateWallet.mockResolvedValue({});
    mockGetLinkedWalletAddresses.mockReturnValue([]);
  });

  it("creates one wallet for a newly authenticated user without wallets", () => {
    renderHook(() => useEnsureEmbeddedWallet(true, true, makeUser("u-new"), 0));

    expect(mockCreateWallet).toHaveBeenCalledTimes(1);
  });

  it("creates only one wallet across re-renders of the same user", () => {
    const { rerender } = renderHook(() =>
      useEnsureEmbeddedWallet(true, true, makeUser("u-rerender"), 0)
    );
    rerender();
    rerender();

    expect(mockCreateWallet).toHaveBeenCalledTimes(1);
  });

  it("creates only one wallet across independent mounts (Strict Mode / remount)", () => {
    const user = makeUser("u-remount");
    // Two separate hook instances sharing the module-level guard, mimicking
    // Strict Mode's double mount and lazy-provider remounts.
    renderHook(() => useEnsureEmbeddedWallet(true, true, user, 0));
    renderHook(() => useEnsureEmbeddedWallet(true, true, user, 0));

    expect(mockCreateWallet).toHaveBeenCalledTimes(1);
  });

  it("does not create a wallet when the user already has a linked wallet", () => {
    mockGetLinkedWalletAddresses.mockReturnValue(["0xabc"]);

    renderHook(() => useEnsureEmbeddedWallet(true, true, makeUser("u-linked"), 1));

    expect(mockCreateWallet).not.toHaveBeenCalled();
  });

  it("still creates a wallet when a stale, unlinked wallet is connected", () => {
    // walletCount > 0 (a lingering MetaMask) but nothing linked to the account.
    mockGetLinkedWalletAddresses.mockReturnValue([]);

    renderHook(() => useEnsureEmbeddedWallet(true, true, makeUser("u-stale-mm"), 1));

    expect(mockCreateWallet).toHaveBeenCalledTimes(1);
  });

  it("does nothing until Privy is ready and authenticated", () => {
    const { rerender } = renderHook(
      ({ ready, auth }: { ready: boolean; auth: boolean }) =>
        useEnsureEmbeddedWallet(ready, auth, makeUser("u-gated"), 0),
      { initialProps: { ready: false, auth: false } }
    );
    expect(mockCreateWallet).not.toHaveBeenCalled();

    rerender({ ready: true, auth: false });
    expect(mockCreateWallet).not.toHaveBeenCalled();

    rerender({ ready: true, auth: true });
    expect(mockCreateWallet).toHaveBeenCalledTimes(1);
  });

  it("retries a transient failure with backoff and succeeds without reporting", async () => {
    vi.useFakeTimers();
    try {
      mockCreateWallet.mockRejectedValueOnce(new Error("network down")).mockResolvedValue({});

      renderHook(() => useEnsureEmbeddedWallet(true, true, makeUser("u-transient"), 0));

      // First attempt rejects, then backoff elapses and the retry succeeds.
      await vi.advanceTimersByTimeAsync(RETRY_BASE_DELAY_MS);

      expect(mockCreateWallet).toHaveBeenCalledTimes(2);
      expect(mockErrorManager).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("reports and releases the slot after exhausting retries", async () => {
    vi.useFakeTimers();
    try {
      mockCreateWallet.mockRejectedValue(new Error("network down"));

      renderHook(() => useEnsureEmbeddedWallet(true, true, makeUser("u-exhaust"), 0));
      await vi.advanceTimersByTimeAsync(10_000);

      expect(mockCreateWallet).toHaveBeenCalledTimes(3);
      expect(mockErrorManager).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }

    // Slot was released — a later mount retries.
    mockCreateWallet.mockReset().mockResolvedValue({});
    renderHook(() => useEnsureEmbeddedWallet(true, true, makeUser("u-exhaust"), 0));
    expect(mockCreateWallet).toHaveBeenCalledTimes(1);
  });

  it("stops immediately and stays silent when the wallet already exists", async () => {
    mockCreateWallet.mockRejectedValueOnce(new Error("embedded_wallet_already_exists"));

    renderHook(() => useEnsureEmbeddedWallet(true, true, makeUser("u-already"), 0));
    await waitFor(() => expect(mockCreateWallet).toHaveBeenCalledTimes(1));

    expect(mockErrorManager).not.toHaveBeenCalled();
    // Slot stays claimed — a later mount of the same user does not retry.
    renderHook(() => useEnsureEmbeddedWallet(true, true, makeUser("u-already"), 0));
    expect(mockCreateWallet).toHaveBeenCalledTimes(1);
  });
});
