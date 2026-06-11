/**
 * @file Real hook tests for useZeroDevSigner
 * @description Tests the actual useZeroDevSigner hook by importing from its real source path
 *   (bypassing the vitest alias that redirects @/hooks/useZeroDevSigner to a mock).
 *   Mocks its dependencies instead: privy-bridge-context, gasless utilities, wagmi, wallet-helpers.
 *
 *   The @/utilities/gasless alias is already resolved to __mocks__/utilities/gasless/index.ts
 *   by vitest.config.ts, so the real hook's gasless imports get the mock automatically.
 *
 *   Unlike the original suite, the wallet + ethers mocks here model an actual
 *   *chain identity* and the Privy `switchChain` propagation race. This is the
 *   gap that let GAP-FRONTEND-1T9 ("Network mainnet not supported.") ship: the
 *   old mocks made `switchChain` always succeed and gave signers no chain, so a
 *   signer stuck on chain 1 was impossible to express in a test.
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
} = vi.hoisted(() => {
  const mockUseChainId = vi.fn().mockReturnValue(10);
  const mockPrivyState = {
    ready: true as boolean,
    user: null as MockUser | null,
    wallets: [] as MockWallet[],
  };
  const mockSafeGetWalletClient = vi.fn();
  const mockWalletClientToSigner = vi.fn();
  // Called by the mocked ethers BrowserProvider.getSigner(); receives the
  // BrowserProvider instance so the returned signer's `.provider` reflects
  // the (un-pinned) underlying chain — exactly what the production guard reads.
  const mockGetSigner = vi.fn();

  return {
    mockUseChainId,
    mockPrivyState,
    mockSafeGetWalletClient,
    mockWalletClientToSigner,
    mockGetSigner,
  };
});

// ---------------------------------------------------------------------------
// Module mocks
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

// Mock appNetwork so the Privy-first path for external wallets can find chains
vi.mock("@/utilities/network", () => ({
  appNetwork: [
    { id: 10, name: "Optimism" },
    { id: 42161, name: "Arbitrum" },
    { id: 999, name: "Testnet" },
  ],
}));

// Mock viem's createWalletClient and custom to support Privy-first external wallet path
const mockViemCreateWalletClient = vi.fn();
vi.mock("viem", () => ({
  createWalletClient: (...args: unknown[]) => mockViemCreateWalletClient(...args),
  custom: vi.fn((provider: unknown) => provider),
}));

// Chain-aware ethers BrowserProvider mock. `getNetwork()` returns the pinned
// network when one is supplied (the production fix for the gasless path), and
// otherwise reflects the underlying provider's `__chainId` (the un-pinned
// embedded-direct path, which must surface the wallet's real chain).
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

// The gasless utilities are already mocked via vitest alias (unitTestMockAliases).
// We import them here to configure per-test.
import {
  createGaslessClient,
  createPrivySignerForGasless,
  GaslessProviderError,
  getGaslessSigner,
  isChainSupportedForGasless,
} from "@/utilities/gasless";

// ---------------------------------------------------------------------------
// Import the REAL hook using a relative path to bypass the @/ alias mock
// ---------------------------------------------------------------------------
import { useZeroDevSigner } from "../../../hooks/useZeroDevSigner";

// ---------------------------------------------------------------------------
// Shared chain-aware fixtures (see zerodev-signer-test-utils.ts)
// ---------------------------------------------------------------------------
import {
  addressOf,
  chainIdOf,
  createEmbeddedWallet,
  createExternalWallet,
  EMBEDDED_WALLET_ADDRESS,
  type EmbeddedWalletOptions,
  EXTERNAL_WALLET_ADDRESS,
  type MockUser,
  type MockWallet,
  signerOnChain,
} from "./zerodev-signer-test-utils";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function setupEmailUser(
  opts: { embedded?: boolean; external?: boolean; embeddedOpts?: EmbeddedWalletOptions } = {}
) {
  // A linked external wallet (opts.external) represents a hybrid user who logged
  // in via email and ALSO linked their own MetaMask — so the address is in
  // linkedAccounts and passes the resolver's linkage check.
  mockPrivyState.user = {
    linkedAccounts: [
      { type: "email" },
      { type: "wallet", address: EMBEDDED_WALLET_ADDRESS },
      ...(opts.external ? [{ type: "wallet", address: EXTERNAL_WALLET_ADDRESS }] : []),
    ],
  };
  mockPrivyState.wallets = [];
  if (opts.embedded !== false)
    mockPrivyState.wallets.push(createEmbeddedWallet(EMBEDDED_WALLET_ADDRESS, opts.embeddedOpts));
  if (opts.external) mockPrivyState.wallets.push(createExternalWallet());
}

function setupGoogleUser(opts: { embedded?: boolean; external?: boolean } = {}) {
  mockPrivyState.user = {
    linkedAccounts: [
      { type: "google_oauth" },
      { type: "wallet", address: EMBEDDED_WALLET_ADDRESS },
      ...(opts.external ? [{ type: "wallet", address: EXTERNAL_WALLET_ADDRESS }] : []),
    ],
  };
  mockPrivyState.wallets = [];
  if (opts.embedded !== false) mockPrivyState.wallets.push(createEmbeddedWallet());
  if (opts.external) mockPrivyState.wallets.push(createExternalWallet());
}

function setupFarcasterUser(opts: { embedded?: boolean } = {}) {
  mockPrivyState.user = {
    linkedAccounts: [{ type: "farcaster" }, { type: "wallet", address: EMBEDDED_WALLET_ADDRESS }],
  };
  mockPrivyState.wallets = [];
  if (opts.embedded !== false) mockPrivyState.wallets.push(createEmbeddedWallet());
}

function setupExternalWalletUser() {
  mockPrivyState.user = {
    linkedAccounts: [{ type: "wallet", address: EXTERNAL_WALLET_ADDRESS }],
  };
  mockPrivyState.wallets = [createExternalWallet()];
}

/** Configure the gasless mocks for a successful gasless signer on `chainId`. */
function enableGaslessOnChain(chainId: number) {
  (isChainSupportedForGasless as ReturnType<typeof vi.fn>).mockReturnValue(true);
  (createPrivySignerForGasless as ReturnType<typeof vi.fn>).mockResolvedValue("mockPrivySigner");
  (createGaslessClient as ReturnType<typeof vi.fn>).mockResolvedValue({
    account: { address: EMBEDDED_WALLET_ADDRESS },
  });
  (getGaslessSigner as ReturnType<typeof vi.fn>).mockResolvedValue(signerOnChain(chainId));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useZeroDevSigner (real hook)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrivyState.ready = true;
    mockPrivyState.user = null;
    mockPrivyState.wallets = [];
    mockUseChainId.mockReturnValue(10);

    // Reset gasless mocks (these are from the alias mock)
    (isChainSupportedForGasless as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (createGaslessClient as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (createPrivySignerForGasless as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    // Default: gasless produces a signer that correctly reports its chain.
    (getGaslessSigner as ReturnType<typeof vi.fn>).mockImplementation(
      async (_client: unknown, chainId: number) => signerOnChain(chainId)
    );

    mockSafeGetWalletClient.mockReset();
    mockWalletClientToSigner.mockReset();
    mockViemCreateWalletClient.mockReset();

    // Default embedded/BrowserProvider signer: `.provider` is the BrowserProvider
    // instance, so its chain reflects whatever the underlying provider reported.
    mockGetSigner.mockReset();
    mockGetSigner.mockImplementation(async (browserProvider?: unknown) => ({
      getAddress: vi.fn().mockResolvedValue(EMBEDDED_WALLET_ADDRESS),
      provider: browserProvider ?? {
        getNetwork: vi.fn().mockResolvedValue({ chainId: 1n }),
      },
    }));
  });

  // =========================================================================
  // Wallet detection
  // =========================================================================

  describe("wallet detection", () => {
    it("should detect embedded wallet (privy walletClientType)", () => {
      setupEmailUser();
      const { result } = renderHook(() => useZeroDevSigner());

      expect(result.current.hasEmbeddedWallet).toBe(true);
      expect(result.current.hasExternalWallet).toBe(false);
    });

    it("should detect external wallet (non-privy walletClientType)", () => {
      setupExternalWalletUser();
      const { result } = renderHook(() => useZeroDevSigner());

      expect(result.current.hasEmbeddedWallet).toBe(false);
      expect(result.current.hasExternalWallet).toBe(true);
    });

    it("should detect both embedded and external wallets", () => {
      setupEmailUser({ embedded: true, external: true });
      const { result } = renderHook(() => useZeroDevSigner());

      expect(result.current.hasEmbeddedWallet).toBe(true);
      expect(result.current.hasExternalWallet).toBe(true);
    });

    it("should report no wallets when privy is not ready", () => {
      mockPrivyState.ready = false;
      mockPrivyState.user = { linkedAccounts: [{ type: "email" }] };
      mockPrivyState.wallets = [createEmbeddedWallet()];

      const { result } = renderHook(() => useZeroDevSigner());

      expect(result.current.hasEmbeddedWallet).toBe(false);
      expect(result.current.hasExternalWallet).toBe(false);
    });

    it("should report no wallets when wallets array is empty", () => {
      mockPrivyState.user = { linkedAccounts: [{ type: "email" }] };
      mockPrivyState.wallets = [];

      const { result } = renderHook(() => useZeroDevSigner());

      expect(result.current.hasEmbeddedWallet).toBe(false);
      expect(result.current.hasExternalWallet).toBe(false);
    });
  });

  // =========================================================================
  // attestationAddress
  // =========================================================================

  describe("attestationAddress", () => {
    it("should return embedded wallet address for email users", () => {
      setupEmailUser();
      const { result } = renderHook(() => useZeroDevSigner());

      expect(result.current.attestationAddress).toBe(EMBEDDED_WALLET_ADDRESS);
    });

    it("should return embedded wallet address for Google users", () => {
      setupGoogleUser();
      const { result } = renderHook(() => useZeroDevSigner());

      expect(result.current.attestationAddress).toBe(EMBEDDED_WALLET_ADDRESS);
    });

    it("should return external wallet address for external wallet users", () => {
      setupExternalWalletUser();
      const { result } = renderHook(() => useZeroDevSigner());

      expect(result.current.attestationAddress).toBe(EXTERNAL_WALLET_ADDRESS);
    });

    it("should return null when no user and no wallets", () => {
      mockPrivyState.user = null;
      mockPrivyState.wallets = [];
      const { result } = renderHook(() => useZeroDevSigner());

      expect(result.current.attestationAddress).toBeNull();
    });
  });

  // =========================================================================
  // isGaslessAvailable
  // =========================================================================

  describe("isGaslessAvailable", () => {
    it("should be true for email user with embedded wallet on supported chain", () => {
      setupEmailUser();
      (isChainSupportedForGasless as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const { result } = renderHook(() => useZeroDevSigner());

      expect(result.current.isGaslessAvailable).toBe(true);
    });

    it("should be false for email user on unsupported chain", () => {
      setupEmailUser();
      (isChainSupportedForGasless as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const { result } = renderHook(() => useZeroDevSigner());

      expect(result.current.isGaslessAvailable).toBe(false);
    });

    it("should be false for external wallet user even on supported chain", () => {
      setupExternalWalletUser();
      (isChainSupportedForGasless as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const { result } = renderHook(() => useZeroDevSigner());

      expect(result.current.isGaslessAvailable).toBe(false);
    });
  });

  // =========================================================================
  // getAttestationSigner — Case 1: Email/Google user with gasless
  // =========================================================================

  describe("getAttestationSigner — email user with gasless", () => {
    it("should return gasless signer for email user on supported chain", async () => {
      setupEmailUser();
      enableGaslessOnChain(10);

      const { result } = renderHook(() => useZeroDevSigner());

      let signer: unknown;
      await act(async () => {
        signer = await result.current.getAttestationSigner(10);
      });

      expect(signer).toBeDefined();
      expect(await chainIdOf(signer)).toBe(10);
      expect(createPrivySignerForGasless).toHaveBeenCalledWith(
        expect.objectContaining({ address: EMBEDDED_WALLET_ADDRESS }),
        10
      );
      expect(createGaslessClient).toHaveBeenCalledWith(10, "mockPrivySigner");
      expect(getGaslessSigner).toHaveBeenCalledWith(
        expect.objectContaining({ account: { address: EMBEDDED_WALLET_ADDRESS } }),
        10
      );
      // Gasless path must NOT touch the embedded-direct provider.
      expect(mockPrivyState.wallets[0].getEthereumProvider).not.toHaveBeenCalled();
    });

    it("should switch embedded wallet chain before creating gasless client", async () => {
      setupEmailUser();
      const embeddedWallet = mockPrivyState.wallets[0];
      enableGaslessOnChain(42161);

      const { result } = renderHook(() => useZeroDevSigner());

      await act(async () => {
        await result.current.getAttestationSigner(42161);
      });

      expect(embeddedWallet.switchChain).toHaveBeenCalledWith(42161);
    });

    it("should return gasless signer for Google OAuth user", async () => {
      setupGoogleUser();
      enableGaslessOnChain(10);

      const { result } = renderHook(() => useZeroDevSigner());

      let signer: unknown;
      await act(async () => {
        signer = await result.current.getAttestationSigner(10);
      });

      expect(await chainIdOf(signer)).toBe(10);
    });

    it("should return gasless signer for Farcaster user", async () => {
      setupFarcasterUser();
      enableGaslessOnChain(10);

      const { result } = renderHook(() => useZeroDevSigner());

      let signer: unknown;
      await act(async () => {
        signer = await result.current.getAttestationSigner(10);
      });

      expect(await chainIdOf(signer)).toBe(10);
    });
  });

  // =========================================================================
  // getAttestationSigner — Gasless fallback to embedded wallet
  // =========================================================================

  describe("getAttestationSigner — gasless fallback", () => {
    it("should fall back to embedded wallet when gasless client returns null", async () => {
      setupEmailUser();
      (isChainSupportedForGasless as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (createPrivySignerForGasless as ReturnType<typeof vi.fn>).mockResolvedValue("signer");
      (createGaslessClient as ReturnType<typeof vi.fn>).mockResolvedValue(null); // null = no client

      const { result } = renderHook(() => useZeroDevSigner());

      let signer: unknown;
      await act(async () => {
        signer = await result.current.getAttestationSigner(10);
      });

      expect(await chainIdOf(signer)).toBe(10);
      // getEthereumProvider should have been called to create BrowserProvider
      expect(mockPrivyState.wallets[0].getEthereumProvider).toHaveBeenCalled();
    });

    it("should fall back to embedded wallet on non-GaslessProviderError", async () => {
      setupEmailUser();
      (isChainSupportedForGasless as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (createPrivySignerForGasless as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("some random error")
      );

      const { result } = renderHook(() => useZeroDevSigner());

      let signer: unknown;
      await act(async () => {
        signer = await result.current.getAttestationSigner(10);
      });

      expect(await chainIdOf(signer)).toBe(10);
    });

    it("should NOT fall back for GaslessProviderError — rethrows it", async () => {
      setupEmailUser();
      (isChainSupportedForGasless as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const gaslessError = new GaslessProviderError("provider failed", "zerodev", 10);
      (createPrivySignerForGasless as ReturnType<typeof vi.fn>).mockRejectedValue(gaslessError);

      const { result } = renderHook(() => useZeroDevSigner());

      await act(async () => {
        await expect(result.current.getAttestationSigner(10)).rejects.toThrow(GaslessProviderError);
      });
    });
  });

  // =========================================================================
  // getAttestationSigner — Case 2: Email user without gasless support
  // =========================================================================

  describe("getAttestationSigner — email user on unsupported chain", () => {
    it("should use embedded wallet directly (user pays gas)", async () => {
      setupEmailUser();
      (isChainSupportedForGasless as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const { result } = renderHook(() => useZeroDevSigner());

      let signer: unknown;
      await act(async () => {
        signer = await result.current.getAttestationSigner(999);
      });

      expect(await chainIdOf(signer)).toBe(999);
      expect(mockPrivyState.wallets[0].switchChain).toHaveBeenCalledWith(999);
      expect(mockPrivyState.wallets[0].getEthereumProvider).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // getAttestationSigner — Case 3: External wallet user
  // =========================================================================

  describe("getAttestationSigner — external wallet user", () => {
    it("should use external wallet via Privy provider (primary path)", async () => {
      setupExternalWalletUser();
      const mockCreatedClient = { account: { address: EXTERNAL_WALLET_ADDRESS } };
      mockViemCreateWalletClient.mockReturnValue(mockCreatedClient);
      const mockSigner = { getAddress: vi.fn().mockResolvedValue(EXTERNAL_WALLET_ADDRESS) };
      mockWalletClientToSigner.mockResolvedValue(mockSigner);

      const { result } = renderHook(() => useZeroDevSigner());

      let signer: unknown;
      await act(async () => {
        signer = await result.current.getAttestationSigner(10);
      });

      expect(signer).toBe(mockSigner);
      // Primary path uses Privy's provider directly, not wagmi's safeGetWalletClient
      expect(mockSafeGetWalletClient).not.toHaveBeenCalled();
      expect(mockWalletClientToSigner).toHaveBeenCalledWith(mockCreatedClient);
      // Should switch chain before creating client
      expect(mockPrivyState.wallets[0].switchChain).toHaveBeenCalledWith(10);
    });

    it("should throw if safeGetWalletClient returns an error", async () => {
      setupExternalWalletUser();
      // Force the Privy-first path to fail so it falls back to wagmi.
      mockPrivyState.wallets[0].getEthereumProvider = vi
        .fn()
        .mockRejectedValue(new Error("Provider not available"));
      mockSafeGetWalletClient.mockResolvedValue({
        walletClient: null,
        error: "Connection failed",
      });

      const { result } = renderHook(() => useZeroDevSigner());

      await act(async () => {
        await expect(result.current.getAttestationSigner(10)).rejects.toThrow(
          "Failed to get wallet client: Connection failed"
        );
      });
    });

    it("should throw if walletClientToSigner returns null", async () => {
      setupExternalWalletUser();
      mockPrivyState.wallets[0].getEthereumProvider = vi
        .fn()
        .mockRejectedValue(new Error("Provider not available"));
      mockSafeGetWalletClient.mockResolvedValue({
        walletClient: { account: {}, chain: {}, transport: {} },
        error: null,
      });
      mockWalletClientToSigner.mockResolvedValue(null);

      const { result } = renderHook(() => useZeroDevSigner());

      await act(async () => {
        await expect(result.current.getAttestationSigner(10)).rejects.toThrow(
          "Failed to create signer from wallet client"
        );
      });
    });
  });

  // =========================================================================
  // getAttestationSigner — No wallet at all
  // =========================================================================

  describe("getAttestationSigner — no wallet", () => {
    it("should throw 'No wallet available for signing' when no wallets exist", async () => {
      mockPrivyState.user = { linkedAccounts: [{ type: "wallet" }] };
      mockPrivyState.wallets = [];

      const { result } = renderHook(() => useZeroDevSigner());

      await act(async () => {
        await expect(result.current.getAttestationSigner(10)).rejects.toThrow(
          "No wallet available for signing"
        );
      });
    });

    it("should throw when user is null", async () => {
      mockPrivyState.user = null;
      mockPrivyState.wallets = [];

      const { result } = renderHook(() => useZeroDevSigner());

      await act(async () => {
        await expect(result.current.getAttestationSigner(10)).rejects.toThrow(
          "No wallet available for signing"
        );
      });
    });
  });

  // =========================================================================
  // Chain verification — GAP-FRONTEND-1T9 regression
  // -------------------------------------------------------------------------
  // "Network mainnet not supported." happened because an embedded wallet that
  // was still on chain 1 (mainnet) after switchChain produced a signer the GAP
  // SDK rejected. These tests assert the signer the hook returns is ALWAYS on
  // the requested chain, and that a stuck wallet fails loudly instead.
  // =========================================================================

  describe("chain verification (GAP-FRONTEND-1T9 regression)", () => {
    it("recovers from the switchChain propagation race by rebuilding once (embedded-direct)", async () => {
      // First getEthereumProvider read still reports chain 1; the second
      // reflects the switch. The hook must rebuild and return a chain-999 signer.
      setupEmailUser({ embeddedOpts: { initialChainId: 1, propagateAfterReads: 1 } });
      (isChainSupportedForGasless as ReturnType<typeof vi.fn>).mockReturnValue(false);
      const embeddedWallet = mockPrivyState.wallets[0];

      const { result } = renderHook(() => useZeroDevSigner());

      let signer: unknown;
      await act(async () => {
        signer = await result.current.getAttestationSigner(999);
      });

      expect(await chainIdOf(signer)).toBe(999);
      // Built twice: once stale, once after the switch propagated.
      expect(embeddedWallet.switchChain).toHaveBeenCalledTimes(2);
      expect(embeddedWallet.getEthereumProvider).toHaveBeenCalledTimes(2);
    });

    it("throws an explicit, debuggable error when the embedded wallet never leaves chain 1", async () => {
      // Wallet is permanently stuck on mainnet — the exact GAP-FRONTEND-1T9 state.
      setupEmailUser({
        embeddedOpts: { initialChainId: 1, propagateAfterReads: Number.POSITIVE_INFINITY },
      });
      (isChainSupportedForGasless as ReturnType<typeof vi.fn>).mockReturnValue(false);
      const embeddedWallet = mockPrivyState.wallets[0];

      const { result } = renderHook(() => useZeroDevSigner());

      await act(async () => {
        const promise = result.current.getAttestationSigner(999);
        // Surfaces the target + actual chain and tells the user to retry —
        // it must NOT instruct an embedded user to "switch your network".
        await expect(promise).rejects.toThrow(/chain 999.*still on chain 1.*try again/is);
      });

      // Exactly one rebuild attempt before giving up.
      expect(embeddedWallet.switchChain).toHaveBeenCalledTimes(2);
    });

    it("rejects a gasless signer reporting the wrong chain and recovers via the direct path", async () => {
      // Gasless produced a signer on chain 1 instead of the requested 10. The
      // guard must refuse it; the embedded-direct fallback then yields chain 10.
      setupEmailUser({ embeddedOpts: { initialChainId: 1, propagateAfterReads: 0 } });
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

    it("does not rebuild when the embedded wallet is already on the target chain", async () => {
      setupEmailUser({ embeddedOpts: { initialChainId: 1, propagateAfterReads: 0 } });
      (isChainSupportedForGasless as ReturnType<typeof vi.fn>).mockReturnValue(false);
      const embeddedWallet = mockPrivyState.wallets[0];

      const { result } = renderHook(() => useZeroDevSigner());

      let signer: unknown;
      await act(async () => {
        signer = await result.current.getAttestationSigner(999);
      });

      expect(await chainIdOf(signer)).toBe(999);
      // Single build: no race, no rebuild.
      expect(embeddedWallet.switchChain).toHaveBeenCalledTimes(1);
      expect(embeddedWallet.getEthereumProvider).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // Smoke tests — broad "does the basic flow work end to end" coverage
  // =========================================================================

  describe("smoke tests", () => {
    it("email + gasless: returns a usable signer on the requested chain", async () => {
      setupEmailUser();
      enableGaslessOnChain(10);

      const { result } = renderHook(() => useZeroDevSigner());

      let signer: unknown;
      await act(async () => {
        signer = await result.current.getAttestationSigner(10);
      });

      expect(signer).toBeDefined();
      expect(await addressOf(signer)).toBe(EMBEDDED_WALLET_ADDRESS);
      expect(await chainIdOf(signer)).toBe(10);
    });

    it("email + unsupported chain: returns a usable embedded-direct signer", async () => {
      setupEmailUser();
      (isChainSupportedForGasless as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const { result } = renderHook(() => useZeroDevSigner());

      let signer: unknown;
      await act(async () => {
        signer = await result.current.getAttestationSigner(999);
      });

      expect(signer).toBeDefined();
      expect(await chainIdOf(signer)).toBe(999);
    });

    it("external wallet: returns a usable signer", async () => {
      setupExternalWalletUser();
      mockViemCreateWalletClient.mockReturnValue({ account: { address: EXTERNAL_WALLET_ADDRESS } });
      const mockSigner = { getAddress: vi.fn().mockResolvedValue(EXTERNAL_WALLET_ADDRESS) };
      mockWalletClientToSigner.mockResolvedValue(mockSigner);

      const { result } = renderHook(() => useZeroDevSigner());

      let signer: unknown;
      await act(async () => {
        signer = await result.current.getAttestationSigner(10);
      });

      expect(signer).toBeDefined();
      expect(await addressOf(signer)).toBe(EXTERNAL_WALLET_ADDRESS);
    });

    it("Google + gasless: returns a usable signer on the requested chain", async () => {
      setupGoogleUser();
      enableGaslessOnChain(42161);

      const { result } = renderHook(() => useZeroDevSigner());

      let signer: unknown;
      await act(async () => {
        signer = await result.current.getAttestationSigner(42161);
      });

      expect(signer).toBeDefined();
      expect(await chainIdOf(signer)).toBe(42161);
    });

    it("hook exposes a stable shape", () => {
      setupEmailUser();
      const { result } = renderHook(() => useZeroDevSigner());

      expect(typeof result.current.getAttestationSigner).toBe("function");
      expect(typeof result.current.isGaslessAvailable).toBe("boolean");
      expect(typeof result.current.hasEmbeddedWallet).toBe("boolean");
      expect(typeof result.current.hasExternalWallet).toBe("boolean");
      expect(result.current.attestationAddress).toBe(EMBEDDED_WALLET_ADDRESS);
    });
  });
});
