import { http, createConfig, createStorage, cookieStorage } from "@wagmi/core";
import {
  arbitrum,
  baseSepolia,
  optimism,
  optimismSepolia,
  celo,
  sei,
  sepolia,
  lisk,
  scroll,
} from "@wagmi/core/chains";
import { appNetwork } from "../network";
import { envVars } from "../enviromentVars";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";

// Create standard wagmi config for Dynamic
// Dynamic manages wallet connections through its own system
export const dynamicConfig = createConfig({
  chains: appNetwork,
  multiInjectedProviderDiscovery: false, // Dynamic handles this
  transports: {
    [optimism.id]: http(envVars.RPC.OPTIMISM),
    [arbitrum.id]: http(envVars.RPC.ARBITRUM),
    [baseSepolia.id]: http(envVars.RPC.BASE_SEPOLIA),
    [optimismSepolia.id]: http(envVars.RPC.OPT_SEPOLIA),
    [celo.id]: http(envVars.RPC.CELO),
    [sei.id]: http(envVars.RPC.SEI),
    [sepolia.id]: http(envVars.RPC.SEPOLIA),
    [lisk.id]: http(envVars.RPC.LISK),
    [scroll.id]: http(envVars.RPC.SCROLL),
  },
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});

// Export wallet connectors for Dynamic
export const walletConnectors = [EthereumWalletConnectors];
