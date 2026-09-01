import {
  getWhitelabelByDomain,
  WHITELABEL_DOMAINS,
  type WhitelabelDomain,
} from "@/utilities/whitelabel-config";

/**
 * The value of the `[tenant]` root param.
 *
 * Every page request is rewritten by the proxy to `/t/<tenant>/<original-path>`
 * so the tenant is derivable from the URL instead of from the request host.
 * That is what lets the app shell be prerendered — see
 * `app/t/[tenant]/layout.tsx`.
 *
 * The value is `KARMA_TENANT_PARAM` for the main hosts and the whitelabel
 * config's `domain` for a tenant host. `domain` is unique per config entry,
 * which keeps `getWhitelabelByDomain(value)` working and `metadataBase`
 * correct without inventing a second identifier.
 *
 * This module must stay free of `next/headers` and of any client-only import:
 * it is called from the proxy (edge), from server utilities and from
 * `generateStaticParams`.
 */
export const KARMA_TENANT_PARAM = "karma";

/** Resolve the root param value for a request host. */
export function resolveTenantParam(host: string): string {
  return getWhitelabelByDomain(host)?.domain ?? KARMA_TENANT_PARAM;
}

/** Every root param value the app can be rendered under, deduped. */
export function listTenantParams(): string[] {
  return Array.from(new Set([KARMA_TENANT_PARAM, ...WHITELABEL_DOMAINS.map((d) => d.domain)]));
}

/**
 * Reverse of `resolveTenantParam`: the whitelabel config a param value stands
 * for, or `null` for the main (non-whitelabel) tenant.
 *
 * Returns `null` for unknown values as well; callers that need to reject them
 * use `isKnownTenantParam`.
 */
export function resolveWhitelabelFromTenantParam(value: string): WhitelabelDomain | null {
  if (value === KARMA_TENANT_PARAM) return null;
  return getWhitelabelByDomain(value);
}

/** Whether a param value is one this deployment serves. */
export function isKnownTenantParam(value: string): boolean {
  return value === KARMA_TENANT_PARAM || getWhitelabelByDomain(value) !== null;
}
