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
import { WalletConnector } from "@privy-io/react-auth";

import {
  coinbaseWallet,
  walletConnect,
  injected,
  safe,
  metaMask,
} from "wagmi/connectors";

export const config = createConfig({
  // connectors: [
  //   walletConnect({
  //     projectId: envVars.PROJECT_ID,
  //     showQrModal: true,
  //     qrModalOptions: {
  //       themeMode: "dark",
  //     },
  //   }),
  //   metaMask(),
  //   coinbaseWallet(),
  //   injected(),
  //   safe(),
  // ],
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
