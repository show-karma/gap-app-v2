"use client";

import { TenantStoreInitializer } from "@/components/Utilities/TenantStoreInitializer";
import { useWhitelabel } from "@/utilities/whitelabel-context";

/**
 * Seeds the tenant store from the resolved whitelabel context.
 *
 * Reads the context rather than the promise on purpose: it sits under
 * WhitelabelProvider, which has already unwrapped it, so this adds no second
 * suspension point. Renders nothing.
 */
export function TenantStoreSync() {
  const { isWhitelabel, tenantConfig } = useWhitelabel();

  if (!isWhitelabel || !tenantConfig) return null;

  return <TenantStoreInitializer tenant={tenantConfig}>{null}</TenantStoreInitializer>;
}
