/**
 * @file The embedded Sanity Studio at `/admin/studio` is an internal
 * authoring tool and must never be indexed. Asserts the route's metadata
 * carries `robots: {index: false, follow: false}` — behavior only, no
 * Studio/Sanity internals.
 */

describe("/admin/studio layout metadata", () => {
  it("is noindex and nofollow", async () => {
    const { metadata } = await import("@/app/admin/studio/[[...tool]]/layout");

    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("uses the canonical /admin/studio path", async () => {
    const { metadata } = await import("@/app/admin/studio/[[...tool]]/layout");

    expect(metadata.alternates).toEqual({ canonical: "/admin/studio" });
  });
});
