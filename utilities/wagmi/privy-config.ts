import { cookieStorage, createConfig, createStorage, http } from "@wagmi/core"
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
} from "@wagmi/core/chains"
import { envVars } from "../enviromentVars"
import { appNetwork } from "../network"

// Create a Wagmi config compatible with Privy
// This doesn't include connectors as Privy manages wallet connections
export const privyConfig = createConfig({
  chains: appNetwork,
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
})

export function getPrivyWagmiConfig() {
  return privyConfig
}
