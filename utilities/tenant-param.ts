// Tenant as a root param.
//
// Every PAGE request is rewritten by proxy.ts to `/t/<tenant>/<original-path>`
// so the tenant is derivable from the URL instead of from the request host.
// Host-derived data can never appear in a prerendered shell, and hiding it
// behind Suspense would cost the no-JS crawler visibility DEV-612 requires — a
// URL segment has neither problem. The prefix is internal only: the browser URL
// never changes (it is a rewrite, not a redirect), `PAGES` constants are
// untouched, and public requests to `/t/*` are 404'd in the proxy so the prefix
// can never become a second, indexable copy of every page.
//
// `t` and not `_t`: underscore-prefixed folders are private in the App Router.
//
// This module must stay free of `next/headers` and of anything request-scoped.
// It runs in the proxy (per-request hot path), in `generateStaticParams` at
// build time, and in the root layout.
import {
  getWhitelabelByDomain,
  WHITELABEL_DOMAINS,
  type WhitelabelDomain,
} from "./whitelabel-config";

/** Param value for every non-whitelabel host. */
export const KARMA_TENANT_PARAM = "karma";

/** Internal-only URL prefix that carries the root param. */
export const TENANT_ROUTE_PREFIX = "/t";

/**
 * The tenant param for a request host.
 *
 * The value for a whitelabel host is its config `domain`, not the community
 * slug: `domain` is unique per config entry, so the value round-trips through
 * `resolveWhitelabelFromTenantParam()` back to the exact same config — which is
 * what keeps `metadataBase` and the theme correct for tenants that have both a
 * production and a test domain pointing at one community (optimism, polygon,
 * filecoin all do).
 *
 * Host matching is delegated to `getWhitelabelByDomain()`, which normalizes the
 * host and compares for equality. Never match a host with `endsWith()` or
 * `includes()` (see CLAUDE.md "Domains and hosts").
 */
export function resolveTenantParam(host: string): string {
  return getWhitelabelByDomain(host)?.domain ?? KARMA_TENANT_PARAM;
}

/**
 * Every tenant param value the app can serve, for `generateStaticParams` on the
 * root layout — cacheComponents requires at least one value per root param.
 *
 * Read from `WHITELABEL_DOMAINS` (built-in configs plus anything parsed out of
 * `WHITELABEL_EXTRA_DOMAINS_JSON`) rather than re-reading the env here, so this
 * list and `resolveTenantParam()` can never disagree: a param emitted here that
 * the layout then rejected would prerender a 404.
 */
export function listTenantParams(): string[] {
  const params = new Set<string>([KARMA_TENANT_PARAM]);
  for (const config of WHITELABEL_DOMAINS) {
    params.add(config.domain.toLowerCase());
  }
  return [...params];
}

/**
 * The whitelabel config a tenant param value stands for, or `null` for the
 * Karma param and for any value that is not a configured whitelabel domain.
 *
 * Exact (case-insensitive) equality against the configured `domain` — this is a
 * param value, not a Host header, so it carries no port and gets no host
 * normalization.
 */
export function resolveWhitelabelFromTenantParam(value: string): WhitelabelDomain | null {
  if (value === KARMA_TENANT_PARAM) {
    return null;
  }
  const normalized = value.toLowerCase();
  return WHITELABEL_DOMAINS.find((config) => config.domain.toLowerCase() === normalized) ?? null;
}

/** Whether a tenant param value is one this deployment serves. Unknown values
 *  must `notFound()` in the root layout rather than fall back to Karma chrome. */
export function isKnownTenantParam(value: string): boolean {
  return value === KARMA_TENANT_PARAM || resolveWhitelabelFromTenantParam(value) !== null;
}

/** Whether a request is addressing the internal prefix directly. Lower-cased so
 *  a `/T/...` probe is blocked by the same rule rather than falling through. */
export function isTenantRoutePath(pathname: string): boolean {
  const path = pathname.toLowerCase();
  return path === TENANT_ROUTE_PREFIX || path.startsWith(`${TENANT_ROUTE_PREFIX}/`);
}

// Route handlers and metadata routes stay at their current paths: root params
// are not available in Route Handlers and none of them need tenant chrome.
// Rewriting them under the prefix would 404 them.
const EXEMPT_PATHS: ReadonlySet<string> = new Set([
  "/extended-sitemap.xml",
  "/favicon.ico",
  "/manifest.json",
  "/openapi.json",
  "/robots.txt",
  "/sitemap.xml",
  "/sitemap-index.xml",
  "/sitemap_index.xml",
]);

// Path prefixes, each matched on a `/` boundary — this is not host matching, so
// the CLAUDE.md ban on `startsWith`/`includes` for origins does not apply.
// `/monitoring` is the Sentry `tunnelRoute` configured in next.config.ts.
// The rest are Next internals, route-handler trees, and the `public/`
// subdirectories, which the middleware matcher lets through (it only excludes
// root-level files with an extension) and which are served from the filesystem.
const EXEMPT_PREFIXES: readonly string[] = [
  "/.well-known",
  "/_next",
  "/_static",
  "/_vercel",
  "/api",
  "/assets",
  "/fonts",
  "/icons",
  "/images",
  "/logo",
  "/logos",
  "/monitoring",
  "/sitemaps",
  "/tenants",
];

// Anything that looks like a file is served from `public/`, never from a page
// route. Deliberately an allow-list of real asset extensions rather than "the
// last segment contains a dot", so a slug like `/project/vitalik.eth` is still
// treated as a page.
const ASSET_EXTENSION =
  /\.(?:avif|css|csv|eot|gif|html?|ico|jpe?g|js|json|map|md|mjs|mp4|otf|pdf|png|svg|ttf|txt|webm|webmanifest|webp|woff2?|xml|zip)$/i;

/** Whether a path must keep its own URL instead of being served from the
 *  tenant-scoped route tree. */
export function isTenantExemptPath(pathname: string): boolean {
  const path = pathname.toLowerCase();
  if (EXEMPT_PATHS.has(path) || ASSET_EXTENSION.test(path)) {
    return true;
  }
  return EXEMPT_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/**
 * The internal path a page request is served from.
 *
 * A trailing slash is dropped (except on the root) because the route tree has
 * no trailing-slash variants — the browser URL keeps whatever it had, since
 * this only ever feeds a rewrite.
 */
export function tenantRewritePathname(tenantParam: string, pathname: string): string {
  const suffix = pathname === "/" ? "" : pathname.replace(/\/+$/, "");
  return `${TENANT_ROUTE_PREFIX}/${encodeURIComponent(tenantParam)}${suffix}`;
}
