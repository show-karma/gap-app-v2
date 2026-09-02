import { tenant } from "next/root-params";
import { cache } from "react";
import { getTenantConfig } from "@/src/infrastructure/config/tenant-config";
import type { TenantConfig } from "@/src/infrastructure/types/tenant";
import { isKnownTenant } from "@/src/infrastructure/types/tenant";
import { resolveWhitelabelFromTenantParam } from "./tenant-param";
import type { WhitelabelDomain } from "./whitelabel-config";

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
 * Resolve the whitelabel context from the `[tenant]` root param.
 *
 * The param is set by the proxy, which rewrites every page request to
 * `/t/<tenant>/<path>`, so this is URL-derived rather than host-derived. That
 * is the whole point: a host read (`headers()`) makes every route dynamic and
 * keeps the app shell out of the prerender, a root param does not.
 */
const resolveWhitelabelContext = async (): Promise<WhitelabelContext> => {
  const tenantParam = await tenant();
  const config = resolveWhitelabelFromTenantParam(tenantParam);
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
};

/**
 * Memoised per request, so the root layout and the `(chrome)` layout share one
 * promise instead of resolving the param twice — and so the ~10 pages that
 * call it for metadata do not each redo the work.
 */
export const getWhitelabelContext = cache(resolveWhitelabelContext);
