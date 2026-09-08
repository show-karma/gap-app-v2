import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getPostBySlug } from "@/sanity/lib/gateway";
import { BlogPostArticle } from "@/src/components/blog/BlogPostArticle";
import { PreviewBanner } from "@/src/components/blog/PreviewBanner";
import { customMetadata } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";

// The editor-only twin of `/blog/[slug]`.
//
// Draft mode is request state — `draftMode()` reads a cookie — so this route
// can never prerender, and that is correct rather than a limitation: a preview
// of unpublished edits is per-request by definition. `instant = false` says so
// explicitly, which is what keeps the public post route free to be cached
// instead of being held dynamic by a preview concern it does not serve.
//
// Reached only from `/api/blog/preview`, which validates the Sanity preview
// secret before enabling draft mode. Landing here without draft mode enabled
// means someone guessed the URL: there is nothing to preview, so it redirects
// to the published post rather than rendering a second indexable copy of it.
export const instant = false;

interface PageProps {
  readonly params: Promise<{ slug: string }>;
}

// Never indexable. The published post at `/blog/[slug]` is the canonical
// document; this one may show content that was never published at all.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  return customMetadata({
    title: "Preview | Blog",
    description: "Preview of unpublished draft content.",
    path: PAGES.BLOG_POST(slug),
    robots: { index: false, follow: false },
  });
}

export default async function BlogPostPreviewPage({ params }: PageProps) {
  const { slug } = await params;
  const { isEnabled } = await draftMode();

  if (!isEnabled) redirect(PAGES.BLOG_POST(slug));

  const post = await getPostBySlug(slug, { draft: true });

  if (!post) notFound();

  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <PreviewBanner slug={post.slug} />
      <BlogPostArticle post={post} />
    </main>
  );
}
