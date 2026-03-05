import { headers } from "next/headers";
import { getTenantConfig } from "@/src/infrastructure/config/tenant-config";
import type { TenantConfig } from "@/src/infrastructure/types/tenant";
import { isKnownTenant } from "@/src/infrastructure/types/tenant";
import { getWhitelabelByDomain, type WhitelabelDomain } from "./whitelabel-config";

export interface WhitelabelContext {
  isWhitelabel: boolean;
  isUmbrella: boolean;
  communitySlug: string | null;
  config: WhitelabelDomain | null;
  tenantConfig: TenantConfig | null;
}

/**
 * Build a redirect path that respects the current whitelabel/umbrella context.
 * In umbrella mode, community sub-routes get `/<slug>` prefix; top-level routes
 * also get `/<slug>` prefix. In domained mode, `/community/<slug>` is stripped.
 * In normal mode, the path is returned as-is.
 */
export function buildWhitelabelRedirectPath(path: string, ctx: WhitelabelContext): string {
  if (!ctx.isWhitelabel || !ctx.communitySlug) return path;

  const prefix = `/community/${ctx.communitySlug}`;
  const stripped = path.startsWith(prefix) ? path.slice(prefix.length) || "/" : path;

  if (ctx.isUmbrella) {
    return `/${ctx.communitySlug}${stripped}`;
  }
  return stripped;
}

export async function getWhitelabelContext(): Promise<WhitelabelContext> {
  const headersList = await headers();
  const isWhitelabel = headersList.get("x-is-whitelabel") === "true";
  const isUmbrella = headersList.get("x-is-umbrella") === "true";
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

  return { isWhitelabel, isUmbrella, communitySlug, config, tenantConfig };
}
