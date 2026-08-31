"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, use, useEffect, useState } from "react";
import { WagmiProvider } from "wagmi";
import {
  PRIVY_BRIDGE_DEFAULTS,
  PrivyBridgeProvider,
  usePrivyBridgeSetter,
  usePrivyLoadRequested,
} from "@/contexts/privy-bridge-context";
import type { TenantConfig } from "@/src/infrastructure/types/tenant";
import { ensureCryptoRandomUUID } from "@/utilities/auth/ensure-crypto-random-uuid";
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

/** Just the slice of the whitelabel context Privy needs. */
type TenantSource = {
  isWhitelabel: boolean;
  tenantConfig: TenantConfig | null;
};

interface PrivyProviderWrapperProps {
  children: ReactNode;
  /**
   * The whitelabel context, as a promise, so the root layout can stay
   * synchronous. Unwrapped in PrivyTenant below rather than here: that keeps
   * `children` off this promise entirely.
   */
  whitelabel: TenantSource | Promise<TenantSource>;
}

/**
 * Unwraps the tenant only where it is actually consumed.
 *
 * Privy is a sibling of `children` and only mounts after the dynamic import
 * resolves in an effect — i.e. never during SSR. So by the time this renders,
 * the promise has long settled and `use` returns without suspending. Doing it
 * here rather than in the wrapper is what keeps the page out of the promise's
 * way: nothing above `children` ever waits on the host.
 */
function PrivyTenant({
  Privy,
  whitelabel,
}: {
  Privy: PrivyModule;
  whitelabel: TenantSource | Promise<TenantSource>;
}) {
  const resolved = whitelabel instanceof Promise ? use(whitelabel) : whitelabel;

  return <Privy.default tenantConfig={resolved.isWhitelabel ? resolved.tenantConfig : null} />;
}

/**
 * Sidecar that lazy-loads the Privy SDK and renders it as a sibling.
 * Children stay at a stable position in the React tree — no re-mount
 * when the dynamic import resolves.
 */
function PrivyLoader({
  children,
  whitelabel,
}: {
  children: ReactNode;
  whitelabel: TenantSource | Promise<TenantSource>;
}) {
  const [Privy, setPrivy] = useState<PrivyModule | null>(null);
  const setBridge = usePrivyBridgeSetter();
  const loadRequested = usePrivyLoadRequested();

  useEffect(() => {
    const doLoad = () => {
      ensureCryptoRandomUUID();
      import("./PrivyWagmiProviders").then(setPrivy).catch((err) => {
        console.error("[PrivyProviderWrapper] Failed to load Privy SDK:", err);
        setBridge({ ...PRIVY_BRIDGE_DEFAULTS, ready: true });
      });
    };

    // Returning user (has privy token) or explicit load request — load immediately.
    // Storage can be unavailable outright (privacy mode, blocked third-party
    // storage, enterprise policy) and then ANY access throws — and since this
    // effect runs on every page at boot, an unguarded read here crashed the
    // whole app to the error boundary before login was even reachable (QA A6).
    // Unreadable storage means "no token": take the anonymous deferred path.
    let hasToken: string | null = null;
    try {
      hasToken = typeof window !== "undefined" ? localStorage.getItem("privy:token") : null;
    } catch {
      // SUPPRESSED: storage unavailable — treat as anonymous; Privy still lazy-loads.
    }
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
      {Privy && <PrivyTenant Privy={Privy} whitelabel={whitelabel} />}
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
export default function PrivyProviderWrapper({ children, whitelabel }: PrivyProviderWrapperProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={minimalWagmiConfig}>
        <PrivyBridgeProvider>
          <PrivyLoader whitelabel={whitelabel}>{children}</PrivyLoader>
        </PrivyBridgeProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
