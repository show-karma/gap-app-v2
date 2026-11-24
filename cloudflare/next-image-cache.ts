// A shared cache for the images `next/image` optimizes (/_next/image).
//
// On Vercel the image optimizer's results sit in its CDN, so a resized image is
// produced once and then served from cache. On Workers the OpenNext handler
// transforms the image with the Images binding on every request: ~0.3-0.4 s
// each, and the response carries no Cache-Control, so browsers do not keep it
// either. The Cache API would help only on a custom domain (it does nothing on
// *.workers.dev).
//
// So the result goes to the incremental cache's R2 bucket, under its own
// prefix, through the same cache as the OG images (cloudflare/og-image-cache.ts):
//
// - The key is the source URL, width and quality, plus the output format the
//   Accept header asks for (webp or the original type), the only request
//   header the optimizer reads. A local image (`/images/...`) is also keyed on
//   the deployment, so a new deploy shows a changed file at once; a remote one
//   lives out its lifetime.
// - Lifetime: fresh for four hours (Next's default `images.minimumCacheTTL`),
//   then served for up to a week more while it is optimized again in the
//   background. Browsers may keep it for the same four hours. An image the
//   handler marks immutable (a static import under /_next/static/media) keeps
//   its own header and is fresh for a year.
// - Errors, non-images and anything the handler does not mark cacheable go
//   through uncached, exactly as before.
//
// Kept free of Worker and adapter imports so it can be unit tested.

export const NEXT_IMAGE_PATH = "/_next/image";
export const NEXT_IMAGE_KEY_PREFIX = "next-images";

/** Response header that says how the cache answered: HIT, STALE or MISS. */
export const NEXT_IMAGE_CACHE_HEADER = "x-karma-image-cache";

const FRESH_SECONDS = 4 * 60 * 60;
const STALE_SECONDS = 7 * 24 * 60 * 60;
const IMMUTABLE_SECONDS = 365 * 24 * 60 * 60;

// R2 rejects keys over 1024 bytes; such images are optimized every time.
const MAX_KEY_BYTES = 1024;

// The formats the optimizer can produce, most specific first, as it picks them
// from Accept (`images.formats`; webp by default). Two requests that agree on
// these answers get the same image.
const NEGOTIATED_FORMATS = ["image/avif", "image/webp"] as const;

export function isNextImagePath(pathname: string): boolean {
  return pathname === NEXT_IMAGE_PATH || pathname === `${NEXT_IMAGE_PATH}/`;
}

/** The output-format part of the key: the best format the client accepts, or "original". */
export function acceptedFormat(accept: string | null): string {
  const value = accept ?? "";
  return NEGOTIATED_FORMATS.find((format) => value.includes(format))?.slice(6) ?? "original";
}

/**
 * The R2 key for an optimization request, or null when it cannot be cached:
 * no single `url`, or a key longer than R2 allows.
 */
export function nextImageCacheKey(
  url: URL,
  accept: string | null,
  deploymentId: string
): string | null {
  const sources = url.searchParams.getAll("url");
  if (sources.length !== 1) return null;
  const [source] = sources;
  const scope = source.startsWith("/") ? `local/${deploymentId}` : "remote";
  const width = url.searchParams.get("w") ?? "";
  const quality = url.searchParams.get("q") ?? "";
  const key =
    `${NEXT_IMAGE_KEY_PREFIX}/${scope}/${acceptedFormat(accept)}/` +
    `w${width}-q${quality}/${encodeURIComponent(source)}`;
  return new TextEncoder().encode(key).byteLength <= MAX_KEY_BYTES ? key : null;
}

/**
 * The optimizer's response with a shared lifetime the R2 cache understands.
 * A 200 image without one gets four hours plus a week of staleness; an
 * immutable one keeps its header and gets a year. Anything else is returned
 * unchanged, so it is never stored.
 */
export function withImageLifetime(response: Response): Response {
  if (response.status !== 200) return response;
  if (!response.headers.get("content-type")?.startsWith("image/")) return response;
  if (response.headers.has("set-cookie")) return response;
  const current = response.headers.get("cache-control") ?? "";
  const cacheControl = /(?:^|,)\s*immutable\s*(?:,|$)/i.test(current)
    ? `public, max-age=${IMMUTABLE_SECONDS}, s-maxage=${IMMUTABLE_SECONDS}, immutable`
    : `public, max-age=${FRESH_SECONDS}, s-maxage=${FRESH_SECONDS}, ` +
      `stale-while-revalidate=${STALE_SECONDS}`;
  const shared = new Response(response.body, response);
  shared.headers.set("cache-control", cacheControl);
  return shared;
}
