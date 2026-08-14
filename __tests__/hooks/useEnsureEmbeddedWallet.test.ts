/**
 * @file Tests for useEnsureEmbeddedWallet
 * @description Guards against the duplicate-embedded-wallet bug: a new user must
 * get exactly one embedded wallet.
 *
 * The second creator is NOT Privy. Both the dashboard and the client config say
 * `create_on_login: "off"` (verified 2026-07-22), so Privy auto-provisioning —
 * the hypothesis this file used to describe — cannot be the source. The real
 * one is our own backend: `privyAuth` runs `getIdentityFromJWT` on every
 * authenticated request, and that path calls `privy.createWallets()` for any
 * social-login user without a wallet. A new signup's first API call mints a
 * wallet server-side while this hook is still settling.
 *
 * So the hook (1) skips when a live embedded wallet exists, (2) settles before
 * creating, (3) asks Privy's SERVER as the last word — client `useWallets()`
 * cannot see an out-of-band creation — (4) holds a claim that survives the OAuth
 * redirect and is shared across tabs, and (5) ignores stale connected-but-
 * unlinked wallets (a lingering MetaMask) when deciding to create.
 */

import type { User } from "@privy-io/react-auth";
import { renderHook } from "@testing-library/react";
import {
  CLAIM_TTL_MS,
  embeddedWalletClaimKey,
  RETRY_BASE_DELAY_MS,
  resetInMemoryClaimsForTest,
  SETTLE_BEFORE_CREATE_MS,
  useEnsureEmbeddedWallet,
} from "@/hooks/useEnsureEmbeddedWallet";

const mockCreateWallet = vi.fn<() => Promise<unknown>>();
const mockRefreshUser = vi.fn<() => Promise<User>>();

vi.mock("@privy-io/react-auth", () => ({
  useCreateWallet: () => ({ createWallet: mockCreateWallet }),
  useUser: () => ({ user: null, refreshUser: mockRefreshUser }),
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

/** A Privy user as the SERVER sees it, carrying an embedded wallet. */
const makeUserWithEmbeddedWallet = (id: string): User =>
  ({
    id,
    linkedAccounts: [
      {
        type: "wallet",
        address: "0xserverCreated",
        walletClientType: "privy",
        connectorType: "embedded",
      },
    ],
  }) as unknown as User;

describe("useEnsureEmbeddedWallet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateWallet.mockResolvedValue({});
    mockGetLinkedWalletAddresses.mockReturnValue([]);
    mockRefreshUser.mockImplementation(async () => makeUser("u-refreshed"));
    window.localStorage.clear();
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

  /**
   * The duplicate that survived the settle-window fix. Verified against the
   * Privy population on 2026-07-22: 27 accounts got a second embedded wallet
   * after the fix shipped, four of them in the last week, with the two wallets
   * created 0-2s apart.
   *
   * The second creator is not Privy — the dashboard and client config both say
   * `create_on_login: "off"`. It is our own BACKEND: `privyAuth` middleware runs
   * `getIdentityFromJWT` on EVERY authenticated request, and that helper calls
   * `privy.createWallets()` when a social-login user has no wallet yet. A new
   * signup's first API call therefore mints a wallet server-side while this
   * hook is still inside its settle window.
   *
   * The settle re-check could never catch it: it reads client-side
   * `useWallets()` state, which knows nothing about a wallet created
   * out-of-band on the server. Only asking Privy's server closes it.
   */
  it("does not create when the server already made a wallet during the settle window", async () => {
    vi.useFakeTimers();
    try {
      // Client state stays empty for the whole window — exactly the production
      // shape, since a server-side creation never appears in useWallets().
      mockRefreshUser.mockResolvedValue(makeUserWithEmbeddedWallet("u-server-made"));

      renderHook(() => useEnsureEmbeddedWallet(true, true, makeUser("u-server-made"), 0, false));
      await vi.advanceTimersByTimeAsync(SETTLE_BEFORE_CREATE_MS);

      expect(mockCreateWallet).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("consults the server before creating, not just local wallet state", async () => {
    vi.useFakeTimers();
    try {
      renderHook(() => useEnsureEmbeddedWallet(true, true, makeUser("u-asks"), 0, false));
      await vi.advanceTimersByTimeAsync(SETTLE_BEFORE_CREATE_MS);

      expect(mockRefreshUser).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("still creates when the server confirms there is no wallet", async () => {
    vi.useFakeTimers();
    try {
      mockRefreshUser.mockResolvedValue(makeUser("u-genuinely-empty"));

      renderHook(() =>
        useEnsureEmbeddedWallet(true, true, makeUser("u-genuinely-empty"), 0, false)
      );
      await vi.advanceTimersByTimeAsync(SETTLE_BEFORE_CREATE_MS);

      expect(mockCreateWallet).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("creates anyway when the server cannot be reached", async () => {
    vi.useFakeTimers();
    try {
      // Fail open: a user who genuinely has no wallet must still get one, or
      // they cannot transact at all. The server check is a duplicate guard, not
      // a gate.
      mockRefreshUser.mockRejectedValue(new Error("network"));

      renderHook(() => useEnsureEmbeddedWallet(true, true, makeUser("u-refresh-fails"), 0, false));
      await vi.advanceTimersByTimeAsync(SETTLE_BEFORE_CREATE_MS);

      expect(mockCreateWallet).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  /**
   * The in-memory Set cannot survive Google's OAuth redirect, which reloads the
   * page. A durable claim is what stops the post-redirect context from starting
   * a second creation for a user whose first attempt is already in flight.
   */
  it("does not create again after a reload wipes the in-memory guard", async () => {
    vi.useFakeTimers();
    try {
      const { unmount } = renderHook(() =>
        useEnsureEmbeddedWallet(true, true, makeUser("u-reload"), 0, false)
      );
      await vi.advanceTimersByTimeAsync(SETTLE_BEFORE_CREATE_MS);
      expect(mockCreateWallet).toHaveBeenCalledTimes(1);
      unmount();

      // Simulate the reload: the module-level Set is gone, localStorage is not.
      resetInMemoryClaimsForTest();

      renderHook(() => useEnsureEmbeddedWallet(true, true, makeUser("u-reload"), 0, false));
      await vi.advanceTimersByTimeAsync(SETTLE_BEFORE_CREATE_MS);

      expect(mockCreateWallet).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("allows a fresh attempt once the durable claim has expired", async () => {
    vi.useFakeTimers();
    try {
      // A claim that outlived its window must not lock a walletless user out
      // forever — e.g. the tab closed mid-creation and the wallet never landed.
      window.localStorage.setItem(
        embeddedWalletClaimKey("u-stale"),
        String(Date.now() - CLAIM_TTL_MS - 1)
      );

      renderHook(() => useEnsureEmbeddedWallet(true, true, makeUser("u-stale"), 0, false));
      await vi.advanceTimersByTimeAsync(SETTLE_BEFORE_CREATE_MS);

      expect(mockCreateWallet).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("still creates when localStorage is unavailable", async () => {
    vi.useFakeTimers();
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("private mode");
    });
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("private mode");
    });
    try {
      renderHook(() => useEnsureEmbeddedWallet(true, true, makeUser("u-no-storage"), 0, false));
      await vi.advanceTimersByTimeAsync(SETTLE_BEFORE_CREATE_MS);

      expect(mockCreateWallet).toHaveBeenCalledTimes(1);
    } finally {
      getItem.mockRestore();
      setItem.mockRestore();
      vi.useRealTimers();
    }
  });

  it("does not create when a wallet becomes linked during the settle window", async () => {
    vi.useFakeTimers();
    try {
      // No linked wallet at schedule time, but one links mid-settle (e.g. the
      // freshly created wallet finishes linking). The post-settle linked check
      // must suppress creation.
      mockGetLinkedWalletAddresses.mockReturnValue([]);
      renderHook(() => useEnsureEmbeddedWallet(true, true, makeUser("u-link-mid"), 0, false));

      await vi.advanceTimersByTimeAsync(SETTLE_BEFORE_CREATE_MS / 2);
      mockGetLinkedWalletAddresses.mockReturnValue(["0xabc"]);
      await vi.advanceTimersByTimeAsync(SETTLE_BEFORE_CREATE_MS);

      expect(mockCreateWallet).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not create when the user logs out during the settle window", async () => {
    vi.useFakeTimers();
    try {
      // Creation is scheduled, then the user logs out (user → null) before the
      // settle elapses. A stale timer must NOT create a wallet for the dead session.
      const { rerender } = renderHook(
        ({ user }: { user: User | null }) => useEnsureEmbeddedWallet(true, true, user, 0, false),
        { initialProps: { user: makeUser("u-logout") as User | null } }
      );

      await vi.advanceTimersByTimeAsync(SETTLE_BEFORE_CREATE_MS / 2);
      rerender({ user: null });
      await vi.advanceTimersByTimeAsync(SETTLE_BEFORE_CREATE_MS);

      expect(mockCreateWallet).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not create for the original user when a different user logs in mid-settle", async () => {
    vi.useFakeTimers();
    try {
      const { rerender } = renderHook(
        ({ user }: { user: User | null }) => useEnsureEmbeddedWallet(true, true, user, 0, false),
        { initialProps: { user: makeUser("u-first") as User | null } }
      );

      await vi.advanceTimersByTimeAsync(SETTLE_BEFORE_CREATE_MS / 2);
      // A different user is now active — the original user's timer must abort.
      rerender({ user: makeUser("u-second") });
      await vi.advanceTimersByTimeAsync(SETTLE_BEFORE_CREATE_MS * 2);

      // u-second has no wallet and its own settle elapses → exactly one creation,
      // and never for the abandoned u-first session.
      expect(mockCreateWallet).toHaveBeenCalledTimes(1);
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

  it("stops and stays silent when Privy throws the structured already-exists code", async () => {
    vi.useFakeTimers();
    try {
      const err = Object.assign(new Error("Some opaque message"), {
        code: "embedded_wallet_already_exists",
      });
      mockCreateWallet.mockRejectedValueOnce(err);

      renderHook(() => useEnsureEmbeddedWallet(true, true, makeUser("u-code"), 0, false));
      await vi.advanceTimersByTimeAsync(SETTLE_BEFORE_CREATE_MS);

      expect(mockCreateWallet).toHaveBeenCalledTimes(1);
      expect(mockErrorManager).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops and stays silent on the human-readable already-exists message (production shape)", async () => {
    vi.useFakeTimers();
    try {
      mockCreateWallet.mockRejectedValueOnce(new Error("User already has an embedded wallet."));

      renderHook(() => useEnsureEmbeddedWallet(true, true, makeUser("u-human"), 0, false));
      await vi.advanceTimersByTimeAsync(SETTLE_BEFORE_CREATE_MS);

      expect(mockCreateWallet).toHaveBeenCalledTimes(1);
      expect(mockErrorManager).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
