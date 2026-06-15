/**
 * @file Tests for useEnsureEmbeddedWallet
 * @description Guards against the duplicate-embedded-wallet bug: a new user must
 * get exactly one embedded wallet. Two creators race — Privy auto-provisions an
 * embedded wallet for email/social signups, and this hook also creates one — so
 * the hook (1) skips when a live embedded wallet already exists, (2) waits for
 * state to settle before creating, re-checking once Privy's wallet has had time
 * to appear, and (3) ignores stale connected-but-unlinked wallets (e.g. a
 * lingering MetaMask) when deciding to create.
 */

import type { User } from "@privy-io/react-auth";
import { renderHook } from "@testing-library/react";
import {
  RETRY_BASE_DELAY_MS,
  SETTLE_BEFORE_CREATE_MS,
  useEnsureEmbeddedWallet,
} from "@/hooks/useEnsureEmbeddedWallet";

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

  it("creates one wallet for a newly authenticated user without wallets", async () => {
    vi.useFakeTimers();
    try {
      renderHook(() => useEnsureEmbeddedWallet(true, true, makeUser("u-new"), 0, false));

      // Nothing happens until the settle window elapses.
      expect(mockCreateWallet).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(SETTLE_BEFORE_CREATE_MS);

      expect(mockCreateWallet).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("creates only one wallet across re-renders of the same user", async () => {
    vi.useFakeTimers();
    try {
      const { rerender } = renderHook(() =>
        useEnsureEmbeddedWallet(true, true, makeUser("u-rerender"), 0, false)
      );
      rerender();
      rerender();
      await vi.advanceTimersByTimeAsync(SETTLE_BEFORE_CREATE_MS);

      expect(mockCreateWallet).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("creates only one wallet across independent mounts (Strict Mode / remount)", async () => {
    vi.useFakeTimers();
    try {
      const user = makeUser("u-remount");
      // Two separate hook instances sharing the module-level guard, mimicking
      // Strict Mode's double mount and lazy-provider remounts.
      renderHook(() => useEnsureEmbeddedWallet(true, true, user, 0, false));
      renderHook(() => useEnsureEmbeddedWallet(true, true, user, 0, false));
      await vi.advanceTimersByTimeAsync(SETTLE_BEFORE_CREATE_MS);

      expect(mockCreateWallet).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not create a wallet when the user already has a linked wallet", async () => {
    vi.useFakeTimers();
    try {
      mockGetLinkedWalletAddresses.mockReturnValue(["0xabc"]);

      renderHook(() => useEnsureEmbeddedWallet(true, true, makeUser("u-linked"), 1, false));
      await vi.advanceTimersByTimeAsync(SETTLE_BEFORE_CREATE_MS);

      expect(mockCreateWallet).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not create a wallet when an embedded wallet already exists", async () => {
    vi.useFakeTimers();
    try {
      // Privy already provisioned an embedded wallet (live in useWallets()).
      renderHook(() => useEnsureEmbeddedWallet(true, true, makeUser("u-has-embedded"), 1, true));
      await vi.advanceTimersByTimeAsync(SETTLE_BEFORE_CREATE_MS);

      expect(mockCreateWallet).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not create when an embedded wallet appears during the settle window", async () => {
    vi.useFakeTimers();
    try {
      // Starts with no embedded wallet → creation is scheduled, then Privy's
      // auto-created wallet appears mid-wait. The deferred check must see it and
      // create nothing — this is the duplicate-embedded-wallet race.
      const { rerender } = renderHook(
        ({ has }: { has: boolean }) =>
          useEnsureEmbeddedWallet(true, true, makeUser("u-race"), 0, has),
        { initialProps: { has: false } }
      );

      await vi.advanceTimersByTimeAsync(SETTLE_BEFORE_CREATE_MS / 2);
      rerender({ has: true });
      await vi.advanceTimersByTimeAsync(SETTLE_BEFORE_CREATE_MS);

      expect(mockCreateWallet).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("still creates a wallet when a stale, unlinked wallet is connected", async () => {
    vi.useFakeTimers();
    try {
      // walletCount > 0 (a lingering MetaMask) but nothing linked and no embedded.
      mockGetLinkedWalletAddresses.mockReturnValue([]);

      renderHook(() => useEnsureEmbeddedWallet(true, true, makeUser("u-stale-mm"), 1, false));
      await vi.advanceTimersByTimeAsync(SETTLE_BEFORE_CREATE_MS);

      expect(mockCreateWallet).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does nothing until Privy is ready and authenticated", async () => {
    vi.useFakeTimers();
    try {
      const { rerender } = renderHook(
        ({ ready, auth }: { ready: boolean; auth: boolean }) =>
          useEnsureEmbeddedWallet(ready, auth, makeUser("u-gated"), 0, false),
        { initialProps: { ready: false, auth: false } }
      );
      await vi.advanceTimersByTimeAsync(SETTLE_BEFORE_CREATE_MS);
      expect(mockCreateWallet).not.toHaveBeenCalled();

      rerender({ ready: true, auth: false });
      await vi.advanceTimersByTimeAsync(SETTLE_BEFORE_CREATE_MS);
      expect(mockCreateWallet).not.toHaveBeenCalled();

      rerender({ ready: true, auth: true });
      await vi.advanceTimersByTimeAsync(SETTLE_BEFORE_CREATE_MS);
      expect(mockCreateWallet).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("retries a transient failure with backoff and succeeds without reporting", async () => {
    vi.useFakeTimers();
    try {
      mockCreateWallet.mockRejectedValueOnce(new Error("network down")).mockResolvedValue({});

      renderHook(() => useEnsureEmbeddedWallet(true, true, makeUser("u-transient"), 0, false));

      // Settle window first, then the first attempt rejects and the retry succeeds.
      await vi.advanceTimersByTimeAsync(SETTLE_BEFORE_CREATE_MS + RETRY_BASE_DELAY_MS);

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

      renderHook(() => useEnsureEmbeddedWallet(true, true, makeUser("u-exhaust"), 0, false));
      await vi.advanceTimersByTimeAsync(SETTLE_BEFORE_CREATE_MS + 10_000);

      expect(mockCreateWallet).toHaveBeenCalledTimes(3);
      expect(mockErrorManager).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }

    // Slot was released — a later mount retries.
    vi.useFakeTimers();
    try {
      mockCreateWallet.mockReset().mockResolvedValue({});
      renderHook(() => useEnsureEmbeddedWallet(true, true, makeUser("u-exhaust"), 0, false));
      await vi.advanceTimersByTimeAsync(SETTLE_BEFORE_CREATE_MS);
      expect(mockCreateWallet).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops and stays silent when createWallet reports the wallet already exists", async () => {
    vi.useFakeTimers();
    try {
      mockCreateWallet.mockRejectedValueOnce(new Error("embedded_wallet_already_exists"));

      renderHook(() => useEnsureEmbeddedWallet(true, true, makeUser("u-already"), 0, false));
      await vi.advanceTimersByTimeAsync(SETTLE_BEFORE_CREATE_MS);
      expect(mockCreateWallet).toHaveBeenCalledTimes(1);
      expect(mockErrorManager).not.toHaveBeenCalled();

      // Slot stays claimed — a later mount of the same user does not retry.
      renderHook(() => useEnsureEmbeddedWallet(true, true, makeUser("u-already"), 0, false));
      await vi.advanceTimersByTimeAsync(SETTLE_BEFORE_CREATE_MS);
      expect(mockCreateWallet).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
