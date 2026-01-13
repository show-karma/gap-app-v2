"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PROJECT_NAME } from "@/constants/brand";
import { envVars } from "@/utilities/enviromentVars";
import { appNetwork } from "@/utilities/network";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";
import { privyConfig } from "@/utilities/wagmi/privy-config";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: defaultQueryOptions,
  },
});

interface PrivyProviderWrapperProps {
  children: React.ReactNode;
}

export default function PrivyProviderWrapper({ children }: PrivyProviderWrapperProps) {
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
          accentColor: "#1de9b6",
          logo: "https://karmahq.xyz/logo/karma-logo-light.svg",
          landingHeader: `Connect to ${PROJECT_NAME}`,
          showWalletLoginFirst: false,
          walletList: ["detected_wallets", "metamask", "rainbow", "rabby_wallet", "wallet_connect"],
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
        loginMethodsAndOrder: {
          primary: [
            "email",
            "google",
            "metamask",
            `privy:${privyAppId}`, // Cross-app SSO with whitelabel apps
          ] as const,
        },
        defaultChain: defaultChain,
        supportedChains: appNetwork,
        externalWallets: {
          walletConnect: {
            enabled: true,
          },
        },
        walletConnectCloudProjectId: envVars.PROJECT_ID || undefined,
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={privyConfig}>{children}</WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
