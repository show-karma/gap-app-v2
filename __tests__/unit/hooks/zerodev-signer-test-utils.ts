/**
 * Shared chain-aware mock helpers for the useZeroDevSigner test suites.
 *
 * Extracted so the hook's tests stay under the per-file size budget
 * (quality-limits.json: 800 lines for *.test.ts). These helpers model an actual
 * *chain identity* and the Privy `switchChain` propagation race — the gap that
 * let GAP-FRONTEND-1T9 ("Network mainnet not supported.") ship.
 *
 * Note: this is intentionally NOT a *.test.ts file, so vitest does not run it as
 * a suite; it only provides reusable fixtures. The per-file `vi.mock`/`vi.hoisted`
 * wiring stays in each test file because module mocks are file-scoped.
 */
import { vi } from "vitest";

export const EMBEDDED_WALLET_ADDRESS = "0xEmbedded1111111111111111111111111111111111";
export const EXTERNAL_WALLET_ADDRESS = "0xExternal2222222222222222222222222222222222";

export interface MockUser {
  linkedAccounts: Array<{ type: string }>;
}

export interface EmbeddedWalletOptions {
  /** Chain the embedded provider reports before any switch. Privy embedded
   *  wallets default to mainnet (chain 1) — the GAP-FRONTEND-23C root cause. */
  initialChainId?: number;
  /** How many times `wallet_switchEthereumChain` throws before it succeeds.
   *  0 = switches first try; Number.POSITIVE_INFINITY = provider can never switch
   *  (stuck on chain 1), mirroring the failure mode. */
  switchFailsTimes?: number;
}

export interface MockWallet {
  address: string;
  walletClientType: string;
  switchChain: ReturnType<typeof vi.fn>;
  getEthereumProvider: ReturnType<typeof vi.fn>;
}

/** A signer whose `.provider.getNetwork()` reports `chainId` — mirrors the
 *  shape the production guard (`assertSignerOnChain`) reads. */
export function signerOnChain(chainId: number, address = EMBEDDED_WALLET_ADDRESS) {
  return {
    getAddress: vi.fn().mockResolvedValue(address),
    provider: {
      getNetwork: vi.fn().mockResolvedValue({ chainId: BigInt(chainId) }),
    },
  };
}

export async function chainIdOf(signer: unknown): Promise<number> {
  const s = signer as { provider: { getNetwork: () => Promise<{ chainId: bigint }> } };
  return Number((await s.provider.getNetwork()).chainId);
}

export async function addressOf(signer: unknown): Promise<string> {
  return (signer as { getAddress: () => Promise<string> }).getAddress();
}

export function createEmbeddedWallet(
  address = EMBEDDED_WALLET_ADDRESS,
  { initialChainId = 1, switchFailsTimes = 0 }: EmbeddedWalletOptions = {}
): MockWallet {
  // A single stable EIP-1193 provider instance (Privy returns the same instance),
  // whose chain is mutated by `wallet_switchEthereumChain` — mirroring Privy's
  // Embedded1193Provider, where `eth_chainId` returns `this.chainId` and only the
  // provider-level switch updates it. The high-level `switchChain()` does NOT.
  let providerChainId = initialChainId;
  let failsLeft = switchFailsTimes;
  const provider = {
    // `__chainId` mirrors the live chain for the BrowserProvider mock's getNetwork().
    get __chainId() {
      return providerChainId;
    },
    request: vi
      .fn()
      .mockImplementation(
        async ({ method, params }: { method: string; params?: Array<{ chainId?: string }> }) => {
          if (method === "eth_chainId") return `0x${providerChainId.toString(16)}`;
          if (method === "wallet_switchEthereumChain") {
            if (failsLeft > 0) {
              failsLeft -= 1;
              throw new Error("wallet_switchEthereumChain failed");
            }
            providerChainId = Number(params?.[0]?.chainId);
            return null;
          }
          return undefined;
        }
      ),
  };

  return {
    address,
    walletClientType: "privy",
    // High-level switchChain is intentionally a no-op: the production code no
    // longer relies on it (it only updates Privy's React state, not the provider).
    switchChain: vi.fn(),
    getEthereumProvider: vi.fn().mockResolvedValue(provider),
  };
}

export function createExternalWallet(address = EXTERNAL_WALLET_ADDRESS): MockWallet {
  return {
    address,
    walletClientType: "metamask",
    switchChain: vi.fn().mockResolvedValue(undefined),
    getEthereumProvider: vi.fn().mockResolvedValue({ request: vi.fn() }),
  };
}
