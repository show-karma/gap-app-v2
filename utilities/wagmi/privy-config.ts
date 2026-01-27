import { createConfig } from "@privy-io/wagmi";
import { type Config, http } from "@wagmi/core";
import {
  arbitrum,
  baseSepolia,
  celo,
  lisk,
  optimism,
  optimismSepolia,
  scroll,
  sei,
  sepolia,
} from "@wagmi/core/chains";
import { envVars } from "../enviromentVars";
import { appNetwork } from "../network";

/**
 * HTTP Transport Configuration
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
  retryCount: 4,
  retryDelay: 200,
  timeout: 20_000,
};

export const privyConfig = createConfig({
  chains: appNetwork,
  transports: {
    [optimism.id]: http(envVars.RPC.OPTIMISM, httpTransportOptions),
    [arbitrum.id]: http(envVars.RPC.ARBITRUM, httpTransportOptions),
    [baseSepolia.id]: http(envVars.RPC.BASE_SEPOLIA, httpTransportOptions),
    [optimismSepolia.id]: http(envVars.RPC.OPT_SEPOLIA, httpTransportOptions),
    [celo.id]: http(envVars.RPC.CELO, httpTransportOptions),
    [sei.id]: http(envVars.RPC.SEI, httpTransportOptions),
    [sepolia.id]: http(envVars.RPC.SEPOLIA, httpTransportOptions),
    [lisk.id]: http(envVars.RPC.LISK, httpTransportOptions),
    [scroll.id]: http(envVars.RPC.SCROLL, httpTransportOptions),
  },
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
