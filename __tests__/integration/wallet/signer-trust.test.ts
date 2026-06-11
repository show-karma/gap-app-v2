/**
 * Signer trust regression tests for useZeroDevSigner (issue #1574, #1573).
 *
 * The bug class: an email/Google/Farcaster user (embedded signing mode) with a
 * stale, UNLINKED external wallet connected (a lingering MetaMask from a previous
 * session) had the attestation signer fall through to that foreign wallet —
 * prompting a signature for someone else's account.
 *
 * These tests render the REAL hook and assert the foreign wallet's
 * getEthereumProvider is NEVER invoked for embedded-mode users, and that the
 * failure surfaces as an explicit, retryable error instead.
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrivyState, mockUseChainId } = vi.hoisted(() => ({
  mockPrivyState: {
    ready: true as boolean,
    user: null as { linkedAccounts: Array<{ type: string; address?: string }> } | null,
    wallets: [] as Array<{
      address: string;
      walletClientType: string;
      switchChain: ReturnType<typeof vi.fn>;
      getEthereumProvider: ReturnType<typeof vi.fn>;
    }>,
  },
  mockUseChainId: vi.fn().mockReturnValue(10),
}));

vi.mock("wagmi", () => ({ useChainId: () => mockUseChainId() }));

vi.mock("@/contexts/privy-bridge-context", () => ({
  usePrivyBridge: () => ({
    ready: mockPrivyState.ready,
    user: mockPrivyState.user,
    wallets: mockPrivyState.wallets,
  }),
}));

vi.mock("@/utilities/wallet-helpers", () => ({
  safeGetWalletClient: vi.fn().mockResolvedValue({ walletClient: null, error: "not used" }),
}));

vi.mock("@/utilities/eas-wagmi-utils", () => ({
  walletClientToSigner: vi.fn().mockResolvedValue({ getAddress: vi.fn() }),
}));

vi.mock("@/utilities/network", () => ({
  appNetwork: [{ id: 10, name: "Optimism" }],
}));

vi.mock("viem", () => ({
  createWalletClient: vi.fn(() => ({})),
  custom: vi.fn((provider: unknown) => provider),
}));

vi.mock("ethers", () => ({
  BrowserProvider: class {
    getNetwork = async () => ({ chainId: 10n });
    getSigner = async () => ({ getAddress: vi.fn() });
  },
  Signer: class {},
}));

// gasless is resolved to the __mocks__ stub via the vitest alias.
import {
  createGaslessClient,
  createPrivySignerForGasless,
  getGaslessSigner,
  isChainSupportedForGasless,
} from "@/utilities/gasless";
import { EmbeddedWalletNotReadyError, useZeroDevSigner } from "../../../hooks/useZeroDevSigner";

const EMBEDDED = "0xEmbedded1111111111111111111111111111111111";
const FOREIGN_METAMASK = "0x9b75AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

function foreignMetaMask() {
  return {
    address: FOREIGN_METAMASK,
    walletClientType: "metamask",
    switchChain: vi.fn().mockResolvedValue(undefined),
    getEthereumProvider: vi.fn().mockResolvedValue({ request: vi.fn() }),
  };
}

function embeddedWallet(address = EMBEDDED) {
  return {
    address,
    walletClientType: "privy",
    switchChain: vi.fn().mockResolvedValue(undefined),
    getEthereumProvider: vi.fn().mockResolvedValue({ request: vi.fn(), __chainId: 10 }),
  };
}

describe("useZeroDevSigner — linked-wallet signing trust (issue #1574)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrivyState.ready = true;
    mockPrivyState.user = null;
    mockPrivyState.wallets = [];
    mockUseChainId.mockReturnValue(10);
    (isChainSupportedForGasless as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (createGaslessClient as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (createPrivySignerForGasless as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (getGaslessSigner as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("email user + stale unlinked MetaMask, embedded not hydrated: throws EmbeddedWalletNotReadyError and never touches the foreign wallet", async () => {
    const foreign = foreignMetaMask();
    mockPrivyState.user = { linkedAccounts: [{ type: "email" }] };
    mockPrivyState.wallets = [foreign];

    const { result } = renderHook(() => useZeroDevSigner());

    // The foreign address must never be exposed as the attestation identity.
    expect(result.current.attestationAddress).toBeNull();
    expect(result.current.hasExternalWallet).toBe(false);

    await act(async () => {
      await expect(result.current.getAttestationSigner(10)).rejects.toBeInstanceOf(
        EmbeddedWalletNotReadyError
      );
    });

    // The regression guard: the foreign wallet's provider is NEVER requested.
    expect(foreign.getEthereumProvider).not.toHaveBeenCalled();
    expect(foreign.switchChain).not.toHaveBeenCalled();
  });

  it("email user + embedded present + stale MetaMask: embedded-direct failure throws, external path never reached", async () => {
    const foreign = foreignMetaMask();
    const embedded = embeddedWallet();
    // Force the embedded-direct path to fail.
    embedded.getEthereumProvider = vi.fn().mockRejectedValue(new Error("embedded provider down"));
    mockPrivyState.user = {
      linkedAccounts: [{ type: "email" }, { type: "wallet", address: EMBEDDED }],
    };
    mockPrivyState.wallets = [foreign, embedded];

    const { result } = renderHook(() => useZeroDevSigner());

    expect(result.current.attestationAddress).toBe(EMBEDDED);

    await act(async () => {
      await expect(result.current.getAttestationSigner(10)).rejects.toThrow(
        /Failed to obtain signer from embedded wallet/
      );
    });

    // The foreign external wallet must never be used to sign.
    expect(foreign.getEthereumProvider).not.toHaveBeenCalled();
  });

  it("wallet-login user with a LINKED external wallet: external path is used (unchanged)", async () => {
    const linked = {
      address: FOREIGN_METAMASK,
      walletClientType: "metamask",
      switchChain: vi.fn().mockResolvedValue(undefined),
      getEthereumProvider: vi.fn().mockResolvedValue({ request: vi.fn() }),
    };
    mockPrivyState.user = {
      linkedAccounts: [{ type: "wallet", address: FOREIGN_METAMASK }],
    };
    mockPrivyState.wallets = [linked];

    const { result } = renderHook(() => useZeroDevSigner());

    expect(result.current.attestationAddress).toBe(FOREIGN_METAMASK);

    await act(async () => {
      await result.current.getAttestationSigner(10);
    });

    // The linked external wallet IS used (legitimate wallet-login signing).
    expect(linked.switchChain).toHaveBeenCalledWith(10);
    expect(linked.getEthereumProvider).toHaveBeenCalled();
  });

  it("only an unlinked wallet connected for a wallet-login user: no foreign signing", async () => {
    const foreign = foreignMetaMask();
    mockPrivyState.user = {
      // The user logged in with a DIFFERENT wallet than the one now connected.
      linkedAccounts: [{ type: "wallet", address: EMBEDDED }],
    };
    mockPrivyState.wallets = [foreign];

    const { result } = renderHook(() => useZeroDevSigner());

    expect(result.current.attestationAddress).toBeNull();

    await act(async () => {
      await expect(result.current.getAttestationSigner(10)).rejects.toThrow(
        "No wallet available for signing"
      );
    });

    expect(foreign.getEthereumProvider).not.toHaveBeenCalled();
  });
});
