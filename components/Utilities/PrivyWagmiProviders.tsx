"use client";

import { PrivyProvider, usePrivy, useWallets } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { type ReactNode, useMemo } from "react";
import { useAccount } from "wagmi";
import { PROJECT_NAME } from "@/constants/brand";
import { PrivyBridgeContext, type PrivyBridgeValue } from "@/contexts/privy-bridge-context";
import type { TenantConfig } from "@/src/infrastructure/types/tenant";
import { envVars } from "@/utilities/enviromentVars";
import { appNetwork } from "@/utilities/network";
import { privyConfig } from "@/utilities/wagmi/privy-config";

// Security policy — explicit review required before adding or removing methods/wallets
const LOGIN_METHODS = ["email", "google", "wallet", "farcaster"] as const;
const WALLET_LIST = [
  "detected_wallets",
  "metamask",
  "rainbow",
  "rabby_wallet",
  "wallet_connect",
  "safe",
] as const;

/**
 * Bridge component that reads from Privy/Wagmi hooks and provides values
 * via PrivyBridgeContext, so that useAuth() never needs to call usePrivy() directly.
 */
function PrivyBridge({ children }: { children: ReactNode }) {
  const privy = usePrivy();
  const { wallets } = useWallets();
  const { isConnected } = useAccount();

  const value = useMemo<PrivyBridgeValue>(
    () => ({
      ready: privy.ready,
      authenticated: privy.authenticated,
      user: privy.user,
      login: privy.login,
      logout: privy.logout,
      getAccessToken: privy.getAccessToken,
      connectWallet: privy.connectWallet,
      wallets,
      isConnected,
    }),
    [
      privy.ready,
      privy.authenticated,
      privy.user,
      privy.login,
      privy.logout,
      privy.getAccessToken,
      privy.connectWallet,
      wallets,
      isConnected,
    ]
  );

  return <PrivyBridgeContext.Provider value={value}>{children}</PrivyBridgeContext.Provider>;
}

interface PrivyWagmiProvidersProps {
  children: ReactNode;
  tenantConfig?: TenantConfig | null;
}

/**
 * Privy SDK requires HTTPS for all hostnames except localhost/127.0.0.1.
 * For local whitelabel dev on custom hostnames (e.g. test-wl.local),
 * we skip Privy and render without auth for local testing.
 */
function isPrivyCompatible(): boolean {
  if (typeof window === "undefined") return true;
  const { protocol, hostname } = window.location;
  if (protocol === "https:" || protocol === "chrome-extension:") return true;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".localhost"))
    return true;
  return false;
}

/**
 * Deferred Privy providers — loaded via dynamic import after hydration.
 *
 * WagmiProvider is already in the shell (PrivyProviderWrapper), so this
 * component only adds PrivyProvider + PrivyBridge on top. This keeps
 * the Privy SDK (~400KB+) out of the initial bundle while wagmi SSR
 * continues to work.
 */
export default function PrivyWagmiProviders({ children, tenantConfig }: PrivyWagmiProvidersProps) {
  const privyAppId = envVars.PRIVY_APP_ID;

  if (!privyAppId) {
    console.error(
      "NEXT_PUBLIC_PRIVY_APP_ID is not defined. Please set it in your environment variables."
    );
    return <>{children}</>;
  }

  // On non-HTTPS custom hostnames, Privy throws. Render without auth for local testing.
  if (!isPrivyCompatible()) {
    return <>{children}</>;
  }

  const defaultChain = appNetwork[0];

  // Tenant-aware Privy appearance
  const accentColor = tenantConfig?.theme?.colors?.primary || "#1de9b6";
  const logo = tenantConfig?.assets?.logo
    ? tenantConfig.assets.logo.startsWith("http")
      ? tenantConfig.assets.logo
      : `https://karmahq.xyz${tenantConfig.assets.logo}`
    : "https://karmahq.xyz/logo/karma-logo-light.svg";
  const landingHeader = tenantConfig
    ? `Connect to ${tenantConfig.name}`
    : `Connect to ${PROJECT_NAME}`;

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        appearance: {
          theme: "light",
          accentColor: accentColor as `#${string}`,
          logo,
          landingHeader,
          showWalletLoginFirst: false,
          walletList: [...WALLET_LIST],
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
        loginMethods: [...LOGIN_METHODS],
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
      <WagmiProvider config={privyConfig} reconnectOnMount={false}>
        <PrivyBridge>{children}</PrivyBridge>
      </WagmiProvider>
    </PrivyProvider>
  );
}
