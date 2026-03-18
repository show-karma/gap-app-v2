"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useEffect, useState } from "react";
import { WagmiProvider } from "wagmi";
import { PrivyBridgeProvider } from "@/contexts/privy-bridge-context";
import type { TenantConfig } from "@/src/infrastructure/types/tenant";
import { queryClient } from "@/utilities/query-client";
import { privyConfig } from "@/utilities/wagmi/privy-config";

/**
 * @deprecated Import from `@/utilities/query-client` instead.
 * This re-export exists only for backwards compatibility and will be removed in a future version.
 */
export { queryClient };

type PrivyModule = {
  default: React.ComponentType<{ children: ReactNode; tenantConfig?: TenantConfig | null }>;
};

interface PrivyProviderWrapperProps {
  children: ReactNode;
  tenantConfig?: TenantConfig | null;
}

/**
 * Root provider shell.
 *
 * QueryClientProvider and WagmiProvider are always present (SSR + client).
 * PrivyProvider (the heavy ~400KB SDK) loads via dynamic import() after
 * hydration and wraps children additively.
 *
 * While loading, components that call usePrivy()/useWallets() directly
 * will get Privy's default "not ready" state, and useAuth() reads from
 * PrivyBridgeContext defaults. Both paths show skeleton/loading UI.
 *
 * Once loaded, PrivyProvider wraps children. Components that call Privy
 * hooks directly get live values, and PrivyBridgeUpdater pushes them
 * to the bridge for useAuth() consumers.
 *
 * NOTE: The component type at children's position changes from Fragment
 * to PrivyProviders when the module loads, causing a React re-mount.
 * This is acceptable because:
 * 1. It only happens once (on initial load)
 * 2. React Query cache (via HydrationBoundary) survives re-mount
 * 3. Direct Privy hook calls require PrivyProvider in the tree
 */
export default function PrivyProviderWrapper({
  children,
  tenantConfig,
}: PrivyProviderWrapperProps) {
  const [Privy, setPrivy] = useState<PrivyModule | null>(null);

  useEffect(() => {
    import("./PrivyWagmiProviders").then(setPrivy).catch((err) => {
      console.error("[PrivyProviderWrapper] Failed to load Privy SDK:", err);
    });
  }, []);

  const inner = Privy ? (
    <Privy.default tenantConfig={tenantConfig}>{children}</Privy.default>
  ) : (
    children
  );

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={privyConfig}>
        <PrivyBridgeProvider>{inner}</PrivyBridgeProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
