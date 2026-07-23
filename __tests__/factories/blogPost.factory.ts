import type { BlogPost, BlogPostSlugEntry, BlogPostSummary, CoverImage } from "@/sanity/lib/types";
import { applyOverrides, type DeepPartial, seq } from "./utils";

// ─── Blog post factories ───

export function createMockCoverImage(overrides?: DeepPartial<CoverImage>): CoverImage {
  const n = seq();
  const defaults: CoverImage = {
    _type: "image",
    asset: { _ref: `image-mockAsset${n}-1200x630-png`, _type: "reference" },
    alt: `Cover image for post ${n}`,
  };
  return applyOverrides(defaults, overrides);
}

export function createMockBlogPostSummary(
  overrides?: DeepPartial<BlogPostSummary>
): BlogPostSummary {
  const n = seq();
  const defaults: BlogPostSummary = {
    slug: `blog-post-${n}`,
    title: `Blog Post ${n}`,
    excerpt: "A short excerpt describing what this post covers and why it matters.",
    publishedAt: "2024-06-01T09:00:00Z",
    tags: ["grants", "public-goods"],
    coverImage: createMockCoverImage(),
  };
  return applyOverrides(defaults, overrides);
}

export function createMockBlogPost(overrides?: DeepPartial<BlogPost>): BlogPost {
  const summary = createMockBlogPostSummary(overrides as DeepPartial<BlogPostSummary>);
  const defaults: BlogPost = {
    ...summary,
    body: [
      {
        _type: "block",
        _key: "block1",
        style: "normal",
        children: [{ _type: "span", _key: "span1", text: "This is the post body.", marks: [] }],
        markDefs: [],
      },
    ],
    author: { name: "Karma", slug: "karma" },
  };
  return applyOverrides(defaults, overrides);
}

export function createMockBlogPostSlugEntry(
  overrides?: DeepPartial<BlogPostSlugEntry>
): BlogPostSlugEntry {
  const n = seq();
  const defaults: BlogPostSlugEntry = {
    slug: `blog-post-${n}`,
    publishedAt: "2024-06-01T09:00:00Z",
  };
  return applyOverrides(defaults, overrides);
}
