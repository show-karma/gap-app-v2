import "server-only";

import { createHash } from "node:crypto";
import { COMMUNITY_LOGO_ROUTE } from "@/utilities/community-logo-route";

/**
 * Community logos that the indexer stores inline, as `data:` URIs.
 *
 * One community's on-chain logo is a 6 KB base64 JPEG, and the project updates
 * feed repeats it in every grant item that belongs to that community. The feed
 * is part of the project layout's hydration seed, so a single project page
 * carried the same image up to ten times — and that seed is written to the ISR
 * cache four times per render (inline in the HTML, the `.rsc` payload, the
 * `_full` prefetch segment and the layout segment), on every project tab.
 *
 * The cached loaders replace such an image with a short path to
 * `app/api/community-logo/[slug]/[hash]`, which serves the same bytes. The
 * hash is the image's content hash, so the path changes only when the logo
 * does: the page output stays deterministic and the response can be cached as
 * immutable.
 */

/** Raster types only. SVG is excluded: served from our origin it can run script. */
const INLINE_IMAGE = /^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

/** Slugs as the indexer issues them; anything else never reaches the route. */
const SAFE_SLUG = /^[a-z0-9][a-z0-9-]{0,99}$/;

const HASH = /^[0-9a-f]{16}$/;

/** Upper bound on a decoded logo; the real one is ~4.5 KB. */
const MAX_LOGO_BYTES = 512 * 1024;

export interface InlineImage {
  mimeType: string;
  bytes: Uint8Array<ArrayBuffer>;
}

/** Decodes a raster `data:` URI, or returns null for anything else. */
export function parseInlineImage(value: unknown): InlineImage | null {
  if (typeof value !== "string") return null;
  const match = INLINE_IMAGE.exec(value);
  if (!match) return null;
  const decoded = Buffer.from(match[2], "base64");
  if (decoded.byteLength === 0 || decoded.byteLength > MAX_LOGO_BYTES) return null;
  const bytes = new Uint8Array(decoded.byteLength);
  bytes.set(decoded);
  return { mimeType: match[1], bytes };
}

/** First 16 hex chars of the SHA-256 of the data URI. */
export function inlineImageHash(dataUri: string): string {
  return createHash("sha256").update(dataUri).digest("hex").slice(0, 16);
}

export function isSafeCommunitySlug(slug: string): boolean {
  return SAFE_SLUG.test(slug);
}

export function isInlineImageHash(hash: string): boolean {
  return HASH.test(hash);
}

/** Path that serves `dataUri` as the logo of community `slug`. */
export function communityLogoPath(slug: string, dataUri: string): string {
  return `${COMMUNITY_LOGO_ROUTE}/${slug}/${inlineImageHash(dataUri)}`;
}

/** A community's logo as the indexer stores it. */
export type CommunityLogoLookup = (slug: string) => Promise<string | undefined>;

function collectInlineLogoSlugs(value: unknown, found: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectInlineLogoSlugs(item, found);
    return;
  }
  if (value === null || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  const slug = record.communitySlug;
  if (
    typeof slug === "string" &&
    isSafeCommunitySlug(slug) &&
    parseInlineImage(record.communityImage)
  ) {
    found.add(slug);
  }
  for (const child of Object.values(record)) collectInlineLogoSlugs(child, found);
}

function rewrite(value: unknown, paths: Map<string, { dataUri: string; path: string }>): unknown {
  if (Array.isArray(value)) return value.map((item) => rewrite(item, paths));
  if (value === null || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(record)) out[key] = rewrite(child, paths);
  const slug = record.communitySlug;
  if (typeof slug === "string") {
    const known = paths.get(slug);
    if (known && record.communityImage === known.dataUri) out.communityImage = known.path;
  }
  return out;
}

/**
 * Returns `data` with every inline `communityImage` replaced by its logo path.
 *
 * An image is only replaced when it is exactly the logo the community record
 * holds — the route serves the community's logo, so anything else (a lookup
 * failure, a logo changed since the feed was built) keeps the original value
 * rather than showing a different picture. `data` is not mutated.
 */
export async function replaceInlineCommunityLogos<T>(
  data: T,
  lookupLogo: CommunityLogoLookup
): Promise<T> {
  const slugs = new Set<string>();
  collectInlineLogoSlugs(data, slugs);
  if (slugs.size === 0) return data;

  const paths = new Map<string, { dataUri: string; path: string }>();
  await Promise.all(
    [...slugs].map(async (slug) => {
      try {
        const logo = await lookupLogo(slug);
        if (logo && parseInlineImage(logo)) {
          paths.set(slug, { dataUri: logo, path: communityLogoPath(slug, logo) });
        }
      } catch {
        // SUPPRESSED: a failed lookup keeps the inline image, so the picture is never lost.
      }
    })
  );
  if (paths.size === 0) return data;

  return rewrite(data, paths) as T;
}
