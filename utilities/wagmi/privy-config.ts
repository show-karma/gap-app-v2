import { createConfig } from "@privy-io/wagmi";
import { type Config, http } from "@wagmi/core";
import { createConfig as createMinimalConfig } from "wagmi";
import { envVars } from "../enviromentVars";
import { appNetwork } from "../network";

/**
 * HTTP Transport Configuration
 *
 * batch: true - Enables request batching to reduce RPC calls by combining
 *   multiple requests into a single HTTP call when possible.
 *
 * retryCount: 4 - Increased from default (3) to handle network congestion better.
 *   During high traffic periods or temporary RPC provider issues, additional retries
 *   help ensure blockchain operations succeed without immediately failing to users.
 *   4 retries provides a good balance between resilience and not waiting too long.
 *
 * retryDelay: 200ms - Slight increase from default (150ms) to give congested
 *   networks more time to recover between retry attempts.
 *
 * timeout: 20000ms (20s) - Extended timeout for slower RPC responses during
 *   network congestion. Default is typically 10s which can be insufficient
 *   for complex contract reads or during high network load.
 */
const httpTransportOptions = {
  batch: true,
  retryCount: 4,
  retryDelay: 200,
  timeout: 20_000,
};

/**
 * RPC URL mapping by chain ID.
 * Uses chain objects from appNetwork (viem/chains) to avoid duplicate imports
 * from @wagmi/core/chains.
 */
const rpcByChainId: Record<number, string | undefined> = {
  1: envVars.RPC.MAINNET,
  10: envVars.RPC.OPTIMISM,
  137: envVars.RPC.POLYGON,
  8453: envVars.RPC.BASE,
  42161: envVars.RPC.ARBITRUM,
  42220: envVars.RPC.CELO,
  1329: envVars.RPC.SEI,
  1135: envVars.RPC.LISK,
  534352: envVars.RPC.SCROLL,
  84532: envVars.RPC.BASE_SEPOLIA,
  11155420: envVars.RPC.OPT_SEPOLIA,
  11155111: envVars.RPC.SEPOLIA,
};

const transports = Object.fromEntries(
  appNetwork
    .filter((chain) => rpcByChainId[chain.id] !== undefined)
    .map((chain) => [chain.id, http(rpcByChainId[chain.id], httpTransportOptions)])
);

export const privyConfig = createConfig({
  chains: appNetwork,
  transports,
  /**
   * Polling Interval Configuration
   *
   * Set to 30 seconds (30_000ms) instead of the default 4 seconds.
   *
   * WHY 30 SECONDS:
   * - Reduces RPC API calls by ~7.5x (4s polling = 15 calls/min, 30s = 2 calls/min)
   * - Prevents rate limiting from RPC providers during high user activity
   * - Significantly reduces network overhead for users on slow connections
   * - Most GAP operations (attestations, grants) don't require real-time updates
   *
   * TRADE-OFFS TO BE AWARE OF:
   * - Balance updates: User wallet balances will take up to 30s to reflect changes
   * - Transaction confirmations: Tx status polling will be slower (though most UX
   *   uses explicit waitForTransactionReceipt which is unaffected)
   * - Block number updates: useBlockNumber hook updates every 30s instead of 4s
   * - Event watching: Any watched events will have up to 30s latency
   *
   * This is an intentional trade-off prioritizing reduced API calls and rate limit
   * prevention over real-time data freshness. For time-sensitive operations,
   * consider using manual refetch or waitForTransactionReceipt.
   */
  pollingInterval: 30_000,
  ssr: true,
}) as unknown as Config;

export function getPrivyWagmiConfig() {
  return privyConfig;
}

/**
 * Minimal wagmi config for the outer WagmiProvider in PrivyProviderWrapper.
 *
 * Uses wagmi's native `createConfig` (NOT @privy-io/wagmi) so that importing
 * this config does NOT pull in Privy's wagmi adapter or its connectors.
 * The inner WagmiProvider from @privy-io/wagmi (lazy-loaded in
 * PrivyWagmiProviders) overrides this once Privy initialises.
 */
export const minimalWagmiConfig = createMinimalConfig({
  chains: appNetwork as unknown as readonly [
    (typeof appNetwork)[number],
    ...(typeof appNetwork)[number][],
  ],
  transports,
  ssr: true,
  pollingInterval: 30_000,
  multiInjectedProviderDiscovery: false,
});
