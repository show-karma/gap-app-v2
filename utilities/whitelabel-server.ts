import { headers } from "next/headers";
import { getTenantConfig } from "@/src/infrastructure/config/tenant-config";
import type { TenantConfig } from "@/src/infrastructure/types/tenant";
import { isKnownTenant } from "@/src/infrastructure/types/tenant";
import { getWhitelabelByDomain, type WhitelabelDomain } from "./whitelabel-config";

export interface WhitelabelContext {
  isWhitelabel: boolean;
  communitySlug: string | null;
  config: WhitelabelDomain | null;
  tenantConfig: TenantConfig | null;
}

export async function getWhitelabelContext(): Promise<WhitelabelContext> {
  const headersList = await headers();
  const isWhitelabel = headersList.get("x-is-whitelabel") === "true";
  const incomingCommunitySlug = headersList.get("x-community-slug");
  const whitelabelDomain = headersList.get("x-whitelabel-domain") ?? headersList.get("host") ?? "";
  const config = isWhitelabel ? getWhitelabelByDomain(whitelabelDomain) : null;

  const communitySlug = config?.communitySlug ?? incomingCommunitySlug;
  const tenantId = config?.tenantId ?? headersList.get("x-tenant-id") ?? communitySlug;

  let tenantConfig: TenantConfig | null = null;
  if (isWhitelabel && tenantId) {
    tenantConfig = isKnownTenant(tenantId)
      ? getTenantConfig(tenantId, communitySlug || undefined)
      : getTenantConfig("karma", communitySlug || tenantId);
  }

  return { isWhitelabel, communitySlug, config, tenantConfig };
}
