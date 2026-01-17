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

// Optimized HTTP transport configuration
// - batch: true enables request batching to reduce RPC calls
// - retryCount: limits retries to prevent excessive requests on failure
const createOptimizedTransport = (url: string) =>
  http(url, {
    batch: true,
    retryCount: 2,
  });

export const privyConfig = createConfig({
  chains: appNetwork,
  transports: {
    [optimism.id]: createOptimizedTransport(envVars.RPC.OPTIMISM),
    [arbitrum.id]: createOptimizedTransport(envVars.RPC.ARBITRUM),
    [baseSepolia.id]: createOptimizedTransport(envVars.RPC.BASE_SEPOLIA),
    [optimismSepolia.id]: createOptimizedTransport(envVars.RPC.OPT_SEPOLIA),
    [celo.id]: createOptimizedTransport(envVars.RPC.CELO),
    [sei.id]: createOptimizedTransport(envVars.RPC.SEI),
    [sepolia.id]: createOptimizedTransport(envVars.RPC.SEPOLIA),
    [lisk.id]: createOptimizedTransport(envVars.RPC.LISK),
    [scroll.id]: createOptimizedTransport(envVars.RPC.SCROLL),
  },
  ssr: true,
  // Reduce polling frequency for balance/block updates
  pollingInterval: 30_000, // 30 seconds instead of default 4 seconds
}) as unknown as Config;

export function getPrivyWagmiConfig() {
  return privyConfig;
}
