import "server-only";

import * as Sentry from "@sentry/nextjs";

import { projectId } from "@/sanity/env";
import { client } from "@/sanity/lib/client";
import type { BlogPost, BlogPostSlugEntry, BlogPostSummary } from "@/sanity/lib/types";
import { getServerEnv } from "@/utilities/env";

/**
 * Content gateway — the ONLY module in the app that is allowed to know
 * about Sanity (GROQ, the client, draft/published perspective). Every
 * caller (routes, sitemap, revalidation) goes through the three functions
 * below and gets back plain domain types or `null`/`[]`, never a thrown
 * error and never a raw Sanity document.
 *
 * `import "server-only"` above makes this module a build-time error if it
 * is ever imported from a Client Component — draft reads use
 * `SANITY_VIEWER_TOKEN`, which must never reach the browser.
 */

const POST_SUMMARY_PROJECTION = `{
  "slug": slug.current,
  title,
  excerpt,
  publishedAt,
  "tags": coalesce(tags, []),
  "coverImage": coalesce(coverImage, null)
}`;

const POSTS_QUERY = `*[_type == "post" && defined(slug.current) && defined(publishedAt) && publishedAt <= now()] | order(publishedAt desc) ${POST_SUMMARY_PROJECTION}`;

const PUBLISHED_POST_BY_SLUG_QUERY = `*[_type == "post" && slug.current == $slug && defined(publishedAt) && publishedAt <= now()][0]${postDetailProjection()}`;

const DRAFT_POST_BY_SLUG_QUERY = `*[_type == "post" && slug.current == $slug] | order(_updatedAt desc)[0]${postDetailProjection()}`;

const SLUGS_QUERY = `*[_type == "post" && defined(slug.current) && defined(publishedAt) && publishedAt <= now()]{ "slug": slug.current, publishedAt }`;

function postDetailProjection() {
  return `{
    "slug": slug.current,
    title,
    excerpt,
    publishedAt,
    "tags": coalesce(tags, []),
    "coverImage": coalesce(coverImage, null),
    body,
    "author": author->{ name, "slug": slug.current },
    seo
  }`;
}

/**
 * Returns a client configured to read draft content with the server-only
 * viewer token. Only ever called on the server (this module is
 * `server-only`), and only when `draft: true` is explicitly requested by
 * the caller (draft mode route / preview).
 */
function getDraftClient() {
  const { SANITY_VIEWER_TOKEN } = getServerEnv();
  return client.withConfig({
    perspective: "drafts",
    token: SANITY_VIEWER_TOKEN || undefined,
    useCdn: false,
  });
}

/** Newest-first published post summaries for the `/blog` index. */
export async function getPublishedPosts(): Promise<BlogPostSummary[]> {
  if (!projectId) return [];
  try {
    const posts = await client.fetch<BlogPostSummary[]>(POSTS_QUERY);
    return posts ?? [];
  } catch (error) {
    Sentry.captureException(error, { tags: { module: "blog-gateway", op: "getPublishedPosts" } });
    return [];
  }
}

/**
 * A single post by slug. Returns `null` when not found (the caller should
 * call Next's `notFound()`), when Sanity is unconfigured, or on any CMS
 * error — this function never throws.
 */
export async function getPostBySlug(
  slug: string,
  opts?: { draft?: boolean }
): Promise<BlogPost | null> {
  if (!projectId || !slug) return null;
  try {
    const post = opts?.draft
      ? await getDraftClient().fetch<BlogPost | null>(DRAFT_POST_BY_SLUG_QUERY, { slug })
      : await client.fetch<BlogPost | null>(PUBLISHED_POST_BY_SLUG_QUERY, { slug });
    return post ?? null;
  } catch (error) {
    Sentry.captureException(error, {
      tags: { module: "blog-gateway", op: "getPostBySlug" },
      extra: { slug, draft: !!opts?.draft },
    });
    return null;
  }
}

/** Slug + `publishedAt` pairs for every published post, for the sitemap. */
export async function getPublishedSlugs(): Promise<BlogPostSlugEntry[]> {
  if (!projectId) return [];
  try {
    const slugs = await client.fetch<BlogPostSlugEntry[]>(SLUGS_QUERY);
    return slugs ?? [];
  } catch (error) {
    Sentry.captureException(error, { tags: { module: "blog-gateway", op: "getPublishedSlugs" } });
    return [];
  }
}
