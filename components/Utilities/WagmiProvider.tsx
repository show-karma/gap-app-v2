"use client";
import { WagmiConfig, configureChains, createConfig } from "wagmi";
import {
  RainbowKitProvider,
  connectorsForWallets,
  lightTheme,
} from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  injectedWallet,
  metaMaskWallet,
  rainbowWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { arbitrum, baseSepolia, optimism, optimismSepolia, celo } from "viem/chains";
import { publicProvider } from "wagmi/providers/public";
import { customWalletConnectConnector } from "@/utilities/wagmi/walletConnectConnector";
import { appNetwork } from "@/utilities/network";
import { envVars } from "@/utilities/enviromentVars";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";

const { chains, publicClient, webSocketPublicClient } = configureChains(
  appNetwork as any,
  [
    jsonRpcProvider({
      rpc(chain) {
        if (chain.id === optimism.id) {
          return {
            http: envVars.RPC.OPTIMISM,
            webSocket: chain.rpcUrls.default.webSocket?.[0],
          };
        }
        if (chain.id === arbitrum.id) {
          return {
            http: envVars.RPC.ARBITRUM,
            webSocket: chain.rpcUrls.default.webSocket?.[0],
          };
        }

        if (chain.id === baseSepolia.id) {
          return {
            http: envVars.RPC.BASE_SEPOLIA,
            webSocket: chain.rpcUrls.default.webSocket?.[0],
          };
        }
        if (chain.id === optimismSepolia.id) {
          return {
            http: envVars.RPC.OPT_SEPOLIA,
            webSocket: chain.rpcUrls.default.webSocket?.[0],
          };
        }

        if (chain.id === celo.id) {
          return {
            http: envVars.RPC.CELO,
            webSocket: chain.rpcUrls.default.webSocket?.[0],
          };
        }

        return {
          http: chain.rpcUrls.default.http[0],
          webSocket: chain.rpcUrls.default.webSocket?.[0],
        };
      },
    }),
    publicProvider(),
  ]
);

const connectors = connectorsForWallets([
  {
    groupName: "Recommended",
    wallets: [
      metaMaskWallet({
        chains,
        projectId: process.env.NEXT_PUBLIC_PROJECT_ID || "",
      }),
      rainbowWallet({
        chains,
        projectId: process.env.NEXT_PUBLIC_PROJECT_ID || "",
      }),
      coinbaseWallet({
        chains,
        appName: `Karma GAP`,
      }),
      customWalletConnectConnector(chains),
      injectedWallet({ chains }),
    ],
  },
]);

export const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});
const WagmiProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <RainbowKitProvider
      chains={chains}
      theme={lightTheme({
        accentColor: "#E40536",
        accentColorForeground: "white",
        borderRadius: "medium",
      })}
    >
      {children}
    </RainbowKitProvider>
  );
};
export default WagmiProvider;
