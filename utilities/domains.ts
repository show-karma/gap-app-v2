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

/** Product docs are hosted on GitBook, outside this repo, so they do not flip
 *  with the app and stay on .xyz. Env-overridable so moving them later needs a
 *  deploy variable rather than a code change. Read at call time, like
 *  appOrigin(). */
export const DOCS_HOST = "docs.gap.karmahq.xyz" as const;

export function docsOrigin(): string {
  const override = process.env.NEXT_PUBLIC_DOCS_ORIGIN?.trim();
  if (!override) {
    return `https://${DOCS_HOST}`;
  }
  // A schemeless override ("docs.gap.karmahq.xyz") is the easy thing to type
  // into a deploy variable, and it silently breaks every link built from it:
  // the browser reads it as a relative path and resolves it against our own
  // origin, so the footer "Guide" link 404s instead of leaving the site.
  // Normalise rather than trust the input.
  const withScheme = /^https?:\/\//i.test(override)
    ? override
    : `https://${override.replace(/^\/+/, "")}`;
  const normalised = withScheme.replace(/\/+$/, "");
  // A slash-only value ("///") or a bare scheme ("https://") normalises to an
  // origin with no host, which is no more usable in an href than the raw
  // variable was. Fall back to the default rather than emit a broken link.
  return /^https?:\/\/[^/]+/i.test(normalised) ? normalised : `https://${DOCS_HOST}`;
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
