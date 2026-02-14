"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { type ReactNode, Suspense } from "react";
import { queryClient } from "@/utilities/query-client";

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

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense>
        <PrivyProviderWrapper>{children}</PrivyProviderWrapper>
      </Suspense>
    </QueryClientProvider>
  );
}
