import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedPostBySlug, getPublishedSlugs } from "@/sanity/lib/gateway";
import { BlogPostArticle, resolveOgImage } from "@/src/components/blog/BlogPostArticle";
import { customMetadata } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";

// This route is sitemap-crawlable, so it must prerender: DEV-612 forbids a
// Suspense boundary above its content, which leaves `"use cache"` as the only
// tool. `draftMode()` is what used to make that impossible — it is a request
// read by definition, and no amount of caching survives one.
//
// So preview moved out. This page serves exactly one thing, the published post,
// and never asks who is asking. Editors preview at `/blog/preview/[slug]`,
// which reads draft mode and is `instant = false` because a preview is
// inherently per-request. The two routes render the same article component, so
// what an editor approves is what readers get.
//
// `export const revalidate = 60` lived here; the equivalent now sits on
// `getPublishedPostBySlug()` as `cacheLife("minutes")` (revalidate 60) with a
// per-slug `cacheTag` the M4 webhook invalidates.

const PRERENDERED_POST_SAMPLE = 3;

interface PageProps {
  readonly params: Promise<{ slug: string }>;
}

/**
 * A small sample of real posts, prerendered at build.
 *
 * Not the whole archive on purpose: the point is to prove the route prerenders
 * and keep the newest posts warm, not to bake every post into every deploy.
 * Any other slug renders on its first request and is then persisted.
 *
 * `getPublishedSlugs()` already backs the sitemap, so these are real slugs; it
 * returns an empty list when Sanity is unconfigured, which yields a build with
 * no prerendered posts rather than a failed one.
 */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const slugs = await getPublishedSlugs();

  return slugs.slice(0, PRERENDERED_POST_SAMPLE).map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);

  if (!post) {
    return customMetadata({
      title: "Post not found | Blog",
      description: "This blog post could not be found.",
      path: PAGES.BLOG_POST(slug),
      robots: { index: false, follow: true },
    });
  }

  const ogImage = resolveOgImage(post);

  return customMetadata({
    title: post.seo?.metaTitle || post.title,
    description: post.excerpt,
    path: PAGES.BLOG_POST(slug),
    ogType: "article",
    images: ogImage ? [ogImage] : undefined,
  });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);

  if (!post) notFound();

  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <BlogPostArticle post={post} />
    </main>
  );
}
