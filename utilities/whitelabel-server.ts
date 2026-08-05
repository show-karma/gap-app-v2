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

/**
 * The request's pathname as tagged by the proxy via the `x-pathname` header,
 * or null when the proxy did not tag it. Layouts cannot read the pathname on
 * their own; the proxy sets this header narrowly (today: only
 * /nonprofits/find-funders, for the root layout's <noscript> crawler hero —
 * DEV-586). Lives here, next to getWhitelabelContext, so it shares the same
 * request-scope boundary and the same test seam.
 */
export async function getRequestPathname(): Promise<string | null> {
  const headersList = await headers();
  return headersList.get("x-pathname");
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
