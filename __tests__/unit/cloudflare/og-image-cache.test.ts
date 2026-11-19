/**
 * @vitest-environment node
 */
import {
  isOgImagePath,
  OG_IMAGE_CACHE_HEADER,
  type OgImageBucket,
  type OgImageBucketObject,
  ogImageCacheKey,
  serveOgImage,
  sharedLifetime,
} from "../../../cloudflare/og-image-cache";

// On Workers nothing caches what the Worker returns, so without this every
// crawler request draws the OG image again (cloudflare/og-image-cache.ts).

const PROJECT_URL = "https://app.test/api/metadata/projects/gitcoin";
const DEPLOYMENT = "version-1";
const KEY = `og-images/${DEPLOYMENT}/app.test/api/metadata/projects/gitcoin`;
const T0 = Date.UTC(2026, 10, 19, 12);
const DAY = 86_400;

interface Stored {
  body: Uint8Array;
  uploaded: Date;
  httpMetadata: { contentType: string; cacheControl: string };
  customMetadata: Record<string, string>;
}

function fakeBucket(initial: Record<string, Stored> = {}) {
  const objects = new Map(Object.entries(initial));
  const bucket = {
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
  return bucket;
}

function stored(ageSeconds: number, sMaxAge = DAY, staleWhileRevalidate = 7 * DAY): Stored {
  return {
    body: new TextEncoder().encode("cached-png"),
    uploaded: new Date(T0 - ageSeconds * 1000),
    httpMetadata: { contentType: "image/png", cacheControl: "public, max-age=3600" },
    customMetadata: {
      sMaxAge: String(sMaxAge),
      staleWhileRevalidate: String(staleWhileRevalidate),
    },
  };
}

function png(headers: Record<string, string> = {}, status = 200) {
  return new Response("fresh-png", {
    status,
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      ...headers,
    },
  });
}

function setup(bucket = fakeBucket(), response: () => Response = () => png()) {
  const pending: Promise<unknown>[] = [];
  const render = vi.fn(async (_request: Request) => response());
  const onError = vi.fn();
  const serve = (url = PROJECT_URL) =>
    serveOgImage(new Request(url), {
      bucket,
      deploymentId: DEPLOYMENT,
      render,
      waitUntil: (promise) => pending.push(promise),
      onError,
      now: () => T0,
    });
  const settle = () => Promise.all(pending);
  return { bucket, render, onError, serve, settle };
}

describe("isOgImagePath", () => {
  it.each([
    "/api/metadata/projects/gitcoin",
    "/api/metadata/communities/optimism",
    "/api/metadata/knowledge",
    "/api/scanner/og/some-slug",
  ])("is true for %s", (path) => {
    expect(isOgImagePath(path)).toBe(true);
  });

  it.each(["/api/metadata", "/api/projects/gitcoin", "/project/gitcoin"])(
    "is false for %s",
    (path) => {
      expect(isOgImagePath(path)).toBe(false);
    }
  );
});

describe("ogImageCacheKey", () => {
  it("keys on the deployment, host, path and query", () => {
    expect(ogImageCacheKey(new URL(`${PROJECT_URL}?a=1`), DEPLOYMENT)).toBe(`${KEY}?a=1`);
    expect(ogImageCacheKey(new URL("https://other.test/api/metadata/knowledge"), "v2")).toBe(
      "og-images/v2/other.test/api/metadata/knowledge"
    );
  });

  it("is null when the key would be longer than R2 allows", () => {
    const url = new URL(`https://app.test/api/metadata/knowledge?title=${"x".repeat(1000)}`);
    expect(ogImageCacheKey(url, DEPLOYMENT)).toBeNull();
  });
});

describe("sharedLifetime", () => {
  it("reads s-maxage and stale-while-revalidate", () => {
    expect(sharedLifetime(png())).toEqual({ sMaxAge: DAY, staleWhileRevalidate: 7 * DAY });
    expect(sharedLifetime(png({ "cache-control": "public, max-age=600, s-maxage=3600" }))).toEqual({
      sMaxAge: 3600,
      staleWhileRevalidate: 0,
    });
  });

  it.each([
    ["an error status", png({}, 500)],
    ["a cookie", png({ "set-cookie": "a=b" })],
    ["a non-image", png({ "content-type": "text/html" })],
    ["no public", png({ "cache-control": "max-age=3600, s-maxage=86400" })],
    ["private", png({ "cache-control": "public, private, s-maxage=86400" })],
    ["no-store", png({ "cache-control": "public, no-store, s-maxage=86400" })],
    ["no s-maxage", png({ "cache-control": "public, max-age=3600" })],
    ["s-maxage=0", png({ "cache-control": "public, s-maxage=0" })],
  ])("is null for %s", (_label, response) => {
    expect(sharedLifetime(response)).toBeNull();
  });
});

describe("serveOgImage", () => {
  it("draws and stores the image on a miss", async () => {
    const { bucket, render, serve, settle } = setup();

    const response = await serve();
    await settle();

    expect(render).toHaveBeenCalledTimes(1);
    expect(response.headers.get(OG_IMAGE_CACHE_HEADER)).toBe("MISS");
    expect(await response.text()).toBe("fresh-png");
    expect(bucket.put).toHaveBeenCalledWith(KEY, expect.any(ArrayBuffer), {
      httpMetadata: {
        contentType: "image/png",
        cacheControl: "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
      customMetadata: { sMaxAge: String(DAY), staleWhileRevalidate: String(7 * DAY) },
    });
    expect(new TextDecoder().decode(bucket.objects.get(KEY)?.body)).toBe("fresh-png");
  });

  it("answers a fresh entry from R2 without drawing", async () => {
    const { render, serve, settle } = setup(fakeBucket({ [KEY]: stored(DAY - 1) }));

    const response = await serve();
    await settle();

    expect(render).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.headers.get(OG_IMAGE_CACHE_HEADER)).toBe("HIT");
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toBe("public, max-age=3600");
    expect(response.headers.get("age")).toBe(String(DAY - 1));
    expect(await response.text()).toBe("cached-png");
  });

  it("serves a stale entry and redraws it once in the background", async () => {
    const { bucket, render, serve, settle } = setup(fakeBucket({ [KEY]: stored(2 * DAY) }));

    const [first, second] = await Promise.all([serve(), serve()]);
    await settle();

    expect(first.headers.get(OG_IMAGE_CACHE_HEADER)).toBe("STALE");
    expect(await first.text()).toBe("cached-png");
    expect(second.headers.get(OG_IMAGE_CACHE_HEADER)).toBe("STALE");
    expect(render).toHaveBeenCalledTimes(1);
    expect(bucket.put).toHaveBeenCalledTimes(1);
    expect(bucket.objects.get(KEY)?.uploaded.getTime()).toBe(T0);
  });

  it("draws again once an entry is past its stale window", async () => {
    const { bucket, render, serve, settle } = setup(fakeBucket({ [KEY]: stored(3600, 3600, 0) }));

    const response = await serve();
    await settle();

    expect(render).toHaveBeenCalledTimes(1);
    expect(response.headers.get(OG_IMAGE_CACHE_HEADER)).toBe("MISS");
    expect(await response.text()).toBe("fresh-png");
    expect(bucket.put).toHaveBeenCalledTimes(1);
  });

  it("does not store a response that must not be shared", async () => {
    const { bucket, serve, settle } = setup(fakeBucket(), () => png({}, 500));

    const response = await serve();
    await settle();

    expect(response.status).toBe(500);
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it("draws without the cache when the URL is too long for a key", async () => {
    const { bucket, render, serve } = setup();

    const response = await serve(`${PROJECT_URL}?q=${"x".repeat(1100)}`);

    expect(render).toHaveBeenCalledTimes(1);
    expect(bucket.get).not.toHaveBeenCalled();
    expect(response.headers.has(OG_IMAGE_CACHE_HEADER)).toBe(false);
  });

  it("draws the image when R2 cannot be read", async () => {
    const bucket = fakeBucket();
    bucket.get.mockRejectedValueOnce(new Error("R2 down"));
    const { render, onError, serve, settle } = setup(bucket);

    const response = await serve();
    await settle();

    expect(render).toHaveBeenCalledTimes(1);
    expect(await response.text()).toBe("fresh-png");
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "R2 down" }));
  });

  it("still answers when R2 cannot be written", async () => {
    const bucket = fakeBucket();
    bucket.put.mockRejectedValueOnce(new Error("R2 full"));
    const { onError, serve, settle } = setup(bucket);

    const response = await serve();
    await settle();

    expect(await response.text()).toBe("fresh-png");
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "R2 full" }));
  });
});
