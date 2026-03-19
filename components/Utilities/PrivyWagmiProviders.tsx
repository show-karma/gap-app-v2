"use client";

import { PrivyProvider, usePrivy, useWallets } from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { WagmiProvider } from "@privy-io/wagmi";
import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { PROJECT_NAME } from "@/constants/brand";
import { type PrivyBridgeValue, usePrivyBridgeSetter } from "@/contexts/privy-bridge-context";
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
 * Reads from Privy/Wagmi hooks and pushes values into PrivyBridgeContext
 * via the setter. Renders null — acts as a sidecar bridge.
 *
 * Lives inside PrivyProvider + @privy-io/wagmi WagmiProvider, so
 * usePrivy(), useWallets(), useSmartWallets(), and useAccount() are safe to call.
 */
function PrivyBridgeUpdater() {
  const setBridge = usePrivyBridgeSetter();
  const privy = usePrivy();
  const { wallets } = useWallets();
  const { client: smartWalletClient } = useSmartWallets();
  const { isConnected } = useAccount();

  // Store latest values in refs so the effect always has fresh data.
  // Depend on primitives only (stable across renders when unchanged).
  const privyRef = useRef(privy);
  const walletsRef = useRef(wallets);
  const smartWalletClientRef = useRef(smartWalletClient);
  privyRef.current = privy;
  walletsRef.current = wallets;
  smartWalletClientRef.current = smartWalletClient;

  const userId = privy.user?.id;
  const walletCount = wallets.length;

  useEffect(() => {
    const p = privyRef.current;
    const w = walletsRef.current;
    setBridge({
      ready: p.ready,
      authenticated: p.authenticated,
      user: p.user,
      login: p.login,
      logout: p.logout,
      getAccessToken: p.getAccessToken,
      connectWallet: p.connectWallet,
      wallets: w,
      smartWalletClient: smartWalletClientRef.current,
      isConnected,
    });
  }, [
    setBridge,
    privy.ready,
    privy.authenticated,
    userId,
    walletCount,
    smartWalletClient,
    isConnected,
  ]);

  return null;
}

interface PrivyWagmiProvidersProps {
  tenantConfig?: TenantConfig | null;
}

/**
 * Privy SDK requires HTTPS for all hostnames except localhost/127.0.0.1.
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
 * Sidecar component — renders PrivyProvider + @privy-io/wagmi WagmiProvider + bridge.
 * Returns null (no children). Loaded via dynamic import() from PrivyProviderWrapper
 * to keep the Privy SDK (~400KB) out of the initial bundle.
 *
 * The @privy-io/wagmi WagmiProvider is intentionally separate from the outer
 * WagmiProvider (from wagmi) in PrivyProviderWrapper. It wraps wagmi's native
 * provider and adds PrivyWagmiConnector for Privy↔wagmi wallet sync. Both
 * share the same privyConfig store. reconnectOnMount=false prevents duplicate
 * wallet reconnection.
 */
export default function PrivyWagmiProviders({ tenantConfig }: PrivyWagmiProvidersProps) {
  const privyAppId = envVars.PRIVY_APP_ID;

  if (!privyAppId) {
    console.error(
      "NEXT_PUBLIC_PRIVY_APP_ID is not defined. Please set it in your environment variables."
    );
    return null;
  }

  if (!isPrivyCompatible()) {
    return null;
  }

  const defaultChain = appNetwork[0];

  // Use current origin for relative logo paths so whitelabel custom domains
  // resolve correctly. Fall back to VERCEL_URL during SSR (no window).
  const origin = typeof window !== "undefined" ? window.location.origin : envVars.VERCEL_URL;
  const accentColor = tenantConfig?.theme?.colors?.primary || "#1de9b6";
  const logo = tenantConfig?.assets?.logo
    ? tenantConfig.assets.logo.startsWith("http")
      ? tenantConfig.assets.logo
      : `${origin}${tenantConfig.assets.logo}`
    : `${origin}/logo/karma-logo-light.svg`;
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
          // EVM-only app — suppress Solana wallet UI in the connect modal.
          walletChainType: "ethereum-only",
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
          // Explicitly disable Solana embedded wallets. The Privy SDK (v3.8)
          // bundles Solana support (~197KB) internally and tree-shaking cannot
          // remove it. This config prevents Solana wallet creation at runtime.
          // Bundle-level elimination requires upstream changes in Privy's
          // package structure (separate entry points with proper code-splitting).
          solana: {
            createOnLogin: "off",
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
        <PrivyBridgeUpdater />
      </WagmiProvider>
    </PrivyProvider>
  );
}
