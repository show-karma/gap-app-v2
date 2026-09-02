import { cacheLife } from "next/cache";
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
 *
 * ## Why this is cached
 *
 * Under `cacheComponents` a promise that reaches a client provider unresolved
 * counts as runtime data. `WhitelabelProvider` calls `use(value)` on this
 * promise and is deliberately NOT wrapped in Suspense — a boundary there would
 * stream every crawlable page as a hidden late chunk, which DEV-612 forbids —
 * so the first P2-6 build failed on the shell, above all 350 routes, with
 * "uncached or runtime data during prerendering" pointing at
 * `whitelabel-context.tsx`. Of the three fixes Next suggests there, `[stream]`
 * is the DEV-612 violation and `[block]` would have to go on every crawlable
 * route, so `[cache]` is the only door left open.
 *
 * It is safe to cache because it is a pure function of the root param: no
 * fetch, no cookies, no headers, and the tenant tables it consults are bundled
 * constants. Everything it returns is plain serializable data.
 *
 * `tenant()` is called INSIDE the cached scope on purpose. A root param read
 * there is recorded on the cache entry (`readRootParamNames`, threaded from
 * `server/request/root-params.js` into `use-cache/use-cache-wrapper.js`), so
 * the tenant is part of what the entry is keyed on. Hoisting the read outside
 * and passing the value in would work too, but reading it inside is what keeps
 * one tenant's config from ever being served for another.
 *
 * `max` is the longest built-in profile (revalidate 30 days, never expires).
 * The answer only changes when the bundled tenant tables change, which is a
 * deploy.
 */
const resolveWhitelabelContext = async (): Promise<WhitelabelContext> => {
  "use cache";
  cacheLife("max");

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
 *
 * Still worth keeping now that the inner function is `"use cache"`: the two
 * caches answer different questions. `cache()` dedupes the call within a single
 * render, so the shell does one cache lookup instead of a dozen; `"use cache"`
 * is what survives between requests and lets the prerender resolve at all.
 */
export const getWhitelabelContext = cache(resolveWhitelabelContext);
