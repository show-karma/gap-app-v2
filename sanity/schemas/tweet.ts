import { defineField, defineType } from "sanity";

/**
 * A tweet embed, usable as a Portable Text body block. `tweetId` is the
 * numeric status id from the tweet URL (e.g. the trailing segment of
 * `https://x.com/user/status/<id>`). Rendered by
 * `src/components/blog/TweetEmbed.tsx`, which falls back to a plain link
 * when the tweet has since been deleted.
 */
export const tweet = defineType({
  name: "tweet",
  title: "Tweet",
  type: "object",
  fields: [
    defineField({
      name: "tweetId",
      title: "Tweet ID",
      description: "The numeric status id, e.g. 1234567890123456789",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: { tweetId: "tweetId" },
    prepare({ tweetId }) {
      return { title: "Tweet", subtitle: tweetId };
    },
  },
});
