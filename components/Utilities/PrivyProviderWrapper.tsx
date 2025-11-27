"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { appNetwork } from "@/utilities/network";
import { privyConfig } from "@/utilities/wagmi/privy-config";
import { WagmiProvider } from '@privy-io/wagmi';
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";
import { envVars } from "@/utilities/enviromentVars";
import { PROJECT_NAME } from "@/constants/brand";
import dynamic from "next/dynamic";

const MoonPayProvider = dynamic(
  () => import("@moonpay/moonpay-react").then((mod) => mod.MoonPayProvider),
  { ssr: false }
);

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

  const moonpayApiKey = envVars.MOONPAY_PUBLIC_KEY;

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
          walletList: ['detected_wallets', 'metamask', 'wallet_connect_qr', 'rainbow', 'rabby_wallet', 'wallet_connect']
        },
        loginMethods: ["wallet"],
        defaultChain: defaultChain,
        supportedChains: appNetwork,
        externalWallets: {
          walletConnect: {
            enabled: true,
          },
        },
        walletConnectCloudProjectId:
          envVars.PROJECT_ID || undefined,
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={privyConfig}>
          <MoonPayProvider apiKey={moonpayApiKey || ""} debug={process.env.NODE_ENV === "development"}>
            {children}
          </MoonPayProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}