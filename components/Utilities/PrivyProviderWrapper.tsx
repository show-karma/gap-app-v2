"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useEffect, useState } from "react";
import { WagmiProvider } from "wagmi";
import type { TenantConfig } from "@/src/infrastructure/types/tenant";
import { queryClient } from "@/utilities/query-client";
import { privyConfig } from "@/utilities/wagmi/privy-config";

/**
 * @deprecated Import from `@/utilities/query-client` instead.
 * This re-export exists only for backwards compatibility and will be removed in a future version.
 */
export { queryClient };

interface PrivyProviderWrapperProps {
  children: ReactNode;
  tenantConfig?: TenantConfig | null;
}

/**
 * Shell component that wraps children in QueryClientProvider + WagmiProvider
 * immediately and defers Privy SDK loading until after hydration.
 *
 * WagmiProvider (from wagmi) is always present because wagmi hooks are called
 * during SSR. PrivyWagmiProviders is loaded via dynamic import() after mount
 * and wraps children with PrivyProvider + PrivyBridge additively.
 *
 * Children are ALWAYS rendered — the provider tree never unmounts them.
 * Before Privy loads, useAuth() reads from PrivyBridgeContext defaults
 * (ready=false, authenticated=false), showing skeleton/loading states.
 */
export default function PrivyProviderWrapper({
  children,
  tenantConfig,
}: PrivyProviderWrapperProps) {
  const [PrivyModule, setPrivyModule] = useState<{
    default: React.ComponentType<{ children: ReactNode; tenantConfig?: TenantConfig | null }>;
  } | null>(null);

  useEffect(() => {
    import("./PrivyWagmiProviders").then(setPrivyModule);
  }, []);

  const inner = PrivyModule ? (
    <PrivyModule.default tenantConfig={tenantConfig}>{children}</PrivyModule.default>
  ) : (
    children
  );

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={privyConfig}>{inner}</WagmiProvider>
    </QueryClientProvider>
  );
}
