import Image from "next/image";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ArticleJsonLd } from "@/components/Seo/ArticleJsonLd";
import { BreadcrumbJsonLd } from "@/components/Seo/BreadcrumbJsonLd";
import { urlForImage } from "@/sanity/lib/image";
import type { BlogPost } from "@/sanity/lib/types";
import { resolveOgImage } from "@/src/components/blog/blog-og-image";
import { PostBody } from "@/src/components/blog/PostBody";
import { formatDate } from "@/utilities/formatDate";
import { PAGES } from "@/utilities/pages";

const COVER_WIDTH = 1200;
const COVER_HEIGHT = 630;

/**
 * The rendered article, shared by the public post route and the preview route.
 *
 * Both routes render byte-identical markup for the same post — that is the
 * point of extracting it. What differs is only how the post was fetched
 * (published vs draft) and whether a preview banner sits above it, which is the
 * caller's business, not this component's.
 *
 * Canonical links and JSON-LD always point at the public URL, never at the
 * preview one: a draft is not a separate document, and the preview route is
 * noindex.
 */
export function BlogPostArticle({ post }: { readonly post: BlogPost }) {
  // Guard on `.asset` (not just the object): an alt-only cover with no uploaded
  // asset would otherwise throw in urlForImage(...).url() and crash the page.
  const coverSrc = post.coverImage?.asset
    ? urlForImage(post.coverImage)
        .width(COVER_WIDTH)
        .height(COVER_HEIGHT)
        .withOptions({ fit: "crop", auto: "format" })
        .url()
    : null;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Home", href: PAGES.HOME },
          { label: "Blog", href: PAGES.BLOG },
          { label: post.title, href: PAGES.BLOG_POST(post.slug) },
        ]}
      />
      <ArticleJsonLd
        title={post.title}
        description={post.excerpt}
        url={PAGES.BLOG_POST(post.slug)}
        datePublished={post.publishedAt}
        dateModified={post.updatedAt ?? post.publishedAt}
        author={post.author?.name ?? "Karma"}
        image={resolveOgImage(post)?.url}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: PAGES.HOME },
          { name: "Blog", url: PAGES.BLOG },
          { name: post.title, url: PAGES.BLOG_POST(post.slug) },
        ]}
      />
      <article>
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{post.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
            <span>{post.author?.name ?? "Karma"}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          </div>
          {post.tags.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-zinc-800 dark:text-gray-300"
                >
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}
        </header>
        {coverSrc ? (
          <Image
            src={coverSrc}
            alt={post.coverImage?.alt ?? ""}
            width={COVER_WIDTH}
            height={COVER_HEIGHT}
            className="mb-8 h-auto w-full rounded-xl"
            priority
          />
        ) : null}
        <PostBody body={post.body} />
      </article>
    </>
  );
}
