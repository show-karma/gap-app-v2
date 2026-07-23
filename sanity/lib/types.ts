import type { PortableTextBlock } from "@portabletext/types";

/**
 * Blog domain types returned by the content gateway (`sanity/lib/gateway.ts`).
 * These mirror the `post`/`author` schemas in `sanity/schemas/` but are kept
 * as plain hand-written types (not schema-derived) so the gateway's public
 * contract stays stable even if the Studio schema definitions are refactored.
 */

/** A Sanity image reference, shaped to satisfy `@sanity/image-url`'s `SanityImageSource`. */
export interface SanityImageRef {
  _type: "image";
  // Optional on purpose: an editor can save an image field with only alt text
  // and no uploaded asset, so Sanity returns `{ _type: "image", alt }` with no
  // `asset`. Callers must guard on `asset` before building an image URL.
  asset?: { _ref: string; _type: "reference" };
}

/** A cover/body image with the required alt text and optional caption. */
export interface CoverImage extends SanityImageRef {
  alt: string;
  caption?: string;
}

/** An inline image block inside a post's Portable Text `body`. */
export interface BlogImageBlock extends Omit<CoverImage, "_type"> {
  _type: "blockImage";
  _key: string;
}

/** A tweet embed block inside a post's Portable Text `body`. */
export interface BlogTweetBlock {
  _type: "tweet";
  _key: string;
  tweetId: string;
}

/** Union of every block type `PostBody` (M2) knows how to render. */
export type BlogBodyBlock = PortableTextBlock | BlogImageBlock | BlogTweetBlock;

export interface BlogAuthor {
  name: string;
  slug: string;
}

/** Per-post SEO overrides — fall back to `title`/`coverImage` when absent. */
export interface SeoOverride {
  metaTitle?: string;
  ogImage?: CoverImage;
}

/** Summary shape used by the `/blog` index — one card per post. */
export interface BlogPostSummary {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  tags: string[];
  coverImage: CoverImage | null;
}

/** Full post shape used by `/blog/[slug]`. */
export interface BlogPost extends BlogPostSummary {
  // Optional: `body` is not a required field, so a published post can have no
  // body at all. Renderers must treat it as possibly-undefined.
  body?: BlogBodyBlock[];
  author: BlogAuthor | null;
  seo?: SeoOverride;
  // Sanity's document-level last-modified timestamp (`_updatedAt`), surfaced so
  // JSON-LD `dateModified` reflects real edits instead of duplicating
  // `publishedAt`. Optional to keep the gateway contract resilient to older
  // cached shapes; callers fall back to `publishedAt`.
  updatedAt?: string;
}

/** Slug + lastmod pair used by the sitemap (M6). */
export interface BlogPostSlugEntry {
  slug: string;
  publishedAt: string;
}
