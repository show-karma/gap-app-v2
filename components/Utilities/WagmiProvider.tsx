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
import { alchemyProvider } from "wagmi/providers/alchemy";
import { publicProvider } from "wagmi/providers/public";
import { customWalletConnectConnector } from "@/utilities/wagmi/walletConnectConnector";
import { appNetwork } from "@/utilities/network";

const WagmiProvider = ({ children }: { children: React.ReactNode }) => {
  const { chains, publicClient, webSocketPublicClient } = configureChains(
    appNetwork as any,
    [
      process.env.NEXT_PUBLIC_ALCHEMY_KEY
        ? alchemyProvider({
            apiKey: process.env.NEXT_PUBLIC_ALCHEMY_KEY,
          })
        : publicProvider(),
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

  const wagmiConfig = createConfig({
    autoConnect: true,
    connectors,
    publicClient,
    webSocketPublicClient,
  });
  return (
    <WagmiConfig config={wagmiConfig}>
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
    </WagmiConfig>
  );
};
export default WagmiProvider;
