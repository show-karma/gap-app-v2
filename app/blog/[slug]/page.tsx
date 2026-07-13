import type { Metadata } from "next";
import { draftMode } from "next/headers";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ArticleJsonLd } from "@/components/Seo/ArticleJsonLd";
import { BreadcrumbJsonLd } from "@/components/Seo/BreadcrumbJsonLd";
import { getPostBySlug } from "@/sanity/lib/gateway";
import { urlForImage } from "@/sanity/lib/image";
import type { BlogPost, CoverImage } from "@/sanity/lib/types";
import { PostBody } from "@/src/components/blog/PostBody";
import { PreviewBanner } from "@/src/components/blog/PreviewBanner";
import { formatDate } from "@/utilities/formatDate";
import { customMetadata } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";

// Self-healing ISR: paired with the revalidation webhook (M4), which
// invalidates this exact path on publish/unpublish/edit.
export const revalidate = 60;

const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;
const COVER_WIDTH = 1200;
const COVER_HEIGHT = 630;

interface PageProps {
  readonly params: Promise<{ slug: string }>;
}

function resolveOgImage(
  post: BlogPost
): { url: string; width: number; height: number; alt: string } | undefined {
  const image: CoverImage | null | undefined = post.seo?.ogImage ?? post.coverImage;
  if (!image?.asset) return undefined;
  return {
    url: urlForImage(image)
      .width(OG_IMAGE_WIDTH)
      .height(OG_IMAGE_HEIGHT)
      .withOptions({ fit: "crop", auto: "format" })
      .url(),
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    alt: image.alt || post.title,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { isEnabled: isPreview } = await draftMode();
  const post = await getPostBySlug(slug, { draft: isPreview });

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
    // Draft previews must never be indexed, even though the same route
    // (with `revalidate = 60`) normally serves the indexable published copy.
    robots: isPreview ? { index: false, follow: true } : undefined,
  });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const { isEnabled: isPreview } = await draftMode();
  const post = await getPostBySlug(slug, { draft: isPreview });

  if (!post) notFound();

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
    <main className="container mx-auto max-w-3xl px-4 py-12">
      {isPreview ? <PreviewBanner slug={post.slug} /> : null}
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
        dateModified={post.publishedAt}
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
    </main>
  );
}
