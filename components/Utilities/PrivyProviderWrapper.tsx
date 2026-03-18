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

/**
 * Lazily loaded sidecar type. The module default is a component that
 * renders null — it only exists to mount PrivyProvider and push auth
 * state into PrivyBridgeContext.
 */
type SidecarModule = {
  default: React.ComponentType<{ tenantConfig?: TenantConfig | null }>;
};

interface PrivyProviderWrapperProps {
  children: ReactNode;
  tenantConfig?: TenantConfig | null;
}

/**
 * Root provider shell. The tree structure is stable across the entire
 * lifecycle — children never change position, so React never unmounts them.
 *
 * Architecture:
 *
 *   QueryClientProvider
 *     WagmiProvider (from wagmi — always present for SSR hook support)
 *       PrivyBridgeProvider (holds auth state, provides context)
 *         ├── PrivySidecar (lazy, renders null, pushes auth state)
 *         └── {children} (stable position, never re-mounts)
 *
 * The Privy SDK (~400KB) loads asynchronously via dynamic import().
 * PrivySidecar mounts as a sibling to children, reads Privy/Wagmi hooks
 * inside its own PrivyProvider + @privy-io/wagmi WagmiProvider subtree,
 * and pushes values into PrivyBridgeContext via setState.
 *
 * Children see the auth state change as a context value update (re-render),
 * not a tree restructure (re-mount). No blank flash, no lost state.
 */
export default function PrivyProviderWrapper({
  children,
  tenantConfig,
}: PrivyProviderWrapperProps) {
  const [Sidecar, setSidecar] = useState<SidecarModule | null>(null);

  useEffect(() => {
    import("./PrivyWagmiProviders").then(setSidecar).catch((err) => {
      // Privy SDK chunk failed to load (network error, ad-blocker, etc.).
      // The app remains usable — auth features degrade gracefully via
      // PrivyBridgeContext defaults (ready=false, authenticated=false).
      console.error("[PrivyProviderWrapper] Failed to load Privy SDK:", err);
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={privyConfig}>
        <PrivyBridgeProvider>
          {Sidecar && <Sidecar.default tenantConfig={tenantConfig} />}
          {children}
        </PrivyBridgeProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
