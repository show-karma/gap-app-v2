import { PortableText, type PortableTextComponents } from "@portabletext/react";
import Image from "next/image";
import { urlForImage } from "@/sanity/lib/image";
import type { BlogBodyBlock } from "@/sanity/lib/types";
import { TweetEmbed } from "@/src/components/blog/TweetEmbed";

/**
 * Renders a post's Portable Text `body` (`sanity/schemas/post.ts`) to React.
 * A server component by default — the only client boundary it crosses is
 * `TweetEmbed`, which lazy-loads `react-tweet` itself. Keeping this file
 * server-rendered avoids shipping `@portabletext/react`'s serializer to the
 * client for what is, block-by-block, static prose.
 */

const BODY_IMAGE_WIDTH = 1200;

const portableTextComponents: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p className="mb-4 text-gray-700 dark:text-gray-300">{children}</p>,
    h1: ({ children }) => (
      <h1 className="mb-4 mt-8 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="mb-4 mt-8 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-3 mt-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="mb-3 mt-6 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {children}
      </h4>
    ),
    blockquote: ({ children }) => (
      <blockquote className="mb-4 border-l-4 border-gray-300 pl-4 italic text-gray-600 dark:border-zinc-700 dark:text-gray-400">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="mb-4 list-inside list-disc space-y-2 text-gray-700 dark:text-gray-300">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="mb-4 list-inside list-decimal space-y-2 text-gray-700 dark:text-gray-300">
        {children}
      </ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => <li>{children}</li>,
    number: ({ children }) => <li>{children}</li>,
  },
  marks: {
    link: ({ children, value }) => {
      const href = typeof value?.href === "string" ? value.href : "";
      const isSafeScheme = /^(https?:|mailto:)/i.test(href);
      if (!isSafeScheme) return <>{children}</>;
      const isExternal = /^https?:\/\//.test(href);
      return (
        <a
          href={href}
          className="text-blue-600 hover:underline dark:text-blue-400"
          {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {children}
        </a>
      );
    },
  },
  // Never surface Sanity's default "Unknown type/mark" warning boxes to
  // readers: if content ever contains a block/mark the renderer doesn't know
  // (e.g. schema/deploy skew), degrade silently instead of showing debug text.
  unknownType: () => null,
  unknownMark: ({ children }) => <>{children}</>,
  unknownBlockStyle: ({ children }) => (
    <p className="mb-4 text-gray-700 dark:text-gray-300">{children}</p>
  ),
  types: {
    blockImage: ({ value }) => {
      if (!value?.asset) return null;
      // `withOptions` (not the chained `.fit()`/`.auto()` methods) sidesteps a Biome
      // false positive that flags a bare `.fit(` call as a focused-test marker.
      const src = urlForImage(value)
        .width(BODY_IMAGE_WIDTH)
        .withOptions({ fit: "max", auto: "format" })
        .url();
      return (
        <figure className="my-6">
          <Image
            src={src}
            alt={value.alt ?? ""}
            width={BODY_IMAGE_WIDTH}
            height={Math.round((BODY_IMAGE_WIDTH * 9) / 16)}
            className="h-auto w-full rounded-lg"
          />
          {value.caption ? (
            <figcaption className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {value.caption}
            </figcaption>
          ) : null}
        </figure>
      );
    },
    tweet: ({ value }) => (
      <div className="my-6 flex justify-center">
        <TweetEmbed tweetId={typeof value?.tweetId === "string" ? value.tweetId : undefined} />
      </div>
    ),
  },
};

interface PostBodyProps {
  body?: BlogBodyBlock[];
}

export function PostBody({ body }: PostBodyProps) {
  return (
    <div className="blog-post-body">
      <PortableText value={body ?? []} components={portableTextComponents} />
    </div>
  );
}
