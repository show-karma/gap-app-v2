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

/**
 * Build a redirect path that respects the current whitelabel context.
 * In domained whitelabel mode, `/community/<slug>` is stripped.
 * In normal mode, the path is returned as-is.
 */
export function buildWhitelabelRedirectPath(path: string, ctx: WhitelabelContext): string {
  if (!ctx.isWhitelabel || !ctx.communitySlug) return path;

  const prefix = `/community/${ctx.communitySlug}`;
  const stripped = path.startsWith(prefix) ? path.slice(prefix.length) || "/" : path;

  return stripped;
}

export async function getWhitelabelContext(): Promise<WhitelabelContext> {
  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const config = getWhitelabelByDomain(host);
  const isWhitelabel = config !== null;

  const communitySlug = config?.communitySlug ?? null;
  const tenantId = config?.tenantId ?? communitySlug;

  let tenantConfig: TenantConfig | null = null;
  if (isWhitelabel && tenantId) {
    tenantConfig = isKnownTenant(tenantId)
      ? getTenantConfig(tenantId, communitySlug || undefined)
      : getTenantConfig("karma", communitySlug || tenantId);
  }

  return { isWhitelabel, communitySlug, config, tenantConfig };
}
