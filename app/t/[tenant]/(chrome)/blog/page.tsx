import { Newspaper } from "lucide-react";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BreadcrumbJsonLd } from "@/components/Seo/BreadcrumbJsonLd";
import { CollectionPageJsonLd } from "@/components/Seo/CollectionPageJsonLd";
import { getPublishedPosts } from "@/sanity/lib/gateway";
import { PostCard } from "@/src/components/blog/PostCard";
import { customMetadata } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";

// TODO(P2-3 stage 2): `export const revalidate = 60` lived here — self-healing
// ISR, so a new post appeared within 60s even when the M4 revalidation webhook
// was missed or misconfigured. cacheComponents rejects the segment config, so
// that ceiling has to come back as `"use cache"` + `cacheLife` (60s) on
// `getPublishedPosts()` in `sanity/lib/gateway.ts`, with a `cacheTag` the
// webhook can invalidate. Until that lands this page is uncached and re-queries
// Sanity on every request: correct, but not cached.

const TITLE = "Blog";
const DESCRIPTION =
  "News, product updates, and essays on grant accountability, onchain reputation, and funding infrastructure from the Karma team.";

export const metadata: Metadata = customMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PAGES.BLOG,
  ogType: "website",
});

function BlogEmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 px-6 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-zinc-800">
        <Newspaper className="h-6 w-6 text-gray-400 dark:text-gray-500" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">No posts yet</h2>
      <p className="max-w-sm text-sm text-gray-600 dark:text-gray-400">
        We&apos;re working on our first posts. Check back soon for news and updates from the Karma
        team.
      </p>
    </div>
  );
}

export default async function BlogIndexPage() {
  const posts = await getPublishedPosts();

  return (
    <main className="container mx-auto max-w-5xl px-4 py-12">
      <Breadcrumbs
        items={[
          { label: "Home", href: PAGES.HOME },
          { label: "Blog", href: PAGES.BLOG },
        ]}
      />
      <CollectionPageJsonLd name={TITLE} description={DESCRIPTION} url={PAGES.BLOG} />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: PAGES.HOME },
          { name: "Blog", url: PAGES.BLOG },
        ]}
      />
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{TITLE}</h1>
        <p className="mt-2 max-w-2xl text-gray-600 dark:text-gray-400">{DESCRIPTION}</p>
      </header>
      {posts.length === 0 ? (
        <BlogEmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </main>
  );
}
