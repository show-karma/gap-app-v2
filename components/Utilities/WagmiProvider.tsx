"use client";
import { WagmiProvider, createConfig, http } from "wagmi";
import {
  RainbowKitProvider,
  connectorsForWallets,
  lightTheme,
} from "@rainbow-me/rainbowkit";
import { appNetwork, envVars } from "@/utilities";
import { customWalletConnectConnector } from "@/utilities/wagmi/walletConnectConnector";
import { arbitrum, optimism, optimismGoerli, sepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  rainbowWallet,
  walletConnectWallet,
  metaMaskWallet,
  injectedWallet,
  coinbaseWallet,
} from "@rainbow-me/rainbowkit/wallets";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [
        customWalletConnectConnector,
        // walletConnectWallet,
        metaMaskWallet,
        rainbowWallet,
        coinbaseWallet,
        injectedWallet,
      ],
    },
  ],
  {
    appName: "Karma GAP",
    projectId: envVars.PROJECT_ID,
    walletConnectParameters: {
      metadata: {
        name: "Karma GAP",
        description: "Karma GAP",
        url: "https://gap.karmahq.xyz",
        icons: ["https://gap.karmahq.xyz/favicon.png"],
      },
    },
  }
);

export const wagmiConfig = createConfig({
  chains: appNetwork as any,
  transports: {
    [optimism.id]: envVars.ALCHEMY.OPTIMISM
      ? http(envVars.ALCHEMY.OPTIMISM)
      : http(),
    [arbitrum.id]: envVars.ALCHEMY.ARBITRUM
      ? http(envVars.ALCHEMY.ARBITRUM)
      : http(),
    [optimismGoerli.id]: http(),
    [sepolia.id]: envVars.ALCHEMY.SEPOLIA
      ? http(envVars.ALCHEMY.SEPOLIA)
      : http(),
  },
  connectors,
});
const WagmiWrapper = ({ children }: { children: React.ReactNode }) => {
  // const connectors = connectorsForWallets([
  //   {
  //     groupName: "Recommended",
  //     wallets: [
  //       customWalletConnectConnector(chains),
  //     ],
  //   },
  // ]);

  const queryClient = new QueryClient();
  return (
    <WagmiProvider config={wagmiConfig}>
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
    </WagmiProvider>
  );
};
export default WagmiWrapper;
