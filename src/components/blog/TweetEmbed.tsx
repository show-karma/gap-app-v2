"use client";

import dynamic from "next/dynamic";
import type { TwitterComponents } from "react-tweet";
import "react-tweet/theme.css";

/**
 * Renders an embedded tweet for the `tweet` Portable Text body block
 * (`sanity/schemas/tweet.ts`). `react-tweet` fetches the tweet client-side
 * and renders Twitter's own markup — a heavy, client-only dependency, so it
 * is lazy-loaded via `next/dynamic` (`ssr: false`) rather than imported at
 * module top-level, and never touches the server render.
 *
 * Falls back to a plain link to the tweet on X whenever there's nothing to
 * embed: the id is missing (authoring mistake) or the tweet fetch errors
 * (deleted/protected tweet, rate limit) — `react-tweet`'s own
 * `TweetNotFound` component is swapped out for this fallback.
 *
 * Theming: `react-tweet/theme.css` keys its dark palette off an ancestor
 * `.dark` class, which matches how `next-themes` is configured
 * (`attribute="class"` in `app/layout.tsx`) — no extra wiring needed.
 */

const LazyTweet = dynamic(() => import("react-tweet").then((mod) => mod.Tweet), {
  ssr: false,
  loading: () => <TweetSkeleton />,
});

function TweetSkeleton() {
  return (
    <output
      aria-label="Loading tweet"
      className="block h-48 w-full max-w-[550px] animate-pulse rounded-xl bg-gray-100 dark:bg-zinc-800"
    />
  );
}

function tweetStatusUrl(tweetId: string) {
  return `https://x.com/i/status/${tweetId}`;
}

function TweetFallbackLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-blue-600 hover:underline dark:border-zinc-700 dark:text-blue-400"
    >
      View post on X
    </a>
  );
}

interface TweetEmbedProps {
  tweetId?: string;
}

export function TweetEmbed({ tweetId }: TweetEmbedProps) {
  if (!tweetId) {
    return <TweetFallbackLink href="https://x.com" />;
  }

  const components: TwitterComponents = {
    TweetNotFound: () => <TweetFallbackLink href={tweetStatusUrl(tweetId)} />,
  };

  return <LazyTweet id={tweetId} components={components} />;
}
