/**
 * @file `/blog/[slug]` route behavior: renders a found post with its
 * JSON-LD, and calls Next's `notFound()` for an unknown slug. Behavior
 * only — never asserts GROQ or gateway internals.
 */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { createMockBlogPost } from "../../factories/blogPost.factory";

const { getPostBySlugMock } = vi.hoisted(() => ({
  getPostBySlugMock: vi.fn(),
}));

const notFoundMock = vi.fn(() => {
  const err = new Error("NEXT_NOT_FOUND") as Error & { digest: string };
  err.digest = "NEXT_NOT_FOUND";
  throw err;
});

vi.mock("@/sanity/lib/gateway", () => ({
  getPostBySlug: getPostBySlugMock,
}));

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("next/navigation");
  return {
    ...actual,
    notFound: notFoundMock,
  };
});

function getJsonLdScripts(container: HTMLElement) {
  return Array.from(container.querySelectorAll('script[type="application/ld+json"]'));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/blog/[slug] page", () => {
  it("renders the post title, body, and author for a known slug", async () => {
    const post = createMockBlogPost({ slug: "hello-world", title: "Hello World" });
    getPostBySlugMock.mockResolvedValue(post);

    const { default: BlogPostPage } = await import("@/app/blog/[slug]/page");
    const result = await BlogPostPage({ params: Promise.resolve({ slug: "hello-world" }) });
    render(result);

    expect(screen.getByRole("heading", { level: 1, name: "Hello World" })).toBeInTheDocument();
    expect(screen.getByText("This is the post body.")).toBeInTheDocument();
    expect(screen.getByText("Karma")).toBeInTheDocument();
  });

  it("renders ArticleJsonLd and BreadcrumbJsonLd for a known slug", async () => {
    const post = createMockBlogPost({ slug: "hello-world", title: "Hello World" });
    getPostBySlugMock.mockResolvedValue(post);

    const { default: BlogPostPage } = await import("@/app/blog/[slug]/page");
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
    getPostBySlugMock.mockResolvedValue(null);

    const { default: BlogPostPage } = await import("@/app/blog/[slug]/page");

    await expect(
      BlogPostPage({ params: Promise.resolve({ slug: "does-not-exist" }) })
    ).rejects.toThrow(/NEXT_NOT_FOUND/);
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("generateMetadata uses the post title/excerpt for a known slug", async () => {
    const post = createMockBlogPost({ slug: "hello-world", title: "Hello World" });
    getPostBySlugMock.mockResolvedValue(post);

    const { generateMetadata } = await import("@/app/blog/[slug]/page");
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "hello-world" }) });

    expect(metadata.title).toBe("Hello World");
    expect(metadata.description).toBe(post.excerpt);
  });

  it("generateMetadata falls back to a noindex title for an unknown slug", async () => {
    getPostBySlugMock.mockResolvedValue(null);

    const { generateMetadata } = await import("@/app/blog/[slug]/page");
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "does-not-exist" }),
    });

    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});
