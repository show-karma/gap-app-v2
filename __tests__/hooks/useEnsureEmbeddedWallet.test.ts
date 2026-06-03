/**
 * @file Tests for useEnsureEmbeddedWallet
 * @description Guards against the duplicate-embedded-wallet bug: a new user must
 * get exactly one embedded wallet even when the Privy provider re-initializes
 * (React Strict Mode, remount, concurrent render). The create decision is based
 * only on LINKED wallets, so a stale connected-but-unlinked wallet (e.g. a
 * lingering MetaMask) does not suppress creation.
 */

import type { User } from "@privy-io/react-auth";
import { renderHook } from "@testing-library/react";
import { useEnsureEmbeddedWallet } from "@/hooks/useEnsureEmbeddedWallet";

const mockCreateWallet = vi.fn<() => Promise<unknown>>();

vi.mock("@privy-io/react-auth", () => ({
  useCreateWallet: () => ({ createWallet: mockCreateWallet }),
}));

const mockGetLinkedWalletAddresses = vi.fn<() => string[]>();

vi.mock("@/utilities/auth/compare-all-wallets", () => ({
  getLinkedWalletAddresses: () => mockGetLinkedWalletAddresses(),
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

  it("retries after a transient failure but not after an already-exists error", async () => {
    mockCreateWallet.mockRejectedValueOnce(new Error("network down"));

    const transient = renderHook(() =>
      useEnsureEmbeddedWallet(true, true, makeUser("u-transient"), 0)
    );
    await Promise.resolve();
    transient.unmount();

    // Slot was released — a later mount retries.
    renderHook(() => useEnsureEmbeddedWallet(true, true, makeUser("u-transient"), 0));
    expect(mockCreateWallet).toHaveBeenCalledTimes(2);

    mockCreateWallet.mockRejectedValueOnce(new Error("embedded_wallet_already_exists"));
    const exists = renderHook(() => useEnsureEmbeddedWallet(true, true, makeUser("u-exists"), 0));
    await Promise.resolve();
    exists.unmount();

    // Slot stays claimed — no retry for an already-existing wallet.
    renderHook(() => useEnsureEmbeddedWallet(true, true, makeUser("u-exists"), 0));
    expect(mockCreateWallet).toHaveBeenCalledTimes(3);
  });
});
