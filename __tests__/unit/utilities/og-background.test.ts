/**
 * @vitest-environment node
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import * as Sentry from "@sentry/nextjs";
import {
  getOgBackgroundImage,
  OG_BACKGROUND_PATH,
  resetOgBackgroundImageForTests,
} from "@/utilities/og-background";

const readFileMock = vi.hoisted(() => vi.fn());

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  readFileMock.mockImplementation(actual.readFile);
  return { ...actual, default: { ...actual, readFile: readFileMock }, readFile: readFileMock };
});

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const JPEG_DATA_URI = /^url\(data:image\/jpeg;base64,([A-Za-z0-9+/=]+)\)$/;
const CLOUDFLARE_CONTEXT_SYMBOL = Symbol.for("__cloudflare-context__");

function setCloudflareAssets(assets?: { fetch: (input: RequestInfo | URL) => Promise<Response> }) {
  (globalThis as Record<PropertyKey, unknown>)[CLOUDFLARE_CONTEXT_SYMBOL] = assets
    ? { env: { ASSETS: assets } }
    : undefined;
}

describe("getOgBackgroundImage", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    delete (globalThis as Record<PropertyKey, unknown>)[CLOUDFLARE_CONTEXT_SYMBOL];
    const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    readFileMock.mockImplementation(actual.readFile);
    resetOgBackgroundImageForTests();
  });

  afterEach(() => {
    delete (globalThis as Record<PropertyKey, unknown>)[CLOUDFLARE_CONTEXT_SYMBOL];
  });

  it("inlines the committed JPEG from public/ as a data URI", async () => {
    const value = await getOgBackgroundImage();

    const match = value.match(JPEG_DATA_URI);
    expect(match).not.toBeNull();
    const bytes = Buffer.from(match?.[1] ?? "", "base64");
    // JPEG SOI marker, and small enough that inlining it stays cheap.
    expect(bytes.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
    expect(bytes.length).toBeLessThan(50 * 1024);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("reads the file once per server instance", async () => {
    await getOgBackgroundImage();
    await getOgBackgroundImage();

    expect(readFileMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to the CDN URL and reports to Sentry when the file is missing", async () => {
    const error = Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    readFileMock.mockRejectedValueOnce(error);

    const value = await getOgBackgroundImage();

    expect(value).toMatch(new RegExp(`^url\\(https?://[^)]+${OG_BACKGROUND_PATH}\\)$`));
    expect(Sentry.captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({ tags: expect.objectContaining({ asset: "og-background" }) })
    );
  });

  it("reads from Cloudflare ASSETS binding when present without touching fs or reporting to Sentry", async () => {
    const sampleJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const assetsFetch = vi.fn(async (input: RequestInfo | URL) => {
      expect(input instanceof Request ? input.url : String(input)).toBe(
        `https://assets.local${OG_BACKGROUND_PATH}`
      );
      return new Response(sampleJpeg, { status: 200 });
    });
    setCloudflareAssets({ fetch: assetsFetch });

    const first = await getOgBackgroundImage();
    const second = await getOgBackgroundImage();

    expect(first).toBe(`url(data:image/jpeg;base64,${Buffer.from(sampleJpeg).toString("base64")})`);
    expect(second).toBe(first);
    expect(assetsFetch).toHaveBeenCalledTimes(1);
    expect(readFileMock).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("falls back to CDN URL and reports to Sentry when Cloudflare ASSETS fetch returns non-OK", async () => {
    setCloudflareAssets({
      fetch: vi.fn(async () => new Response("Not Found", { status: 404 })),
    });

    const value = await getOgBackgroundImage();

    expect(value).toMatch(new RegExp(`^url\\(https?://[^)]+${OG_BACKGROUND_PATH}\\)$`));
    expect(readFileMock).not.toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: `ASSETS fetch for ${OG_BACKGROUND_PATH} returned HTTP 404`,
      }),
      expect.objectContaining({ tags: expect.objectContaining({ asset: "og-background" }) })
    );
  });

  it("does not share an in-flight ASSETS fetch across concurrent cold calls", async () => {
    const sampleJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const resolvers: Array<(res: Response) => void> = [];
    const assetsFetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolvers.push(resolve);
        })
    );
    setCloudflareAssets({ fetch: assetsFetch });

    const firstPromise = getOgBackgroundImage();
    const secondPromise = getOgBackgroundImage();
    expect(assetsFetch).toHaveBeenCalledTimes(2);

    resolvers[0]?.(new Response(sampleJpeg, { status: 200 }));
    resolvers[1]?.(new Response(sampleJpeg, { status: 200 }));

    const [first, second] = await Promise.all([firstPromise, secondPromise]);
    const expected = `url(data:image/jpeg;base64,${Buffer.from(sampleJpeg).toString("base64")})`;
    expect(first).toBe(expected);
    expect(second).toBe(expected);

    const third = await getOgBackgroundImage();
    expect(third).toBe(expected);
    expect(assetsFetch).toHaveBeenCalledTimes(2);
  });

  it("cancels non-OK ASSETS body and retries on the next call instead of caching the fallback", async () => {
    const sampleJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const notFound = new Response("Not Found", { status: 404 });
    if (!notFound.body) {
      throw new Error("Expected response body on 404 test response");
    }
    const cancelSpy = vi.spyOn(notFound.body, "cancel");
    const assetsFetch = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(notFound)
      .mockResolvedValueOnce(new Response(sampleJpeg, { status: 200 }));
    setCloudflareAssets({ fetch: assetsFetch });

    const fallback = await getOgBackgroundImage();
    expect(fallback).toMatch(new RegExp(`^url\\(https?://[^)]+${OG_BACKGROUND_PATH}\\)$`));
    expect(cancelSpy).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);

    const recovered = await getOgBackgroundImage();
    expect(recovered).toBe(
      `url(data:image/jpeg;base64,${Buffer.from(sampleJpeg).toString("base64")})`
    );
    expect(assetsFetch).toHaveBeenCalledTimes(2);
  });
});

describe("legacy background.png", () => {
  it("permanently redirects to the JPEG so older deployments keep their card background", () => {
    const source = readFileSync(
      path.resolve(__dirname, "..", "..", "..", "next.config.ts"),
      "utf8"
    );
    const blockRe =
      /\{\s*source:\s*["']\/assets\/previews\/background\.png["']\s*,\s*destination:\s*["']([^"']+)["']\s*,\s*permanent:\s*(true|false)\s*,?\s*\}/;
    const match = source.match(blockRe);

    expect(match, "a redirect for /assets/previews/background.png should exist").not.toBeNull();
    expect(match?.[1]).toBe(OG_BACKGROUND_PATH);
    expect(match?.[2]).toBe("true");
  });
});
