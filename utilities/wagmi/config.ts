import { http, createStorage, cookieStorage } from "@wagmi/core";
import {
  arbitrum,
  baseSepolia,
  optimism,
  optimismSepolia,
  celo,
  sei,
  sepolia,
} from "viem/chains";
import { createConfig } from "@privy-io/wagmi";
import { appNetwork } from "../network";
import { envVars } from "../enviromentVars";

export const config = createConfig({
  chains: appNetwork,
  transports: {
    [optimism.id]: http(envVars.RPC.OPTIMISM),
    [arbitrum.id]: http(envVars.RPC.ARBITRUM),
    [baseSepolia.id]: http(envVars.RPC.BASE_SEPOLIA),
    [optimismSepolia.id]: http(envVars.RPC.OPT_SEPOLIA),
    [celo.id]: http(envVars.RPC.CELO),
    [sei.id]: http(envVars.RPC.SEI),
    [sepolia.id]: http(envVars.RPC.SEPOLIA),
  },
  ssr: false,
  storage: createStorage({
    storage: cookieStorage,
  }),
});

export function getWagmiConfig() {
  return config;
}
