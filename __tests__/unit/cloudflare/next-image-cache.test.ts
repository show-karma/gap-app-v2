/**
 * @vitest-environment node
 */
import {
  acceptedFormat,
  isNextImagePath,
  NEXT_IMAGE_CACHE_HEADER,
  nextImageCacheKey,
  withImageLifetime,
} from "../../../cloudflare/next-image-cache";
import {
  type OgImageBucket,
  type OgImageBucketObject,
  serveFromR2Cache,
} from "../../../cloudflare/og-image-cache";

// On Workers the OpenNext optimizer transforms every /_next/image request
// again; the result now goes to R2 like the OG images
// (cloudflare/next-image-cache.ts).

const DEPLOYMENT = "version-1";
const WEBP_ACCEPT = "image/avif,image/webp,image/apng,*/*;q=0.8";
const T0 = Date.UTC(2026, 10, 24, 12);
const HOUR = 3600;

const imageUrl = (source: string, w = "640", q = "75") =>
  new URL(`https://app.test/_next/image?url=${encodeURIComponent(source)}&w=${w}&q=${q}`);

describe("isNextImagePath", () => {
  it("matches the optimizer path only", () => {
    expect(isNextImagePath("/_next/image")).toBe(true);
    expect(isNextImagePath("/_next/image/")).toBe(true);
    expect(isNextImagePath("/_next/images")).toBe(false);
    expect(isNextImagePath("/_next/static/media/a.png")).toBe(false);
  });
});

describe("acceptedFormat", () => {
  it("picks the most specific format the client accepts", () => {
    expect(acceptedFormat(WEBP_ACCEPT)).toBe("avif");
    expect(acceptedFormat("image/webp,*/*")).toBe("webp");
    expect(acceptedFormat("*/*")).toBe("original");
    expect(acceptedFormat(null)).toBe("original");
  });
});

describe("nextImageCacheKey", () => {
  it("keys a local image on the deployment, and a remote one without it", () => {
    expect(nextImageCacheKey(imageUrl("/images/a.png"), WEBP_ACCEPT, DEPLOYMENT)).toBe(
      "next-images/local/version-1/avif/w640-q75/%2Fimages%2Fa.png"
    );
    expect(nextImageCacheKey(imageUrl("https://cdn.test/a.png"), "*/*", DEPLOYMENT)).toBe(
      "next-images/remote/original/w640-q75/https%3A%2F%2Fcdn.test%2Fa.png"
    );
  });

  it("separates sizes, qualities and formats", () => {
    const keys = new Set([
      nextImageCacheKey(imageUrl("/a.png", "640"), WEBP_ACCEPT, DEPLOYMENT),
      nextImageCacheKey(imageUrl("/a.png", "1080"), WEBP_ACCEPT, DEPLOYMENT),
      nextImageCacheKey(imageUrl("/a.png", "640", "50"), WEBP_ACCEPT, DEPLOYMENT),
      nextImageCacheKey(imageUrl("/a.png"), "*/*", DEPLOYMENT),
    ]);
    expect(keys.size).toBe(4);
  });

  it("is null without exactly one url, or when the key would be too long for R2", () => {
    expect(nextImageCacheKey(new URL("https://app.test/_next/image?w=64"), null, DEPLOYMENT)).toBe(
      null
    );
    const twice = new URL("https://app.test/_next/image?url=/a.png&url=/b.png&w=64&q=75");
    expect(nextImageCacheKey(twice, null, DEPLOYMENT)).toBeNull();
    const long = imageUrl(`https://cdn.test/${"x".repeat(1100)}.png`);
    expect(nextImageCacheKey(long, null, DEPLOYMENT)).toBeNull();
  });
});

describe("withImageLifetime", () => {
  it("gives an optimized image four hours fresh and a week stale", () => {
    const response = withImageLifetime(
      new Response("webp", { headers: { "content-type": "image/webp", vary: "Accept" } })
    );
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=14400, s-maxage=14400, stale-while-revalidate=604800"
    );
    expect(response.headers.get("vary")).toBe("Accept");
  });

  it("keeps an immutable image immutable for a year", () => {
    const response = withImageLifetime(
      new Response("png", {
        headers: {
          "content-type": "image/png",
          "cache-control": "public, max-age=315360000, immutable",
        },
      })
    );
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=31536000, s-maxage=31536000, immutable"
    );
  });

  it("leaves errors, non-images and responses with cookies alone", () => {
    for (const response of [
      new Response("bad", { status: 400, headers: { "content-type": "text/plain" } }),
      new Response("gone", { status: 404, headers: { "content-type": "image/png" } }),
      new Response("<svg/>", { headers: { "content-type": "text/html" } }),
      new Response("png", { headers: { "content-type": "image/png", "set-cookie": "a=1" } }),
    ]) {
      expect(withImageLifetime(response)).toBe(response);
    }
  });
});

describe("serveFromR2Cache with optimized images", () => {
  interface Stored {
    body: Uint8Array;
    uploaded: Date;
    httpMetadata: { contentType: string; cacheControl: string };
    customMetadata: Record<string, string>;
  }

  function fakeBucket() {
    const objects = new Map<string, Stored>();
    return {
      objects,
      get: vi.fn(async (key: string): Promise<OgImageBucketObject | null> => {
        const stored = objects.get(key);
        if (!stored) return null;
        return { ...stored, body: new Response(stored.body).body as ReadableStream };
      }),
      put: vi.fn(async (key: string, value: ArrayBuffer, options) => {
        objects.set(key, { body: new Uint8Array(value), uploaded: new Date(T0), ...options });
      }),
    } satisfies OgImageBucket & { objects: unknown };
  }

  it("optimizes once, then replays the image with its type, lifetime and safety headers", async () => {
    const bucket = fakeBucket();
    const pending: Promise<unknown>[] = [];
    const render = vi.fn(async () =>
      withImageLifetime(
        new Response("webp-bytes", {
          headers: {
            "content-type": "image/webp",
            vary: "Accept",
            "content-security-policy": "script-src 'none'; frame-src 'none'; sandbox;",
            "content-disposition": 'attachment; filename="a.webp"',
          },
        })
      )
    );
    const url = imageUrl("/images/a.png");
    const serve = (now: number) =>
      serveFromR2Cache(new Request(url, { headers: { accept: WEBP_ACCEPT } }), {
        bucket,
        key: nextImageCacheKey(url, WEBP_ACCEPT, DEPLOYMENT),
        render,
        waitUntil: (promise) => pending.push(promise),
        statusHeader: NEXT_IMAGE_CACHE_HEADER,
        now: () => now,
      });

    const first = await serve(T0);
    await Promise.all(pending);
    expect(first.headers.get(NEXT_IMAGE_CACHE_HEADER)).toBe("MISS");
    expect(await first.text()).toBe("webp-bytes");

    const second = await serve(T0 + HOUR * 1000);
    expect(render).toHaveBeenCalledTimes(1);
    expect(second.headers.get(NEXT_IMAGE_CACHE_HEADER)).toBe("HIT");
    expect(second.headers.get("content-type")).toBe("image/webp");
    expect(second.headers.get("cache-control")).toBe(
      "public, max-age=14400, s-maxage=14400, stale-while-revalidate=604800"
    );
    expect(second.headers.get("vary")).toBe("Accept");
    expect(second.headers.get("content-security-policy")).toBe(
      "script-src 'none'; frame-src 'none'; sandbox;"
    );
    expect(second.headers.get("content-disposition")).toBe('attachment; filename="a.webp"');
    expect(await second.text()).toBe("webp-bytes");

    const stale = await serve(T0 + 5 * HOUR * 1000);
    await Promise.all(pending);
    expect(stale.headers.get(NEXT_IMAGE_CACHE_HEADER)).toBe("STALE");
    expect(render).toHaveBeenCalledTimes(2);
  });

  it("does not store an error from the optimizer", async () => {
    const bucket = fakeBucket();
    const pending: Promise<unknown>[] = [];
    const url = imageUrl("https://cdn.test/missing.png");
    const response = await serveFromR2Cache(new Request(url), {
      bucket,
      key: nextImageCacheKey(url, null, DEPLOYMENT),
      render: async () => withImageLifetime(new Response("upstream invalid", { status: 404 })),
      waitUntil: (promise) => pending.push(promise),
      statusHeader: NEXT_IMAGE_CACHE_HEADER,
    });
    await Promise.all(pending);
    expect(response.status).toBe(404);
    expect(bucket.put).not.toHaveBeenCalled();
  });
});
