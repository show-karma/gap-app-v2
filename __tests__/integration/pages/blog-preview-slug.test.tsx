/**
 * @file `/blog/preview/[slug]` route behavior: the editor-only twin of the
 * public post route. It is the only place draft mode is read, it is never
 * indexable, and it refuses to render at all without draft mode enabled.
 */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { createMockBlogPost } from "../../factories/blogPost.factory";

const { getPostBySlugMock, draftModeMock } = vi.hoisted(() => ({
  getPostBySlugMock: vi.fn(),
  draftModeMock: vi.fn(),
}));

const notFoundMock = vi.fn(() => {
  const err = new Error("NEXT_NOT_FOUND") as Error & { digest: string };
  err.digest = "NEXT_NOT_FOUND";
  throw err;
});

const redirectMock = vi.fn((path: string) => {
  const err = new Error(`NEXT_REDIRECT;${path}`) as Error & { digest: string };
  err.digest = `NEXT_REDIRECT;${path}`;
  throw err;
});

vi.mock("@/sanity/lib/gateway", () => ({
  getPostBySlug: getPostBySlugMock,
}));

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("next/navigation");
  return { ...actual, notFound: notFoundMock, redirect: redirectMock };
});

vi.mock("next/headers", () => ({
  draftMode: draftModeMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  draftModeMock.mockResolvedValue({ isEnabled: true });
});

describe("/blog/preview/[slug] page", () => {
  it("is marked as a blocking route", async () => {
    const mod = await import("@/app/t/[tenant]/(chrome)/blog/preview/[slug]/page");

    // A draft preview reads a cookie, so it can never prerender. Saying so with
    // `instant = false` is what lets the public post route stay cacheable.
    expect(mod.instant).toBe(false);
  });

  it("reads the draft post and renders it with the preview banner", async () => {
    const post = createMockBlogPost({ slug: "hello-world", title: "Hello World" });
    getPostBySlugMock.mockResolvedValue(post);

    const { default: Page } = await import("@/app/t/[tenant]/(chrome)/blog/preview/[slug]/page");
    render(await Page({ params: Promise.resolve({ slug: "hello-world" }) }));

    expect(getPostBySlugMock).toHaveBeenCalledWith("hello-world", { draft: true });
    expect(screen.getByRole("status")).toHaveTextContent(/preview mode/i);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hello World");
  });

  it("offers an exit link back out of preview mode", async () => {
    const post = createMockBlogPost({ slug: "hello-world", title: "Hello World" });
    getPostBySlugMock.mockResolvedValue(post);

    const { default: Page } = await import("@/app/t/[tenant]/(chrome)/blog/preview/[slug]/page");
    render(await Page({ params: Promise.resolve({ slug: "hello-world" }) }));

    const exitLink = screen.getByRole("link", { name: /exit preview/i });
    expect(exitLink).toHaveAttribute("href", expect.stringContaining("/api/blog/preview/exit"));
    expect(exitLink).toHaveAttribute("href", expect.stringContaining("slug=hello-world"));
  });

  it("redirects to the published post when draft mode is not enabled", async () => {
    draftModeMock.mockResolvedValue({ isEnabled: false });

    const { default: Page } = await import("@/app/t/[tenant]/(chrome)/blog/preview/[slug]/page");

    // Guessing the URL must not produce a second, unindexed copy of the post.
    await expect(Page({ params: Promise.resolve({ slug: "hello-world" }) })).rejects.toThrow(
      /NEXT_REDIRECT/
    );
    expect(redirectMock).toHaveBeenCalledWith("/blog/hello-world");
    expect(getPostBySlugMock).not.toHaveBeenCalled();
  });

  it("calls notFound() when the draft does not exist", async () => {
    getPostBySlugMock.mockResolvedValue(null);

    const { default: Page } = await import("@/app/t/[tenant]/(chrome)/blog/preview/[slug]/page");

    await expect(Page({ params: Promise.resolve({ slug: "nope" }) })).rejects.toThrow(
      /NEXT_NOT_FOUND/
    );
  });

  it("is never indexable", async () => {
    const { generateMetadata } = await import("@/app/t/[tenant]/(chrome)/blog/preview/[slug]/page");
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "hello-world" }),
    });

    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
