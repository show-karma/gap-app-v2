/**
 * @file Chain-switch tests for useZeroDevSigner — split from useZeroDevSigner-real.test.ts
 * to keep each test file under the 800-line budget (quality-limits.json).
 *
 * Covers `switchEmbeddedWalletChain`: the GAP-FRONTEND-1T9 "still on chain 1"
 * regression and the switch-confirmation polling that replaced it. The wallet +
 * ethers mocks model an actual chain identity and the Privy `switchChain`
 * propagation race (see zerodev-signer-test-utils.ts).
 */

import { act, renderHook } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Hoisted mock variables
// ---------------------------------------------------------------------------

const {
  mockUseChainId,
  mockPrivyState,
  mockSafeGetWalletClient,
  mockWalletClientToSigner,
  mockGetSigner,
} = vi.hoisted(() => ({
  mockUseChainId: vi.fn().mockReturnValue(10),
  mockPrivyState: {
    ready: true as boolean,
    user: null as MockUser | null,
    wallets: [] as MockWallet[],
  },
  mockSafeGetWalletClient: vi.fn(),
  mockWalletClientToSigner: vi.fn(),
  // Receives the BrowserProvider instance so the returned signer's `.provider`
  // reflects the underlying chain — exactly what the production guard reads.
  mockGetSigner: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Module mocks (mirror the real-hook suite so the hook's deps resolve)
// ---------------------------------------------------------------------------

vi.mock("wagmi", () => ({
  useChainId: () => mockUseChainId(),
}));

vi.mock("@/contexts/privy-bridge-context", () => ({
  usePrivyBridge: vi.fn(() => ({
    ready: mockPrivyState.ready,
    user: mockPrivyState.user,
    wallets: mockPrivyState.wallets,
  })),
}));

vi.mock("@/utilities/wallet-helpers", () => ({
  safeGetWalletClient: (...args: unknown[]) => mockSafeGetWalletClient(...args),
}));

vi.mock("@/utilities/eas-wagmi-utils", () => ({
  walletClientToSigner: (...args: unknown[]) => mockWalletClientToSigner(...args),
}));

vi.mock("@/utilities/network", () => ({
  appNetwork: [
    { id: 10, name: "Optimism" },
    { id: 42161, name: "Arbitrum" },
    { id: 999, name: "Testnet" },
  ],
}));

const mockViemCreateWalletClient = vi.fn();
vi.mock("viem", () => ({
  createWalletClient: (...args: unknown[]) => mockViemCreateWalletClient(...args),
  custom: vi.fn((provider: unknown) => provider),
}));

// Chain-aware ethers BrowserProvider mock. `getNetwork()` returns the pinned
// network when supplied, otherwise reflects the underlying provider's `__chainId`.
vi.mock("ethers", () => ({
  BrowserProvider: class MockBrowserProvider {
    _underlying: { __chainId?: number } | undefined;
    _pinnedChainId: number | undefined;

    constructor(underlying?: { __chainId?: number }, network?: { chainId?: number }) {
      this._underlying = underlying;
      this._pinnedChainId = network?.chainId;
    }

    getNetwork = async () => {
      const chainId = this._pinnedChainId ?? this._underlying?.__chainId ?? 1;
      return { chainId: BigInt(chainId) };
    };

    getSigner = async () => mockGetSigner(this);
  },
}));

// Gasless utilities are mocked via vitest alias (unitTestMockAliases); imported to configure.
import {
  createGaslessClient,
  createPrivySignerForGasless,
  getGaslessSigner,
  isChainSupportedForGasless,
} from "@/utilities/gasless";

// Import the REAL hook via relative path to bypass the @/ alias mock.
import { useZeroDevSigner } from "../../../hooks/useZeroDevSigner";

import {
  chainIdOf,
  createEmbeddedWallet,
  createExternalWallet,
  EMBEDDED_WALLET_ADDRESS,
  type EmbeddedWalletOptions,
  type MockUser,
  type MockWallet,
  signerOnChain,
} from "./zerodev-signer-test-utils";

function setupEmailUser(
  opts: { embedded?: boolean; external?: boolean; embeddedOpts?: EmbeddedWalletOptions } = {}
) {
  mockPrivyState.user = { linkedAccounts: [{ type: "email" }] };
  mockPrivyState.wallets = [];
  if (opts.embedded !== false)
    mockPrivyState.wallets.push(createEmbeddedWallet(EMBEDDED_WALLET_ADDRESS, opts.embeddedOpts));
  if (opts.external) mockPrivyState.wallets.push(createExternalWallet());
}

// ===========================================================================
// Chain verification — GAP-FRONTEND-1T9 regression
// ---------------------------------------------------------------------------
// "Network mainnet not supported." happened because an embedded wallet that
// was still on chain 1 (mainnet) after switchChain produced a signer the GAP
// SDK rejected. These tests assert the signer the hook returns is ALWAYS on
// the requested chain, and that a stuck wallet fails loudly instead.
// ===========================================================================

describe("useZeroDevSigner — chain verification (GAP-FRONTEND-1T9 regression)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrivyState.ready = true;
    mockPrivyState.user = null;
    mockPrivyState.wallets = [];
    mockUseChainId.mockReturnValue(10);

    (isChainSupportedForGasless as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (createGaslessClient as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (createPrivySignerForGasless as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (getGaslessSigner as ReturnType<typeof vi.fn>).mockImplementation(
      async (_client: unknown, chainId: number) => signerOnChain(chainId)
    );

    mockSafeGetWalletClient.mockReset();
    mockWalletClientToSigner.mockReset();
    mockViemCreateWalletClient.mockReset();

    mockGetSigner.mockReset();
    mockGetSigner.mockImplementation(async (browserProvider?: unknown) => ({
      getAddress: vi.fn().mockResolvedValue(EMBEDDED_WALLET_ADDRESS),
      provider: browserProvider ?? {
        getNetwork: vi.fn().mockResolvedValue({ chainId: 1n }),
      },
    }));
  });

  it("recovers when the provider switch fails once, then succeeds (embedded-direct)", async () => {
    // First wallet_switchEthereumChain throws (provider still initialising); the
    // retry succeeds and the signer reports the target chain.
    setupEmailUser({ embeddedOpts: { initialChainId: 1, switchFailsTimes: 1 } });
    (isChainSupportedForGasless as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const { result } = renderHook(() => useZeroDevSigner());

    let signer: unknown;
    await act(async () => {
      signer = await result.current.getAttestationSigner(999);
    });

    expect(await chainIdOf(signer)).toBe(999);
  });

  it("throws an explicit, debuggable error when the provider never switches off chain 1", async () => {
    // wallet_switchEthereumChain always fails — the exact GAP-FRONTEND-23C state.
    setupEmailUser({
      embeddedOpts: { initialChainId: 1, switchFailsTimes: Number.POSITIVE_INFINITY },
    });
    (isChainSupportedForGasless as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const provider = await mockPrivyState.wallets[0].getEthereumProvider();

    // Fake timers so the backoff between switch attempts doesn't add real wall
    // time; runAllTimersAsync drains the sequential setTimeout chain.
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useZeroDevSigner());

      const promise = result.current.getAttestationSigner(999);
      const assertion = expect(promise).rejects.toThrow(
        // Surfaces the target + actual chain and tells the user to retry — it
        // must NOT instruct an embedded user to "switch your network".
        /chain 999.*still on chain 1.*try again/is
      );
      await vi.runAllTimersAsync();
      await assertion;

      // It tried the provider-level switch (not the inert high-level switchChain).
      expect(provider.request).toHaveBeenCalledWith({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x3e7" }],
      });
      expect(mockPrivyState.wallets[0].switchChain).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects a gasless signer reporting the wrong chain and recovers via the direct path", async () => {
    // Gasless produced a signer on chain 1 instead of the requested 10. The
    // guard must refuse it; the embedded-direct fallback then yields chain 10.
    setupEmailUser({ embeddedOpts: { initialChainId: 1 } });
    (isChainSupportedForGasless as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (createPrivySignerForGasless as ReturnType<typeof vi.fn>).mockResolvedValue("signer");
    (createGaslessClient as ReturnType<typeof vi.fn>).mockResolvedValue({ account: {} });
    (getGaslessSigner as ReturnType<typeof vi.fn>).mockResolvedValue(signerOnChain(1));

    const { result } = renderHook(() => useZeroDevSigner());

    let signer: unknown;
    await act(async () => {
      signer = await result.current.getAttestationSigner(10);
    });

    expect(await chainIdOf(signer)).toBe(10);
    // Fell through to the embedded-direct path after rejecting the bad signer.
    expect(mockPrivyState.wallets[0].getEthereumProvider).toHaveBeenCalled();
  });

  it("switches the embedded provider to the target chain via wallet_switchEthereumChain", async () => {
    setupEmailUser({ embeddedOpts: { initialChainId: 1 } });
    (isChainSupportedForGasless as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const embeddedWallet = mockPrivyState.wallets[0];
    const provider = await embeddedWallet.getEthereumProvider();

    const { result } = renderHook(() => useZeroDevSigner());

    let signer: unknown;
    await act(async () => {
      signer = await result.current.getAttestationSigner(999);
    });

    expect(await chainIdOf(signer)).toBe(999);
    // Switched at the provider level, never via the inert high-level switchChain.
    expect(provider.request).toHaveBeenCalledWith({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x3e7" }],
    });
    expect(embeddedWallet.switchChain).not.toHaveBeenCalled();
  });

  it("accepts a numeric eth_chainId result (non-hex provider)", async () => {
    // EIP-1193 returns hex, but a non-conforming provider may return a number;
    // readProviderChainId must coerce it rather than reject the wallet. Provider
    // already reports the target chain, so no switch is needed.
    setupEmailUser({ embeddedOpts: { initialChainId: 1 } });
    (isChainSupportedForGasless as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const embeddedWallet = mockPrivyState.wallets[0];
    embeddedWallet.getEthereumProvider = vi.fn().mockResolvedValue({
      request: vi.fn().mockResolvedValue(10),
      __chainId: 10,
    });

    const { result } = renderHook(() => useZeroDevSigner());

    let signer: unknown;
    await act(async () => {
      signer = await result.current.getAttestationSigner(10);
    });

    expect(await chainIdOf(signer)).toBe(10);
  });

  it("does not fall back to a connected external wallet when the embedded path fails", async () => {
    // Email user with BOTH an embedded wallet and an unlinked injected wallet
    // (useWallets() surfaces browser-connected wallets that aren't linked). The
    // embedded provider can never switch, so the embedded path throws — the hook
    // must surface that error, NOT silently sign with the external wallet (which
    // would use the wrong identity and prompt an unexpected popup).
    setupEmailUser({
      embedded: true,
      external: true,
      embeddedOpts: { initialChainId: 1, switchFailsTimes: Number.POSITIVE_INFINITY },
    });
    (isChainSupportedForGasless as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const externalWallet = mockPrivyState.wallets[1];

    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useZeroDevSigner());

      const promise = result.current.getAttestationSigner(999);
      const assertion = expect(promise).rejects.toThrow(/still on chain 1/i);
      await vi.runAllTimersAsync();
      await assertion;

      // The external wallet must never be touched for a social-login user.
      expect(externalWallet.switchChain).not.toHaveBeenCalled();
      expect(externalWallet.getEthereumProvider).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("reports 'still on chain unknown' when the provider can't report its chain", async () => {
    // The provider's requests fail on every attempt → the chain can never be
    // confirmed; the error must degrade to "unknown", not crash.
    setupEmailUser({ embeddedOpts: { initialChainId: 1 } });
    (isChainSupportedForGasless as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const failingRequest = vi.fn().mockRejectedValue(new Error("provider unavailable"));
    mockPrivyState.wallets[0].getEthereumProvider = vi
      .fn()
      .mockResolvedValue({ request: failingRequest });

    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useZeroDevSigner());

      const promise = result.current.getAttestationSigner(10);
      const assertion = expect(promise).rejects.toThrow(/still on chain unknown/i);
      await vi.runAllTimersAsync();
      await assertion;

      expect(failingRequest).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
