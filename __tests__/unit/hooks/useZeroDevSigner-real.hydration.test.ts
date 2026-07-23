/**
 * @file Real hook tests for useZeroDevSigner — wallet hydration & status
 * @description Split from useZeroDevSigner-real.test.ts to stay under the
 *   per-file size limit. Covers the external-wallet path, the no-wallet
 *   SignerUnavailableError classification, mid-flight wallet hydration
 *   (GAP-FRONTEND-24N), signerStatus derivation, and end-to-end smoke tests.
 *   The wallet-detection / gasless happy-path coverage lives in the sibling
 *   `useZeroDevSigner-real.paths.test.ts`.
 *
 *   Tests the actual useZeroDevSigner hook by importing from its real source
 *   path (bypassing the vitest alias that redirects @/hooks/useZeroDevSigner to
 *   a mock). Mocks its dependencies instead: privy-bridge-context, gasless
 *   utilities, wagmi, wallet-helpers.
 *
 *   The @/utilities/gasless alias is already resolved to
 *   __mocks__/utilities/gasless/index.ts by vitest.config.ts, so the real
 *   hook's gasless imports get the mock automatically.
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
    // Defaults to true so existing tests (wallets present at render time)
    // resolve immediately instead of waiting out WALLET_READY_TIMEOUT_MS.
    // Tests for the hydration-wait behavior set this to false explicitly.
    walletsReady: true as boolean,
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
    walletsReady: mockPrivyState.walletsReady,
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
  getGaslessSigner,
  isChainSupportedForGasless,
} from "@/utilities/gasless";

// ---------------------------------------------------------------------------
// Import the REAL hook using a relative path to bypass the @/ alias mock
// ---------------------------------------------------------------------------
import { useZeroDevSigner } from "../../../hooks/useZeroDevSigner";
import { WALLET_READY_TIMEOUT_MS } from "../../../utilities/wallet/waitForUsableWallet";

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

describe("useZeroDevSigner (real hook) — hydration & status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrivyState.ready = true;
    mockPrivyState.walletsReady = true;
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

  afterEach(() => {
    // Some tests below install fake timers to fast-forward the
    // WALLET_READY_TIMEOUT_MS wait — always restore real timers so it can't
    // leak into a later test.
    vi.useRealTimers();
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
    it("throws SignerUnavailableError('wallets-hydrating') when walletsReady never flips true", async () => {
      vi.useFakeTimers();
      mockPrivyState.walletsReady = false;
      mockPrivyState.user = { linkedAccounts: [{ type: "wallet" }] };
      mockPrivyState.wallets = [];

      const { result } = renderHook(() => useZeroDevSigner());

      const assertion = expect(result.current.getAttestationSigner(10)).rejects.toMatchObject({
        name: "SignerUnavailableError",
        reason: "wallets-hydrating",
        expected: true,
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(WALLET_READY_TIMEOUT_MS + 500);
      });

      await assertion;
    });

    it("throws SignerUnavailableError('no-wallet-connected') when wallets are hydrated but empty (wallet-login user)", async () => {
      vi.useFakeTimers();
      mockPrivyState.walletsReady = true;
      mockPrivyState.user = { linkedAccounts: [{ type: "wallet" }] };
      mockPrivyState.wallets = [];

      const { result } = renderHook(() => useZeroDevSigner());

      const assertion = expect(result.current.getAttestationSigner(10)).rejects.toMatchObject({
        name: "SignerUnavailableError",
        reason: "no-wallet-connected",
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(WALLET_READY_TIMEOUT_MS + 500);
      });

      await assertion;
    });

    it("throws SignerUnavailableError('embedded-wallet-provisioning') for an email user whose embedded wallet never appears", async () => {
      vi.useFakeTimers();
      mockPrivyState.walletsReady = true;
      mockPrivyState.user = { linkedAccounts: [{ type: "email" }] };
      mockPrivyState.wallets = [];

      const { result } = renderHook(() => useZeroDevSigner());

      const assertion = expect(result.current.getAttestationSigner(10)).rejects.toMatchObject({
        name: "SignerUnavailableError",
        reason: "embedded-wallet-provisioning",
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(WALLET_READY_TIMEOUT_MS + 500);
      });

      await assertion;
    });

    it("throws when user is null (unauthenticated)", async () => {
      vi.useFakeTimers();
      mockPrivyState.walletsReady = true;
      mockPrivyState.user = null;
      mockPrivyState.wallets = [];

      const { result } = renderHook(() => useZeroDevSigner());

      const assertion = expect(result.current.getAttestationSigner(10)).rejects.toMatchObject({
        name: "SignerUnavailableError",
        reason: "no-wallet-connected",
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(WALLET_READY_TIMEOUT_MS + 500);
      });

      await assertion;
    });
  });

  // =========================================================================
  // Regression: GAP-FRONTEND-24N — a wallet that hydrates mid-wait must
  // resolve, not throw the old instantaneous "No wallet available" error.
  // =========================================================================

  describe("getAttestationSigner — mid-flight wallet hydration (GAP-FRONTEND-24N)", () => {
    it("resolves with a signer once an external wallet appears during the wait", async () => {
      vi.useFakeTimers();
      mockPrivyState.walletsReady = false;
      mockPrivyState.user = {
        linkedAccounts: [{ type: "wallet", address: EXTERNAL_WALLET_ADDRESS }],
      };
      mockPrivyState.wallets = [];
      mockViemCreateWalletClient.mockReturnValue({ account: { address: EXTERNAL_WALLET_ADDRESS } });
      mockWalletClientToSigner.mockResolvedValue({
        getAddress: vi.fn().mockResolvedValue(EXTERNAL_WALLET_ADDRESS),
      });

      const { result, rerender } = renderHook(() => useZeroDevSigner());

      const signerPromise = result.current.getAttestationSigner(10);

      // Advance past the first poll tick(s) without resolving hydration yet.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      // Wallet hydrates mid-wait — mutate the same object the hook's ref reads,
      // then rerender so the ref-sync-on-render line picks up the new value
      // (mutating the mock state alone doesn't trigger a React re-render).
      mockPrivyState.walletsReady = true;
      mockPrivyState.wallets = [createExternalWallet()];
      rerender();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      const signer = await signerPromise;
      expect(signer).toBeDefined();
      expect(await addressOf(signer)).toBe(EXTERNAL_WALLET_ADDRESS);
    });
  });

  // =========================================================================
  // signerStatus derivation
  // =========================================================================

  describe("signerStatus", () => {
    it("is 'initializing' while Privy is not ready", () => {
      mockPrivyState.ready = false;
      mockPrivyState.walletsReady = false;
      mockPrivyState.user = { linkedAccounts: [{ type: "wallet" }] };
      mockPrivyState.wallets = [];

      const { result } = renderHook(() => useZeroDevSigner());

      expect(result.current.signerStatus).toBe("initializing");
    });

    it("is 'initializing' while wallets have not hydrated yet", () => {
      mockPrivyState.walletsReady = false;
      mockPrivyState.user = { linkedAccounts: [{ type: "wallet" }] };
      mockPrivyState.wallets = [];

      const { result } = renderHook(() => useZeroDevSigner());

      expect(result.current.signerStatus).toBe("initializing");
    });

    it("is 'ready' once a usable wallet exists", () => {
      setupExternalWalletUser();

      const { result } = renderHook(() => useZeroDevSigner());

      expect(result.current.signerStatus).toBe("ready");
    });

    it("is 'no-wallet' when hydrated with no wallets for a wallet-login user", () => {
      mockPrivyState.walletsReady = true;
      mockPrivyState.user = { linkedAccounts: [{ type: "wallet" }] };
      mockPrivyState.wallets = [];

      const { result } = renderHook(() => useZeroDevSigner());

      expect(result.current.signerStatus).toBe("no-wallet");
    });

    it("stays 'initializing' (not 'no-wallet') for an email user whose embedded wallet hasn't appeared yet", () => {
      mockPrivyState.walletsReady = true;
      mockPrivyState.user = { linkedAccounts: [{ type: "email" }] };
      mockPrivyState.wallets = [];

      const { result } = renderHook(() => useZeroDevSigner());

      expect(result.current.signerStatus).toBe("initializing");
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
