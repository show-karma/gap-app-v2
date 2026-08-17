/**
 * Host constants for the standalone indexability scripts.
 *
 * These mirror `utilities/domains.ts`, which the scripts cannot import: the
 * indexability workflow runs them as `node scripts/verify-indexability.mjs` on
 * Node 20, with no TypeScript loader and no `--experimental-strip-types`.
 * `__tests__/unit/scripts/indexability-domains-parity.test.ts` fails if the two
 * ever drift.
 *
 * Import nothing here — every consumer is a dependency-free ESM script.
 */

/** ADR 0001: exactly one host serves 200s. */
export const CANONICAL_ORIGIN = "https://www.karmahq.org";
export const APEX_ORIGIN = "https://karmahq.org";
/** `gap.` exists only on the legacy root — GAP was the original product name and
 *  gap.karmahq.xyz was its first host. There is no gap.karmahq.org, so pointing
 *  the gap-alias check at one would fail against NXDOMAIN. */
export const GAP_ORIGIN = "https://gap.karmahq.xyz";

/** The API subdomain is deliberately not part of the karmahq.org migration. */
export const INDEXER_ORIGIN = "https://gapapi.karmahq.xyz";

/** Crawler contact address. Moved with the TLD flip. Publishing it is gated on
 *  MX/SPF/DKIM/DMARC existing for karmahq.org — as of 2026-08-17 none are
 *  provisioned. See docs/runbooks/domain-migration-karmahq-org.md §3. */
export const ENGINEERING_EMAIL = "engineering@karmahq.org";

/** Flat sitemap entry point used by the manual content crawler. The verifier
 *  derives its own root from the (possibly overridden) canonical origin. */
export const ROOT_SITEMAP_URL = `${CANONICAL_ORIGIN}/sitemap.xml`;
