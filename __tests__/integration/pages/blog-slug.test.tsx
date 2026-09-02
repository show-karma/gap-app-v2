/**
 * @file `/blog/[slug]` route behavior: renders a found post with its
 * JSON-LD, and calls Next's `notFound()` for an unknown slug. Behavior
 * only — never asserts GROQ or gateway internals.
 */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { createMockBlogPost } from "../../factories/blogPost.factory";

const { getPostBySlugMock, getPublishedPostBySlugMock, draftModeMock } = vi.hoisted(() => ({
  getPostBySlugMock: vi.fn(),
  getPublishedPostBySlugMock: vi.fn(),
  draftModeMock: vi.fn(),
}));

const notFoundMock = vi.fn(() => {
  const err = new Error("NEXT_NOT_FOUND") as Error & { digest: string };
  err.digest = "NEXT_NOT_FOUND";
  throw err;
});

vi.mock("@/sanity/lib/gateway", () => ({
  getPostBySlug: getPostBySlugMock,
  getPublishedPostBySlug: getPublishedPostBySlugMock,
}));

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("next/navigation");
  return {
    ...actual,
    notFound: notFoundMock,
  };
});

vi.mock("next/headers", () => ({
  draftMode: draftModeMock,
}));

function getJsonLdScripts(container: HTMLElement) {
  return Array.from(container.querySelectorAll('script[type="application/ld+json"]'));
}

beforeEach(() => {
  vi.clearAllMocks();
  draftModeMock.mockResolvedValue({ isEnabled: false });
});

describe("/blog/[slug] page", () => {
  it("renders the post title, body, and author for a known slug", async () => {
    const post = createMockBlogPost({ slug: "hello-world", title: "Hello World" });
    getPublishedPostBySlugMock.mockResolvedValue(post);

    const { default: BlogPostPage } = await import("@/app/t/[tenant]/(chrome)/blog/[slug]/page");
    const result = await BlogPostPage({ params: Promise.resolve({ slug: "hello-world" }) });
    render(result);

    expect(screen.getByRole("heading", { level: 1, name: "Hello World" })).toBeInTheDocument();
    expect(screen.getByText("This is the post body.")).toBeInTheDocument();
    expect(screen.getByText("Karma")).toBeInTheDocument();
  });

  it("renders ArticleJsonLd and BreadcrumbJsonLd for a known slug", async () => {
    const post = createMockBlogPost({ slug: "hello-world", title: "Hello World" });
    getPublishedPostBySlugMock.mockResolvedValue(post);

    const { default: BlogPostPage } = await import("@/app/t/[tenant]/(chrome)/blog/[slug]/page");
    const result = await BlogPostPage({ params: Promise.resolve({ slug: "hello-world" }) });
    const { container } = render(result);

    const scripts = getJsonLdScripts(container);
    const schemas = scripts.map((s) => JSON.parse(s.innerHTML));
    const article = schemas.find((s) => s["@type"] === "Article");
    const breadcrumbs = schemas.find((s) => s["@type"] === "BreadcrumbList");

    expect(article).toBeDefined();
    expect(article.headline).toBe("Hello World");
    expect(breadcrumbs).toBeDefined();
  });

  it("calls notFound() for an unknown slug", async () => {
    getPublishedPostBySlugMock.mockResolvedValue(null);

    const { default: BlogPostPage } = await import("@/app/t/[tenant]/(chrome)/blog/[slug]/page");

    await expect(
      BlogPostPage({ params: Promise.resolve({ slug: "does-not-exist" }) })
    ).rejects.toThrow(/NEXT_NOT_FOUND/);
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("generateMetadata uses the post title/excerpt for a known slug", async () => {
    const post = createMockBlogPost({ slug: "hello-world", title: "Hello World" });
    getPublishedPostBySlugMock.mockResolvedValue(post);

    const { generateMetadata } = await import("@/app/t/[tenant]/(chrome)/blog/[slug]/page");
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "hello-world" }) });

    expect(metadata.title).toBe("Hello World");
    expect(metadata.description).toBe(post.excerpt);
  });

  it("generateMetadata falls back to a noindex title for an unknown slug", async () => {
    getPublishedPostBySlugMock.mockResolvedValue(null);

    const { generateMetadata } = await import("@/app/t/[tenant]/(chrome)/blog/[slug]/page");
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "does-not-exist" }),
    });

    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  describe("draft mode", () => {
    it("never reads draft mode — that is what keeps this route prerenderable", async () => {
      const post = createMockBlogPost({ slug: "hello-world", title: "Hello World" });
      getPublishedPostBySlugMock.mockResolvedValue(post);

      const { default: BlogPostPage } = await import("@/app/t/[tenant]/(chrome)/blog/[slug]/page");
      render(await BlogPostPage({ params: Promise.resolve({ slug: "hello-world" }) }));

      // `draftMode()` is a request read; one here would hold a sitemap-crawlable
      // route out of the prerender, which is the whole reason preview moved to
      // its own route.
      expect(draftModeMock).not.toHaveBeenCalled();
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("reads only published content, never the draft variant", async () => {
      const post = createMockBlogPost({ slug: "hello-world", title: "Hello World" });
      getPublishedPostBySlugMock.mockResolvedValue(post);

      const { default: BlogPostPage } = await import("@/app/t/[tenant]/(chrome)/blog/[slug]/page");
      await BlogPostPage({ params: Promise.resolve({ slug: "hello-world" }) });

      expect(getPublishedPostBySlugMock).toHaveBeenCalledWith("hello-world");
      expect(getPostBySlugMock).not.toHaveBeenCalled();
    });
  });
});
