import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, expect, it } from "vitest";
import { PostCard } from "@/src/components/blog/PostCard";
import { createMockBlogPostSummary } from "../../factories/blogPost.factory";

/**
 * Regression: a published post can have a cover with alt text but no uploaded
 * asset (`{ _type: "image", alt }`), which made `urlForImage(...).url()` throw
 * during render and take down the entire /blog index via the error boundary.
 * The card must degrade to a placeholder instead of throwing.
 */
describe("PostCard cover image", () => {
  it("renders a placeholder (no image, no throw) when the cover has no asset", () => {
    const post = createMockBlogPostSummary();
    post.coverImage = { _type: "image", alt: "alt without an uploaded image" };

    expect(() => render(<PostCard post={post} />)).not.toThrow();
    // Content still renders; only the image degrades.
    expect(screen.getByText(post.title)).toBeInTheDocument();
    expect(screen.getByText(post.excerpt)).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("renders the cover image when an asset is present", () => {
    const post = createMockBlogPostSummary();

    render(<PostCard post={post} />);

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("alt", post.coverImage?.alt ?? "");
  });
});
