"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";
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

const PrivyProviders = dynamic(() => import("./PrivyWagmiProviders"), { ssr: false });

interface PrivyProviderWrapperProps {
  children: ReactNode;
  tenantConfig?: TenantConfig | null;
}

/**
 * Shell component that wraps children in QueryClientProvider + WagmiProvider
 * immediately and defers Privy SDK loading until after hydration.
 *
 * WagmiProvider (from wagmi, not @privy-io/wagmi) is always present because
 * wagmi hooks are called during SSR. Once PrivyProviders loads client-side,
 * it adds PrivyProvider + PrivyBridge + the @privy-io/wagmi WagmiProvider.
 *
 * During Phase 1, useAuth() reads from PrivyBridgeContext defaults
 * (ready=false, authenticated=false), which causes navbars to show
 * skeleton/loading states — identical to the existing Privy initialization UX.
 */
export default function PrivyProviderWrapper({
  children,
  tenantConfig,
}: PrivyProviderWrapperProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // SSR + first client render: QueryClient + wagmi (for SSR hooks), no Privy SDK
    return (
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={privyConfig}>{children}</WagmiProvider>
      </QueryClientProvider>
    );
  }

  // After hydration: load Privy providers (dynamic import)
  return (
    <QueryClientProvider client={queryClient}>
      <PrivyProviders tenantConfig={tenantConfig}>{children}</PrivyProviders>
    </QueryClientProvider>
  );
}
