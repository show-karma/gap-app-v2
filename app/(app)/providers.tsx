"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { type ReactNode, Suspense, useEffect, useState } from "react";
import { WagmiProvider as CoreWagmiProvider } from "wagmi";
import { queryClient } from "@/utilities/query-client";
import { privyConfig } from "@/utilities/wagmi/privy-config";

/**
 * Code-split Privy + Wagmi into a separate chunk (~500KB+).
 *
 * With ssr: true (default), Next.js renders it normally on the server but
 * creates a separate JS chunk on the client. Combined with Suspense,
 * React 18's selective hydration allows the rest of the page to hydrate
 * before the Privy chunk finishes loading.
 *
 * QueryClientProvider is intentionally OUTSIDE PrivyProviderWrapper so
 * React Query's HydrationBoundary can hydrate SSR-prefetched data
 * independently of Privy initialization.
 */
const PrivyProviderWrapper = dynamic(() => import("@/components/Utilities/PrivyProviderWrapper"));
const PROJECT_AUTH_PROVIDER_DEFER_TIMEOUT_MS = 12_000;
const AUTH_PROVIDER_INTERACTION_EVENTS: Array<keyof WindowEventMap> = [
  "pointerdown",
  "keydown",
  "touchstart",
];

export function AppProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isProjectRoute = pathname?.startsWith("/project/");
  const [enableAuthProvider, setEnableAuthProvider] = useState(
    () => process.env.NODE_ENV === "test" || !isProjectRoute
  );

  useEffect(() => {
    if (process.env.NODE_ENV === "test") {
      setEnableAuthProvider(true);
      return;
    }

    if (!isProjectRoute) {
      setEnableAuthProvider(true);
      return;
    }

    if (enableAuthProvider) {
      return;
    }

    const enableAuth = () => {
      setEnableAuthProvider(true);
      for (const eventName of AUTH_PROVIDER_INTERACTION_EVENTS) {
        window.removeEventListener(eventName, handleTrustedInteraction);
      }
    };

    const handleTrustedInteraction = (event: Event) => {
      if (!event.isTrusted) return;
      enableAuth();
    };

    for (const eventName of AUTH_PROVIDER_INTERACTION_EVENTS) {
      window.addEventListener(eventName, handleTrustedInteraction);
    }

    const timeoutId = window.setTimeout(enableAuth, PROJECT_AUTH_PROVIDER_DEFER_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
      for (const eventName of AUTH_PROVIDER_INTERACTION_EVENTS) {
        window.removeEventListener(eventName, handleTrustedInteraction);
      }
    };
  }, [enableAuthProvider, isProjectRoute]);

  return (
    <QueryClientProvider client={queryClient}>
      {enableAuthProvider ? (
        <Suspense>
          <PrivyProviderWrapper>{children}</PrivyProviderWrapper>
        </Suspense>
      ) : (
        <CoreWagmiProvider config={privyConfig}>{children}</CoreWagmiProvider>
      )}
    </QueryClientProvider>
  );
}
