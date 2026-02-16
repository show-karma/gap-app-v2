"use client";

import { PrivyProvider, type WalletListEntry } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { useCallback, useMemo, useState } from "react";
import { WalletConnectDeferContext } from "@/components/Utilities/WalletConnectDeferContext";
import { PROJECT_NAME } from "@/constants/brand";
import { envVars } from "@/utilities/enviromentVars";
import { appNetwork } from "@/utilities/network-chains";
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
  const [enableWalletConnect, setEnableWalletConnect] = useState(
    () => process.env.NODE_ENV === "test"
  );
  const enableWalletConnectForAuth = useCallback(() => {
    setEnableWalletConnect(true);
  }, []);

  if (!privyAppId) {
    throw new Error(
      "NEXT_PUBLIC_PRIVY_APP_ID is not defined. Please set it in your environment variables."
    );
  }

  const defaultChain = appNetwork[0];
  const walletList: WalletListEntry[] = enableWalletConnect
    ? ["detected_wallets", "metamask", "rainbow", "rabby_wallet", "wallet_connect"]
    : [];
  const loginMethods: Array<"email" | "google" | "wallet"> = enableWalletConnect
    ? ["email", "google", "wallet"]
    : ["email", "google"];
  const walletConnectContextValue = useMemo(
    () => ({
      enableWalletConnect: enableWalletConnectForAuth,
      walletConnectEnabled: enableWalletConnect,
    }),
    [enableWalletConnect, enableWalletConnectForAuth]
  );

  return (
    <WalletConnectDeferContext.Provider value={walletConnectContextValue}>
      <PrivyProvider
        appId={privyAppId}
        config={{
          appearance: {
            theme: "light",
            accentColor: "#1de9b6",
            logo: "https://karmahq.xyz/logo/karma-logo-light.svg",
            landingHeader: `Connect to ${PROJECT_NAME}`,
            showWalletLoginFirst: false,
            walletList,
          },
          embeddedWallets: {
            ethereum: {
              createOnLogin: "users-without-wallets",
            },
          },
          loginMethods,
          defaultChain: defaultChain,
          supportedChains: appNetwork,
          externalWallets: {
            walletConnect: {
              enabled: enableWalletConnect,
            },
          },
          walletConnectCloudProjectId: enableWalletConnect
            ? envVars.PROJECT_ID || undefined
            : undefined,
        }}
      >
        <WagmiProvider config={privyConfig}>{children}</WagmiProvider>
      </PrivyProvider>
    </WalletConnectDeferContext.Provider>
  );
}
