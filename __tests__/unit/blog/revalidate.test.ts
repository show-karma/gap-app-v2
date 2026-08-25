/**
 * @file Pure webhook-payload-to-paths mapper. No Sanity client, no Next
 * request/response — just plain objects in, string[] out.
 */
import { describe, expect, it } from "vitest";
import { mapPayloadToPaths } from "@/src/domain/blog/revalidate";

describe("mapPayloadToPaths", () => {
  it("maps a post payload (string slug) to the post path, the blog index, and the sitemap", () => {
    const paths = mapPayloadToPaths({ _type: "post", slug: "hello-world" });

    expect(paths).toEqual(["/blog", "/blog/hello-world", "/sitemaps/static/sitemap.xml"]);
  });

  it("maps a post payload (object slug, Sanity's native shape) the same way", () => {
    const paths = mapPayloadToPaths({ _type: "post", slug: { current: "hello-world" } });

    expect(paths).toEqual(["/blog", "/blog/hello-world", "/sitemaps/static/sitemap.xml"]);
  });

  it("still revalidates the index and sitemap for a post payload with no slug (e.g. unpublish before a slug was set)", () => {
    const paths = mapPayloadToPaths({ _type: "post" });

    expect(paths).toEqual(["/blog", "/sitemaps/static/sitemap.xml"]);
  });

  it("returns an empty list for a non-post document type", () => {
    const paths = mapPayloadToPaths({ _type: "author", slug: "karma" });

    expect(paths).toEqual([]);
  });

  it("returns an empty list for a null or undefined payload", () => {
    expect(mapPayloadToPaths(null)).toEqual([]);
    expect(mapPayloadToPaths(undefined)).toEqual([]);
  });

  it("returns an empty list for a payload with no _type at all", () => {
    expect(mapPayloadToPaths({ slug: "hello-world" })).toEqual([]);
  });
});
