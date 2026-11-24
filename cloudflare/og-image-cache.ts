// A shared cache for the social preview (OG) images.
//
// On Vercel the CDN keeps a route handler's response for as long as its
// `s-maxage` says, so a project card is drawn about once a day. On Workers
// nothing caches what the Worker returns: the CDN sits in front of the Worker,
// and on *.workers.dev the Cache API does nothing. Every crawler request would
// draw the image again, the most CPU-hungry request the app serves (743 ms at
// the median on the test Worker, against 26-51 ms for a cached page).
//
// So the Worker keeps the PNGs itself, in the incremental cache's R2 bucket
// under their own prefix, and answers from there before Next is involved:
//
// - The key is the deployment and the full URL (host, path, query). A new
//   deployment starts empty, as Vercel's CDN does, so a change to the card's
//   design shows at once.
// - Each entry lives as long as its own `Cache-Control` allows: fresh for
//   `s-maxage`, then served for `stale-while-revalidate` more while it is drawn
//   again in the background. The routes keep deciding their own lifetimes.
// - Only a 200 image that is `public`, has an `s-maxage` and sets no cookie is
//   stored. Anything else, and any R2 error, goes to Next as if the cache
//   were not there.
//
// proxy.ts does not run on /api routes, so answering before Next skips nothing.
// Kept free of Worker and adapter imports so it can be unit tested.

/** The routes that return an `ImageResponse`. Add a new OG route here. */
export const OG_IMAGE_PATH_PREFIXES = [
  "/api/metadata/projects/",
  "/api/metadata/communities/",
  "/api/metadata/knowledge",
  "/api/scanner/og/",
] as const;

export const OG_IMAGE_KEY_PREFIX = "og-images";

/** Response header that says how the cache answered: HIT, STALE or MISS. */
export const OG_IMAGE_CACHE_HEADER = "x-karma-og-cache";

// R2 rejects keys over 1024 bytes. Longer URLs (a knowledge card with a long
// title in its query) are drawn every time instead.
const MAX_KEY_BYTES = 1024;

export interface OgImageBucketObject {
  body: ReadableStream;
  uploaded: Date;
  httpMetadata?: { contentType?: string; cacheControl?: string };
  customMetadata?: Record<string, string>;
}

/** The part of an R2 bucket binding this cache uses. */
export interface OgImageBucket {
  get(key: string): Promise<OgImageBucketObject | null>;
  put(
    key: string,
    value: ArrayBuffer,
    options: {
      httpMetadata: { contentType: string; cacheControl: string };
      customMetadata: Record<string, string>;
    }
  ): Promise<unknown>;
}

export interface OgImageCacheOptions {
  bucket: OgImageBucket;
  /** Identifies the deployment; a new one starts with an empty cache. */
  deploymentId: string;
  render: (request: Request) => Promise<Response>;
  waitUntil: (promise: Promise<unknown>) => void;
  /** Reports a failure the cache recovered from. */
  onError?: (error: unknown) => void;
  now?: () => number;
}

interface Lifetime {
  sMaxAge: number;
  staleWhileRevalidate: number;
}

export function isOgImagePath(pathname: string): boolean {
  return OG_IMAGE_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** The R2 key for a request, or null when the URL is too long to be one. */
export function ogImageCacheKey(url: URL, deploymentId: string): string | null {
  const key = `${OG_IMAGE_KEY_PREFIX}/${deploymentId}/${url.host}${url.pathname}${url.search}`;
  return new TextEncoder().encode(key).byteLength <= MAX_KEY_BYTES ? key : null;
}

function directiveSeconds(cacheControl: string, name: string): number {
  const match = new RegExp(`(?:^|,)\\s*${name}\\s*=\\s*"?(\\d+)"?`, "i").exec(cacheControl);
  return match ? Number(match[1]) : 0;
}

/** How long a response may be shared, or null when it must not be. */
export function sharedLifetime(response: Response): Lifetime | null {
  if (response.status !== 200 || response.headers.has("set-cookie")) return null;
  if (!response.headers.get("content-type")?.startsWith("image/")) return null;
  const cacheControl = response.headers.get("cache-control") ?? "";
  if (!/(?:^|,)\s*public\s*(?:,|$)/i.test(cacheControl)) return null;
  if (/(?:^|,)\s*(?:private|no-store|no-cache)\s*(?:[,=]|$)/i.test(cacheControl)) return null;
  const sMaxAge = directiveSeconds(cacheControl, "s-maxage");
  if (sMaxAge <= 0) return null;
  return {
    sMaxAge,
    staleWhileRevalidate: directiveSeconds(cacheControl, "stale-while-revalidate"),
  };
}

function storedLifetime(object: OgImageBucketObject): Lifetime {
  return {
    sMaxAge: Number(object.customMetadata?.sMaxAge) || 0,
    staleWhileRevalidate: Number(object.customMetadata?.staleWhileRevalidate) || 0,
  };
}

// Background redraws in flight in this isolate, so a burst of requests for one
// stale image draws it once.
const refreshing = new Set<string>();

/** Response headers worth replaying from a cached copy, besides its type and lifetime. */
const REPLAYED_HEADERS = ["content-disposition", "content-security-policy", "vary"] as const;

export interface R2ResponseCacheOptions {
  bucket: OgImageBucket;
  /** Where the response lives in the bucket; null skips the cache. */
  key: string | null;
  render: (request: Request) => Promise<Response>;
  waitUntil: (promise: Promise<unknown>) => void;
  /** Response header that reports HIT, STALE or MISS. */
  statusHeader: string;
  /** Reports a failure the cache recovered from. */
  onError?: (error: unknown) => void;
  now?: () => number;
}

/**
 * Answers a GET request from the R2 copy under `key`, or renders it and stores
 * the result when its own `Cache-Control` allows sharing it (see
 * `sharedLifetime`). Fresh for `s-maxage`, then served for
 * `stale-while-revalidate` more while it is rendered again in the background.
 * Shared by the OG images and the `next/image` optimizer
 * (cloudflare/next-image-cache.ts).
 */
export async function serveFromR2Cache(
  request: Request,
  options: R2ResponseCacheOptions
): Promise<Response> {
  const {
    bucket,
    key,
    render,
    waitUntil,
    statusHeader,
    onError = () => {},
    now = Date.now,
  } = options;
  if (!key) return render(request);

  const tag = (response: Response, status: "HIT" | "STALE" | "MISS"): Response => {
    const tagged = new Response(response.body, response);
    tagged.headers.set(statusHeader, status);
    return tagged;
  };

  // Renders the response and stores it. Returns what the client gets.
  const renderAndStore = async (): Promise<Response> => {
    const response = await render(request);
    const lifetime = sharedLifetime(response);
    if (!lifetime) return response;
    const replayed: Record<string, string> = {};
    for (const name of REPLAYED_HEADERS) {
      const value = response.headers.get(name);
      if (value !== null) replayed[name] = value;
    }
    const copy = response.clone();
    waitUntil(
      copy
        .arrayBuffer()
        .then((body) =>
          bucket.put(key, body, {
            httpMetadata: {
              contentType: response.headers.get("content-type") ?? "image/png",
              cacheControl: response.headers.get("cache-control") ?? "",
            },
            customMetadata: {
              sMaxAge: String(lifetime.sMaxAge),
              staleWhileRevalidate: String(lifetime.staleWhileRevalidate),
              headers: JSON.stringify(replayed),
            },
          })
        )
        // SUPPRESSED: reported through onError; the client already has the response.
        .catch(onError)
    );
    return response;
  };

  let object: OgImageBucketObject | null = null;
  try {
    object = await bucket.get(key);
  } catch (error) {
    // SUPPRESSED: reported through onError; an R2 failure renders the response instead.
    onError(error);
  }
  if (!object) return tag(await renderAndStore(), "MISS");

  const ageSeconds = Math.max(0, Math.floor((now() - object.uploaded.getTime()) / 1000));
  const { sMaxAge, staleWhileRevalidate } = storedLifetime(object);
  if (ageSeconds >= sMaxAge + staleWhileRevalidate) {
    await object.body.cancel();
    return tag(await renderAndStore(), "MISS");
  }

  const stale = ageSeconds >= sMaxAge;
  if (stale && !refreshing.has(key)) {
    refreshing.add(key);
    waitUntil(
      renderAndStore()
        .then((response) => response.body?.cancel())
        .catch(onError)
        // SUPPRESSED: the .catch above reports through onError; the stale copy was already served.
        .finally(() => refreshing.delete(key))
    );
  }
  const headers = new Headers(storedHeaders(object));
  headers.set("content-type", object.httpMetadata?.contentType ?? "image/png");
  if (object.httpMetadata?.cacheControl) {
    headers.set("cache-control", object.httpMetadata.cacheControl);
  }
  headers.set("age", String(ageSeconds));
  headers.set(statusHeader, stale ? "STALE" : "HIT");
  return new Response(object.body, { status: 200, headers });
}

/** The replayed headers stored with an entry; none for entries written before they were. */
function storedHeaders(object: OgImageBucketObject): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(object.customMetadata?.headers ?? "{}");
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] =>
          (REPLAYED_HEADERS as readonly string[]).includes(entry[0]) && typeof entry[1] === "string"
      )
    );
  } catch {
    // SUPPRESSED: a malformed entry is replayed without its extra headers.
    return {};
  }
}

/**
 * Answers an OG image request from R2, or draws it with `render` and stores the
 * result. Call it only for GET requests whose path passes `isOgImagePath`.
 */
export function serveOgImage(request: Request, options: OgImageCacheOptions): Promise<Response> {
  return serveFromR2Cache(request, {
    ...options,
    key: ogImageCacheKey(new URL(request.url), options.deploymentId),
    statusHeader: OG_IMAGE_CACHE_HEADER,
  });
}
