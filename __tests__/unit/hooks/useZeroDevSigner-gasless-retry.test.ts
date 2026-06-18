/**
 * @file Gasless client-creation retry tests for useZeroDevSigner.
 *
 * GAP-FRONTEND-23C: a transient ZeroDev bundler-RPC failure dropped an email
 * user off the gasless path and onto a (then-broken) fallback. These tests
 * assert the client-creation step is retried with backoff before giving up,
 * that a deliberate GaslessProviderError is never retried, and that exhausting
 * the retries still recovers via the embedded-direct path.
 *
 * Mock wiring mirrors useZeroDevSigner-chain.test.ts (module mocks are
 * file-scoped, so it can't be shared).
 */
import { act, renderHook } from "@testing-library/react";

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
  mockGetSigner: vi.fn(),
}));

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
  ],
}));

const mockViemCreateWalletClient = vi.fn();
vi.mock("viem", () => ({
  createWalletClient: (...args: unknown[]) => mockViemCreateWalletClient(...args),
  custom: vi.fn((provider: unknown) => provider),
}));

// Chain-aware ethers BrowserProvider mock (reflects the underlying provider's chain).
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

import {
  createGaslessClient,
  createPrivySignerForGasless,
  GaslessProviderError,
  getGaslessSigner,
  isChainSupportedForGasless,
} from "@/utilities/gasless";

// Import the REAL hook via relative path to bypass the @/ alias mock.
import { useZeroDevSigner } from "../../../hooks/useZeroDevSigner";

import {
  chainIdOf,
  createEmbeddedWallet,
  EMBEDDED_WALLET_ADDRESS,
  type MockUser,
  type MockWallet,
  signerOnChain,
} from "./zerodev-signer-test-utils";

function setupEmailUser(initialChainId = 1) {
  mockPrivyState.user = { linkedAccounts: [{ type: "email" }] };
  mockPrivyState.wallets = [createEmbeddedWallet(EMBEDDED_WALLET_ADDRESS, { initialChainId })];
}

const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

describe("useZeroDevSigner — gasless retry (GAP-FRONTEND-23C)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrivyState.ready = true;
    mockPrivyState.user = null;
    mockPrivyState.wallets = [];
    mockUseChainId.mockReturnValue(10);

    // Gasless is supported for these tests; individual tests drive createGaslessClient.
    asMock(isChainSupportedForGasless).mockReturnValue(true);
    asMock(createPrivySignerForGasless).mockResolvedValue("signer");
    asMock(getGaslessSigner).mockImplementation(async (_client: unknown, chainId: number) =>
      signerOnChain(chainId)
    );

    mockGetSigner.mockReset();
    mockGetSigner.mockImplementation(async (browserProvider?: unknown) => ({
      getAddress: vi.fn().mockResolvedValue(EMBEDDED_WALLET_ADDRESS),
      provider: browserProvider ?? {
        getNetwork: vi.fn().mockResolvedValue({ chainId: 1n }),
      },
    }));
  });

  it("retries gasless client creation after a transient RPC error, then succeeds", async () => {
    // The ZeroDev RPC blips once (Jorge's exact "could not coalesce" failure),
    // then recovers — the retry must keep the user on the gasless path.
    setupEmailUser();
    asMock(createGaslessClient)
      .mockRejectedValueOnce(
        new Error('could not coalesce error (error={ "message": "HTTP request failed" })')
      )
      .mockResolvedValueOnce({ account: {} });

    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useZeroDevSigner());

      const promise = result.current.getAttestationSigner(10);
      await vi.runAllTimersAsync();
      const signer = await promise;

      expect(await chainIdOf(signer)).toBe(10);
      expect(createGaslessClient).toHaveBeenCalledTimes(2);
      // Stayed on gasless — never touched the embedded-direct provider switch.
      expect(mockPrivyState.wallets[0].getEthereumProvider).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("falls back to the embedded-direct path after exhausting gasless retries", async () => {
    // ZeroDev stays down for every attempt → after the bounded retries the hook
    // must recover by switching the embedded wallet and signing directly.
    setupEmailUser();
    asMock(createGaslessClient).mockRejectedValue(new Error("could not coalesce error"));
    const provider = await mockPrivyState.wallets[0].getEthereumProvider();

    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useZeroDevSigner());

      const promise = result.current.getAttestationSigner(10);
      await vi.runAllTimersAsync();
      const signer = await promise;

      expect(await chainIdOf(signer)).toBe(10);
      // Exhausted the bounded retry budget (GASLESS_MAX_ATTEMPTS).
      expect(createGaslessClient).toHaveBeenCalledTimes(3);
      // Recovered via the embedded-direct provider-level switch.
      expect(provider.request).toHaveBeenCalledWith({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xa" }],
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not retry or fall back on a GaslessProviderError", async () => {
    // Provider-specific failures are deliberate — surface them immediately so
    // the real cause reaches Sentry, with no wasted retries or fallback.
    setupEmailUser();
    asMock(createGaslessClient).mockRejectedValue(
      new GaslessProviderError("zerodev provider down", "zerodev", 10)
    );
    const embeddedWallet = mockPrivyState.wallets[0];

    const { result } = renderHook(() => useZeroDevSigner());

    await act(async () => {
      await expect(result.current.getAttestationSigner(10)).rejects.toThrow(
        /zerodev provider down/i
      );
    });

    expect(createGaslessClient).toHaveBeenCalledTimes(1);
    // Never fell through to the embedded-direct path.
    expect(embeddedWallet.getEthereumProvider).not.toHaveBeenCalled();
  });
});
