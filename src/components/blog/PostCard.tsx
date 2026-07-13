import { ImageOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { memo } from "react";
import { urlForImage } from "@/sanity/lib/image";
import type { BlogPostSummary } from "@/sanity/lib/types";
import { formatDate } from "@/utilities/formatDate";
import { PAGES } from "@/utilities/pages";

const COVER_WIDTH = 640;
const COVER_HEIGHT = 360;

interface PostCardProps {
  post: BlogPostSummary;
}

/**
 * One card in the `/blog` index grid. Server component (no interactivity
 * beyond a plain `<Link>`) — memoized per the list-item convention even
 * though the benefit is mostly documentation here, since the grid is
 * server-rendered once per request rather than re-rendered client-side.
 */
function PostCardComponent({ post }: PostCardProps) {
  // Guard on `.asset`, not just the object: a required cover can still be an
  // alt-only image with no uploaded asset, and urlForImage(...).url() throws
  // on a missing asset ref — which would crash the whole index grid.
  const coverSrc = post.coverImage?.asset
    ? urlForImage(post.coverImage)
        .width(COVER_WIDTH)
        .height(COVER_HEIGHT)
        .withOptions({ fit: "crop", auto: "format" })
        .url()
    : null;

  return (
    <Link
      href={PAGES.BLOG_POST(post.slug)}
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-gray-100 dark:bg-zinc-800">
        {coverSrc ? (
          <Image
            src={coverSrc}
            alt={post.coverImage?.alt ?? ""}
            width={COVER_WIDTH}
            height={COVER_HEIGHT}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageOff className="h-8 w-8 text-gray-300 dark:text-zinc-700" aria-hidden />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {formatDate(post.publishedAt)}
        </p>
        <h2 className="text-lg font-semibold leading-snug text-zinc-900 group-hover:underline dark:text-zinc-100">
          {post.title}
        </h2>
        <p className="line-clamp-3 flex-1 text-sm text-gray-600 dark:text-gray-400">
          {post.excerpt}
        </p>
        {post.tags.length > 0 ? (
          <ul className="flex flex-wrap gap-2 pt-1">
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
      </div>
    </Link>
  );
}

export const PostCard = memo(PostCardComponent);
