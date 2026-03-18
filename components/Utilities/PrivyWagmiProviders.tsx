"use client";

import { PrivyProvider, usePrivy, useWallets } from "@privy-io/react-auth";
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
 * via the setter. Renders nothing — it's a side-effect-only component.
 *
 * This lives inside PrivyProvider + @privy-io/wagmi WagmiProvider, so
 * usePrivy(), useWallets(), and useAccount() are safe to call.
 */
function PrivyBridgeUpdater() {
  const setBridge = usePrivyBridgeSetter();
  const privy = usePrivy();
  const { wallets } = useWallets();
  const { isConnected } = useAccount();

  // Store latest values in refs so the effect always has fresh data.
  // The effect depends only on primitive values (no object identity issues),
  // and reads functions/objects from refs to avoid stale closures.
  const privyRef = useRef(privy);
  const walletsRef = useRef(wallets);
  privyRef.current = privy;
  walletsRef.current = wallets;

  // Depend on primitives only — these are stable across renders when unchanged.
  // When any of these change, push the full snapshot (including functions from refs).
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
      isConnected,
    });
  }, [setBridge, privy.ready, privy.authenticated, userId, walletCount, isConnected]);

  return null;
}

interface PrivySidecarProps {
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
 * Sidecar component — renders as a sibling to children, NOT a wrapper.
 *
 * Mounts PrivyProvider + @privy-io/wagmi WagmiProvider + PrivyBridgeUpdater.
 * PrivyBridgeUpdater reads Privy/Wagmi hooks and pushes values into the
 * shared PrivyBridgeContext so that useAuth() (and anything else that
 * reads the bridge) gets live auth state.
 *
 * Renders null — no visible output. The @privy-io/wagmi WagmiProvider's
 * PrivyWagmiConnector syncs Privy wallets to the shared wagmi config store,
 * which the outer WagmiProvider's consumers (useAccount, etc.) read from.
 */
export default function PrivySidecar({ tenantConfig }: PrivySidecarProps) {
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

  const accentColor = tenantConfig?.theme?.colors?.primary || "#1de9b6";
  const baseUrl = envVars.VERCEL_URL;
  const logo = tenantConfig?.assets?.logo
    ? tenantConfig.assets.logo.startsWith("http")
      ? tenantConfig.assets.logo
      : `${baseUrl}${tenantConfig.assets.logo}`
    : `${baseUrl}/logo/karma-logo-light.svg`;
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
      {/*
        This WagmiProvider (from @privy-io/wagmi) is intentionally separate from
        the outer WagmiProvider (from wagmi) in PrivyProviderWrapper.

        @privy-io/wagmi's WagmiProvider wraps wagmi's native WagmiProvider and
        adds PrivyWagmiConnector — an internal component that syncs Privy-managed
        wallets to wagmi's shared config store (Zustand). Without it, wallet
        connections made through Privy wouldn't be visible to wagmi hooks.

        Both providers share the same `privyConfig` object, so they read/write
        the same underlying store. The outer provider serves app children (SSR +
        hook support), this inner one exists only for the Privy ↔ wagmi sync.
        reconnectOnMount=false prevents the inner provider from re-triggering
        wallet reconnection that the outer provider already handles.
      */}
      <WagmiProvider config={privyConfig} reconnectOnMount={false}>
        <PrivyBridgeUpdater />
      </WagmiProvider>
    </PrivyProvider>
  );
}
