import { http, createConfig, createStorage, cookieStorage } from "@wagmi/core";
import {
  arbitrum,
  baseSepolia,
  optimism,
  optimismSepolia,
  celo,
  sei,
  sepolia,
} from "@wagmi/core/chains";
import {
  coinbaseWallet,
  injectedWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { appNetwork } from "../network";
import { envVars } from "../enviromentVars";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [
        metaMaskWallet,
        rainbowWallet,
        coinbaseWallet,
        walletConnectWallet,
        injectedWallet,
      ],
    },
  ],
  {
    appName: "Karma GAP",
    projectId: process.env.NEXT_PUBLIC_PROJECT_ID || "",
    appDescription: "Karma GAP",
    appUrl: "https://gap.karmahq.xyz",
    appIcon: "https://gap.karmahq.xyz/favicon.ico",
  }
);

export const config = createConfig({
  chains: appNetwork,
  connectors,
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
