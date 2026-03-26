"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useEffect, useState } from "react";
import { WagmiProvider } from "wagmi";
import {
  PRIVY_BRIDGE_DEFAULTS,
  PrivyBridgeProvider,
  usePrivyBridgeSetter,
  usePrivyLoadRequested,
} from "@/contexts/privy-bridge-context";
import type { TenantConfig } from "@/src/infrastructure/types/tenant";
import { queryClient } from "@/utilities/query-client";
import { minimalWagmiConfig } from "@/utilities/wagmi/privy-config";

/**
 * @deprecated Import from `@/utilities/query-client` instead.
 * This re-export exists only for backwards compatibility and will be removed in a future version.
 */
export { queryClient };

type PrivyModule = {
  default: React.ComponentType<{ tenantConfig?: TenantConfig | null }>;
};

interface PrivyProviderWrapperProps {
  children: ReactNode;
  tenantConfig?: TenantConfig | null;
}

/**
 * Sidecar that lazy-loads the Privy SDK and renders it as a sibling.
 * Children stay at a stable position in the React tree — no re-mount
 * when the dynamic import resolves.
 */
function PrivyLoader({
  children,
  tenantConfig,
}: {
  children: ReactNode;
  tenantConfig?: TenantConfig | null;
}) {
  const [Privy, setPrivy] = useState<PrivyModule | null>(null);
  const setBridge = usePrivyBridgeSetter();
  const loadRequested = usePrivyLoadRequested();

  useEffect(() => {
    const doLoad = () => {
      import("./PrivyWagmiProviders").then(setPrivy).catch((err) => {
        console.error("[PrivyProviderWrapper] Failed to load Privy SDK:", err);
        setBridge({ ...PRIVY_BRIDGE_DEFAULTS, ready: true });
      });
    };

    // Returning user (has privy token) or explicit load request — load immediately
    const hasToken = typeof window !== "undefined" && localStorage.getItem("privy:token");
    if (hasToken || loadRequested) {
      doLoad();
      return;
    }

    // Anonymous user — defer to idle callback with 5s timeout
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = requestIdleCallback(doLoad, { timeout: 5000 });
      return () => cancelIdleCallback(id);
    }

    // Fallback: setTimeout for browsers without requestIdleCallback
    const timer = setTimeout(doLoad, 5000);
    return () => clearTimeout(timer);
  }, [setBridge, loadRequested]);

  return (
    <>
      {Privy && <Privy.default tenantConfig={tenantConfig} />}
      {children}
    </>
  );
}

/**
 * Root provider shell. The tree structure:
 *
 *   QueryClientProvider
 *     WagmiProvider (from wagmi — always present for SSR hook support)
 *       PrivyBridgeProvider (holds auth state, provides context)
 *         PrivyLoader (lazy-loads PrivyWagmiProviders, wraps children)
 *
 * PrivyProvider (~400KB SDK) loads asynchronously via dynamic import().
 * If the import fails (network error, ad-blocker), the bridge signals
 * ready=true + authenticated=false so auth-gated pages redirect to
 * login instead of showing infinite skeletons.
 */
export default function PrivyProviderWrapper({
  children,
  tenantConfig,
}: PrivyProviderWrapperProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={minimalWagmiConfig}>
        <PrivyBridgeProvider>
          <PrivyLoader tenantConfig={tenantConfig}>{children}</PrivyLoader>
        </PrivyBridgeProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
