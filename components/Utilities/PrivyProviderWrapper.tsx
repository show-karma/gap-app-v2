"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { PROJECT_NAME } from "@/constants/brand";
import { envVars } from "@/utilities/enviromentVars";
import { appNetwork } from "@/utilities/network";
import { privyConfig } from "@/utilities/wagmi/privy-config";

interface PrivyProviderWrapperProps {
  children: React.ReactNode;
}

/**
 * Provides Privy authentication and Wagmi wallet context.
 *
 * NOTE: QueryClientProvider is intentionally NOT included here.
 * It lives in app/(app)/providers.tsx so React Query hydration works
 * independently of Privy initialization, improving LCP.
 */
export default function PrivyProviderWrapper({ children }: PrivyProviderWrapperProps) {
  const privyAppId = envVars.PRIVY_APP_ID;

  if (!privyAppId) {
    throw new Error(
      "NEXT_PUBLIC_PRIVY_APP_ID is not defined. Please set it in your environment variables."
    );
  }

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
        loginMethods: ["email", "google", "wallet"],
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
      <WagmiProvider config={privyConfig}>{children}</WagmiProvider>
    </PrivyProvider>
  );
}
