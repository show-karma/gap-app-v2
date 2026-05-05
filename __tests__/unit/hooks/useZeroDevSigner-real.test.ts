/**
 * @file Real hook tests for useZeroDevSigner
 * @description Tests the actual useZeroDevSigner hook by importing from its real source path
 *   (bypassing the vitest alias that redirects @/hooks/useZeroDevSigner to a mock).
 *   Mocks its dependencies instead: privy-bridge-context, gasless utilities, wagmi, wallet-helpers.
 *
 *   The @/utilities/gasless alias is already resolved to __mocks__/utilities/gasless/index.ts
 *   by vitest.config.ts, so the real hook's gasless imports get the mock automatically.
 */

import { act, renderHook } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Hoisted mock variables
// ---------------------------------------------------------------------------

interface MockUser {
  linkedAccounts: Array<{ type: string }>;
}

interface MockWallet {
  address: string;
  walletClientType: string;
  switchChain: ReturnType<typeof vi.fn>;
  getEthereumProvider: ReturnType<typeof vi.fn>;
}

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

vi.mock("ethers", () => ({
  BrowserProvider: class MockBrowserProvider {
    getSigner = mockGetSigner;
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
// Test helpers
// ---------------------------------------------------------------------------

const EMBEDDED_WALLET_ADDRESS = "0xEmbedded1111111111111111111111111111111111";
const EXTERNAL_WALLET_ADDRESS = "0xExternal2222222222222222222222222222222222";

function createEmbeddedWallet(address = EMBEDDED_WALLET_ADDRESS): MockWallet {
  return {
    address,
    walletClientType: "privy",
    switchChain: vi.fn().mockResolvedValue(undefined),
    getEthereumProvider: vi.fn().mockResolvedValue({ request: vi.fn() }),
  };
}

function createExternalWallet(address = EXTERNAL_WALLET_ADDRESS): MockWallet {
  return {
    address,
    walletClientType: "metamask",
    switchChain: vi.fn().mockResolvedValue(undefined),
    getEthereumProvider: vi.fn().mockResolvedValue({ request: vi.fn() }),
  };
}

function setupEmailUser(opts: { embedded?: boolean; external?: boolean } = {}) {
  mockPrivyState.user = { linkedAccounts: [{ type: "email" }] };
  mockPrivyState.wallets = [];
  if (opts.embedded !== false) mockPrivyState.wallets.push(createEmbeddedWallet());
  if (opts.external) mockPrivyState.wallets.push(createExternalWallet());
}

function setupGoogleUser(opts: { embedded?: boolean; external?: boolean } = {}) {
  mockPrivyState.user = { linkedAccounts: [{ type: "google_oauth" }] };
  mockPrivyState.wallets = [];
  if (opts.embedded !== false) mockPrivyState.wallets.push(createEmbeddedWallet());
  if (opts.external) mockPrivyState.wallets.push(createExternalWallet());
}

function setupFarcasterUser(opts: { embedded?: boolean } = {}) {
  mockPrivyState.user = { linkedAccounts: [{ type: "farcaster" }] };
  mockPrivyState.wallets = [];
  if (opts.embedded !== false) mockPrivyState.wallets.push(createEmbeddedWallet());
}

function setupExternalWalletUser() {
  mockPrivyState.user = { linkedAccounts: [{ type: "wallet" }] };
  mockPrivyState.wallets = [createExternalWallet()];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useZeroDevSigner (real hook)", () => {
  const mockGaslessSigner = { getAddress: vi.fn().mockResolvedValue(EMBEDDED_WALLET_ADDRESS) };
  const mockGaslessClient = { account: { address: EMBEDDED_WALLET_ADDRESS } };
  const mockEthersSigner = { getAddress: vi.fn().mockResolvedValue(EXTERNAL_WALLET_ADDRESS) };
  const mockEmbeddedSigner = { getAddress: vi.fn().mockResolvedValue(EMBEDDED_WALLET_ADDRESS) };

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
    (getGaslessSigner as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    mockSafeGetWalletClient.mockReset();
    mockWalletClientToSigner.mockReset();
    mockGetSigner.mockReset();
    mockViemCreateWalletClient.mockReset();
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
      (isChainSupportedForGasless as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (createPrivySignerForGasless as ReturnType<typeof vi.fn>).mockResolvedValue(
        "mockPrivySigner"
      );
      (createGaslessClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockGaslessClient);
      (getGaslessSigner as ReturnType<typeof vi.fn>).mockResolvedValue(mockGaslessSigner);

      const { result } = renderHook(() => useZeroDevSigner());

      let signer: unknown;
      await act(async () => {
        signer = await result.current.getAttestationSigner(10);
      });

      expect(signer).toBe(mockGaslessSigner);
      expect(createPrivySignerForGasless).toHaveBeenCalledWith(
        expect.objectContaining({ address: EMBEDDED_WALLET_ADDRESS }),
        10
      );
      expect(createGaslessClient).toHaveBeenCalledWith(10, "mockPrivySigner");
      expect(getGaslessSigner).toHaveBeenCalledWith(mockGaslessClient, 10);
    });

    it("should switch embedded wallet chain before creating gasless client", async () => {
      setupEmailUser();
      const embeddedWallet = mockPrivyState.wallets[0];
      (isChainSupportedForGasless as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (createPrivySignerForGasless as ReturnType<typeof vi.fn>).mockResolvedValue("signer");
      (createGaslessClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockGaslessClient);
      (getGaslessSigner as ReturnType<typeof vi.fn>).mockResolvedValue(mockGaslessSigner);

      const { result } = renderHook(() => useZeroDevSigner());

      await act(async () => {
        await result.current.getAttestationSigner(42161);
      });

      expect(embeddedWallet.switchChain).toHaveBeenCalledWith(42161);
    });

    it("should return gasless signer for Google OAuth user", async () => {
      setupGoogleUser();
      (isChainSupportedForGasless as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (createPrivySignerForGasless as ReturnType<typeof vi.fn>).mockResolvedValue("signer");
      (createGaslessClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockGaslessClient);
      (getGaslessSigner as ReturnType<typeof vi.fn>).mockResolvedValue(mockGaslessSigner);

      const { result } = renderHook(() => useZeroDevSigner());

      let signer: unknown;
      await act(async () => {
        signer = await result.current.getAttestationSigner(10);
      });

      expect(signer).toBe(mockGaslessSigner);
    });

    it("should return gasless signer for Farcaster user", async () => {
      setupFarcasterUser();
      (isChainSupportedForGasless as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (createPrivySignerForGasless as ReturnType<typeof vi.fn>).mockResolvedValue("signer");
      (createGaslessClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockGaslessClient);
      (getGaslessSigner as ReturnType<typeof vi.fn>).mockResolvedValue(mockGaslessSigner);

      const { result } = renderHook(() => useZeroDevSigner());

      let signer: unknown;
      await act(async () => {
        signer = await result.current.getAttestationSigner(10);
      });

      expect(signer).toBe(mockGaslessSigner);
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

      mockGetSigner.mockResolvedValue(mockEmbeddedSigner);

      const { result } = renderHook(() => useZeroDevSigner());

      let signer: unknown;
      await act(async () => {
        signer = await result.current.getAttestationSigner(10);
      });

      expect(signer).toBe(mockEmbeddedSigner);
      // getEthereumProvider should have been called to create BrowserProvider
      expect(mockPrivyState.wallets[0].getEthereumProvider).toHaveBeenCalled();
    });

    it("should fall back to embedded wallet on non-GaslessProviderError", async () => {
      setupEmailUser();
      (isChainSupportedForGasless as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (createPrivySignerForGasless as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("some random error")
      );

      mockGetSigner.mockResolvedValue(mockEmbeddedSigner);

      const { result } = renderHook(() => useZeroDevSigner());

      let signer: unknown;
      await act(async () => {
        signer = await result.current.getAttestationSigner(10);
      });

      expect(signer).toBe(mockEmbeddedSigner);
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

      mockGetSigner.mockResolvedValue(mockEmbeddedSigner);

      const { result } = renderHook(() => useZeroDevSigner());

      let signer: unknown;
      await act(async () => {
        signer = await result.current.getAttestationSigner(999);
      });

      expect(signer).toBe(mockEmbeddedSigner);
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
      mockWalletClientToSigner.mockResolvedValue(mockEthersSigner);

      const { result } = renderHook(() => useZeroDevSigner());

      let signer: unknown;
      await act(async () => {
        signer = await result.current.getAttestationSigner(10);
      });

      expect(signer).toBe(mockEthersSigner);
      // Primary path uses Privy's provider directly, not wagmi's safeGetWalletClient
      expect(mockSafeGetWalletClient).not.toHaveBeenCalled();
      expect(mockWalletClientToSigner).toHaveBeenCalledWith(mockCreatedClient);
      // Should switch chain before creating client
      expect(mockPrivyState.wallets[0].switchChain).toHaveBeenCalledWith(10);
    });

    it("should throw if safeGetWalletClient returns an error", async () => {
      setupExternalWalletUser();
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
});
