"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { appNetwork } from "@/utilities/network";
import { privyConfig } from "@/utilities/wagmi/privy-config";
import { WagmiProvider } from '@privy-io/wagmi';
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";
import { envVars } from "@/utilities/enviromentVars";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: defaultQueryOptions,
  },
});

interface PrivyProviderWrapperProps {
  children: React.ReactNode;
}

export default function PrivyProviderWrapper({
  children,
}: PrivyProviderWrapperProps) {
  const privyAppId = envVars.PRIVY_APP_ID;

  if (!privyAppId) {
    throw new Error(
      "NEXT_PUBLIC_PRIVY_APP_ID is not defined. Please set it in your environment variables."
    );
  }

  // Determine the default chain based on environment
  const defaultChain = appNetwork[0];

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        appearance: {
          theme: "light",
          accentColor: "#E40536", // Red accent color as requested
          logo: "https://gap.karmahq.xyz/logo/karma-gap-logo.png",
          landingHeader: "Connect to Karma GAP",
          showWalletLoginFirst: false,
        },
        loginMethods: ["email", "wallet", "google", "farcaster"],
        defaultChain: defaultChain,
        supportedChains: appNetwork,
        walletConnectCloudProjectId:
          envVars.PROJECT_ID || undefined,
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={privyConfig}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}