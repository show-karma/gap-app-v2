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
  /** Chain the embedded wallet reports before any switch. Privy embedded
   *  wallets default to mainnet (chain 1) — the GAP-FRONTEND-1T9 root cause. */
  initialChainId?: number;
  /** How many `getEthereumProvider` reads still report the OLD chain after
   *  `switchChain` resolves (models Privy's switch propagation lag).
   *  0 = propagates immediately; Infinity = never propagates. */
  propagateAfterReads?: number;
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
  { initialChainId = 1, propagateAfterReads = 0 }: EmbeddedWalletOptions = {}
): MockWallet {
  let reportedChainId = initialChainId;
  let targetChainId = initialChainId;
  let readsUntilPropagation = propagateAfterReads;

  return {
    address,
    walletClientType: "privy",
    switchChain: vi.fn().mockImplementation(async (id: number) => {
      targetChainId = id;
      // When there is no propagation lag the switch is reflected immediately.
      if (readsUntilPropagation <= 0) reportedChainId = id;
    }),
    getEthereumProvider: vi.fn().mockImplementation(async () => {
      const chainId = reportedChainId;
      // After enough reads the pending switch finally "propagates".
      if (readsUntilPropagation > 0) {
        readsUntilPropagation -= 1;
        if (readsUntilPropagation <= 0) reportedChainId = targetChainId;
      }
      return { request: vi.fn(), __chainId: chainId };
    }),
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
