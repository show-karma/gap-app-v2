"use client";
import { WagmiProvider as WagmiConfig, http, createConfig } from "wagmi";
import {
  RainbowKitProvider,
  connectorsForWallets,
  lightTheme,
} from "@rainbow-me/rainbowkit";
import { arbitrum, optimism, optimismSepolia } from "viem/chains";
import { appNetwork } from "@/utilities/network";

import { envVars } from "@/utilities/enviromentVars";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  coinbaseWallet,
  injectedWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";

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
    appIcon: "https://gap.karmahq.xyz/images/favicon.png",
  }
);

export const config = createConfig({
  chains: appNetwork as any,
  connectors,
  transports: {
    [arbitrum.id]: http(envVars.RPC.ARBITRUM),
    [optimism.id]: http(envVars.RPC.OPTIMISM),
    [optimismSepolia.id]: http(envVars.RPC.OPT_SEPOLIA),
  },
});
const WagmiProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient();
  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={lightTheme({
            accentColor: "#E40536",
            accentColorForeground: "white",
            borderRadius: "medium",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
};
export default WagmiProvider;
