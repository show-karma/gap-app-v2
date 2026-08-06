// Single source of truth for every karmahq host. Nothing else in this repo
// should contain a literal "karmahq.org" or "karmahq.xyz".
//
// This module must import nothing: it runs in proxy.ts (per-request Node hot
// path), during build-time metadata evaluation, and inside client bundles.

/** Registrable domain we serve from today. */
export const ROOT_DOMAIN = "karmahq.org" as const;

/** Permanently-supported legacy roots. NEVER remove karmahq.xyz: on-chain EAS
 *  attestations embed .xyz URLs immutably. */
export const LEGACY_ROOT_DOMAINS = ["karmahq.xyz"] as const;

/** ADR 0001: exactly one host serves 200s. */
export const CANONICAL_HOST = `www.${ROOT_DOMAIN}` as const;
export const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}` as const;

export const STAGING_HOST = `staging.${ROOT_DOMAIN}` as const;
export const STAGING_ORIGIN = `https://${STAGING_HOST}` as const;

/** Governance app lives in a separate repo and is NOT flipping in this release. */
export const GOV_HOST = "gov.karmahq.xyz" as const;
export const GOV_STAGING_HOST = "govstag.karmahq.xyz" as const;

/** Former umbrella hosts. Not flipping — they only ever 301 away. */
export const LEGACY_UMBRELLA_HOSTS = {
  prod: "app.karmahq.xyz",
  staging: "testapp.karmahq.xyz",
} as const;

const aliasCandidates: readonly string[] = [
  ROOT_DOMAIN,
  `gap.${ROOT_DOMAIN}`,
  CANONICAL_HOST,
  ...LEGACY_ROOT_DOMAINS.flatMap((domain) => [domain, `www.${domain}`, `gap.${domain}`]),
];

/** Every host that owes exactly one 308 to CANONICAL_ORIGIN. */
export const ALIAS_HOSTS: ReadonlySet<string> = Object.freeze(
  new Set(aliasCandidates.filter((host) => host !== CANONICAL_HOST))
);

// Redirect-loop circuit breaker. Nothing in proxy.ts compares the redirect
// target host to the request host, so if CANONICAL_HOST ever became an alias
// every request on it would 308 to itself forever with no way out. Fail at
// module load instead of in production.
if (ALIAS_HOSTS.has(CANONICAL_HOST)) {
  throw new Error("canonical host is an alias — redirect loop");
}

/** Env-aware canonical origin. NEXT_PUBLIC_ENV is read at call time so tests and
 *  build-time evaluation see the same value the request path does. */
export function appOrigin(): string {
  return process.env.NEXT_PUBLIC_ENV === "production" ? CANONICAL_ORIGIN : STAGING_ORIGIN;
}

/** The one hostname normalizer. Strips the port and lower-cases, then drops a
 *  single trailing DNS dot: `karmahq.xyz.` is the fully-qualified form of the
 *  same host and must still match ALIAS_HOSTS. */
export function bareHostname(hostname: string): string {
  return hostname.split(":")[0].toLowerCase().replace(/\.$/, "");
}

/** The explicit CANONICAL_HOST guard is the redirect-loop circuit breaker —
 *  do not inline this as a bare ALIAS_HOSTS lookup. */
export function isAliasHost(hostname: string): boolean {
  const host = bareHostname(hostname);
  return host !== CANONICAL_HOST && ALIAS_HOSTS.has(host);
}

/** The only way to build a 308 target. */
export function canonicalUrl(path: string, search: string): string {
  return `${CANONICAL_ORIGIN}${path}${search}`;
}
