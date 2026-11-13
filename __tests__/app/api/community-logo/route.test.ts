/**
 * @file GET /api/community-logo/[slug]/[hash] serves a community logo that the
 * indexer stores inline, so cached pages can link it instead of embedding it.
 */

const getCommunityDetailsCachedMock = vi.hoisted(() => vi.fn());

vi.mock("@/utilities/queries/v2/getCommunityData.cached", () => ({
  getCommunityDetailsCached: getCommunityDetailsCachedMock,
}));

import { GET } from "@/app/api/community-logo/[slug]/[hash]/route";
import { inlineImageHash } from "@/utilities/community-logo.server";

const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

const call = (slug: string, hash: string) =>
  GET(new Request(`http://localhost/api/community-logo/${slug}/${hash}`), {
    params: Promise.resolve({ slug, hash }),
  });

describe("GET /api/community-logo/[slug]/[hash]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("serves the current logo as an immutable image", async () => {
    getCommunityDetailsCachedMock.mockResolvedValue({
      details: { slug: "gitcoin", logoUrl: PIXEL },
    });

    const res = await call("gitcoin", inlineImageHash(PIXEL));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toContain("immutable");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });

  it("serves the current logo briefly when the hash is from an older logo", async () => {
    getCommunityDetailsCachedMock.mockResolvedValue({
      details: { slug: "gitcoin", logoUrl: PIXEL },
    });

    const res = await call("gitcoin", "0123456789abcdef");

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("public, max-age=300, s-maxage=300");
  });

  it.each([
    ["a malformed slug", "../etc", "0123456789abcdef"],
    ["a malformed hash", "gitcoin", "nothex"],
  ])("returns 404 for %s without looking anything up", async (_label, slug, hash) => {
    const res = await call(slug, hash);
    expect(res.status).toBe(404);
    expect(getCommunityDetailsCachedMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the logo is a normal URL — it is not a redirector", async () => {
    getCommunityDetailsCachedMock.mockResolvedValue({
      details: { slug: "optimism", logoUrl: "https://cdn.example/op.png" },
    });
    expect((await call("optimism", "0123456789abcdef")).status).toBe(404);
  });

  it("returns 404 when the community cannot be loaded", async () => {
    getCommunityDetailsCachedMock.mockRejectedValue(new Error("indexer down"));
    expect((await call("gitcoin", "0123456789abcdef")).status).toBe(404);
  });
});
