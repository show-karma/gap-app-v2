"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClientProvider } from "@tanstack/react-query";
import { PROJECT_NAME } from "@/constants/brand";
import type { TenantConfig } from "@/src/infrastructure/types/tenant";
import { envVars } from "@/utilities/enviromentVars";
import { appNetwork } from "@/utilities/network";
import { queryClient } from "@/utilities/query-client";
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
 * @deprecated Import from `@/utilities/query-client` instead.
 * This re-export exists only for backwards compatibility and will be removed in a future version.
 */
export { queryClient };

interface PrivyProviderWrapperProps {
  children: React.ReactNode;
  tenantConfig?: TenantConfig | null;
}

/**
 * Privy SDK requires HTTPS for all hostnames except localhost/127.0.0.1.
 * For local whitelabel dev on custom hostnames (e.g. test-wl.local),
 * we skip Privy and render with QueryClientProvider only (no auth).
 */
function isPrivyCompatible(): boolean {
  if (typeof window === "undefined") return true;
  const { protocol, hostname } = window.location;
  if (protocol === "https:" || protocol === "chrome-extension:") return true;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".localhost"))
    return true;
  return false;
}

export default function PrivyProviderWrapper({
  children,
  tenantConfig,
}: PrivyProviderWrapperProps) {
  const privyAppId = envVars.PRIVY_APP_ID;

  if (!privyAppId) {
    console.error(
      "NEXT_PUBLIC_PRIVY_APP_ID is not defined. Please set it in your environment variables."
    );
    return (
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={privyConfig}>{children}</WagmiProvider>
      </QueryClientProvider>
    );
  }

  // On non-HTTPS custom hostnames, Privy throws. Render without auth for local testing.
  if (!isPrivyCompatible()) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
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
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={privyConfig}>{children}</WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
