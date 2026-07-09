/**
 * @file `/blog` index route behavior: newest-first list, designed empty
 * state, and JSON-LD presence. The error state (error.tsx) is exercised
 * separately since it's a client boundary Next mounts on a render throw,
 * not something the page component itself returns.
 */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { createMockBlogPostSummary } from "../../factories/blogPost.factory";

const { getPublishedPostsMock } = vi.hoisted(() => ({
  getPublishedPostsMock: vi.fn(),
}));

vi.mock("@/sanity/lib/gateway", () => ({
  getPublishedPosts: getPublishedPostsMock,
}));

function getJsonLdScripts(container: HTMLElement) {
  return Array.from(container.querySelectorAll('script[type="application/ld+json"]'));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/blog index page", () => {
  it("renders posts newest-first with title, excerpt, date, and tag chips", async () => {
    const posts = [
      createMockBlogPostSummary({ slug: "newer-post", title: "Newer Post" }),
      createMockBlogPostSummary({ slug: "older-post", title: "Older Post" }),
    ];
    getPublishedPostsMock.mockResolvedValue(posts);

    const { default: BlogIndexPage } = await import("@/app/blog/page");
    const result = await BlogIndexPage();
    render(result);

    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings[0]).toHaveTextContent("Newer Post");
    expect(headings[1]).toHaveTextContent("Older Post");
    expect(screen.getAllByText(posts[0].excerpt).length).toBeGreaterThan(0);
    expect(screen.getAllByText("grants").length).toBeGreaterThan(0);
  });

  it("tag chips render as plain list items, not links to a tag page", async () => {
    const posts = [createMockBlogPostSummary({ tags: ["public-goods"] })];
    getPublishedPostsMock.mockResolvedValue(posts);

    const { default: BlogIndexPage } = await import("@/app/blog/page");
    const result = await BlogIndexPage();
    render(result);

    // The whole card is one link to the post itself; the chip must not be
    // (or contain) a *second*, tag-specific anchor.
    const chip = screen.getByText("public-goods");
    expect(chip.tagName).toBe("LI");
    expect(chip.querySelector("a")).toBeNull();
  });

  it("renders a designed empty state when there are no posts", async () => {
    getPublishedPostsMock.mockResolvedValue([]);

    const { default: BlogIndexPage } = await import("@/app/blog/page");
    const result = await BlogIndexPage();
    render(result);

    expect(screen.getByText("No posts yet")).toBeInTheDocument();
  });

  it("renders CollectionPage and Breadcrumb JSON-LD", async () => {
    getPublishedPostsMock.mockResolvedValue([]);

    const { default: BlogIndexPage } = await import("@/app/blog/page");
    const result = await BlogIndexPage();
    const { container } = render(result);

    const scripts = getJsonLdScripts(container);
    const types = scripts.map((s) => JSON.parse(s.innerHTML)["@type"]);
    expect(types).toContain("CollectionPage");
    expect(types).toContain("BreadcrumbList");
  });
});
