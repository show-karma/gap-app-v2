import { defineArrayMember, defineField, defineType } from "sanity";

/**
 * A blog post. `slug` becomes read-only once `publishedAt` is set — the
 * canonical URL (`/blog/<slug>`) must not silently change under readers,
 * search engines, or the sitemap after a post has gone live.
 */
export const post = defineType({
  name: "post",
  title: "Post",
  type: "document",
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      group: "content",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      group: "content",
      options: { source: "title", maxLength: 96 },
      description: "Locked once the post has a Published date — the URL must stay stable.",
      readOnly: ({ document }) => !!document?.publishedAt,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "excerpt",
      title: "Excerpt",
      type: "text",
      rows: 3,
      group: "content",
      description: "Used for the /blog index card and as the fallback meta description.",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "coverImage",
      title: "Cover image",
      type: "image",
      group: "content",
      description:
        "Optional. Shown on the /blog index card and at the top of the post. A post without a cover renders fine — the index shows a neutral placeholder.",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Alt text",
          description:
            "Describe the image for screen readers and search engines. Required only when a cover image is set.",
          type: "string",
          // Alt is required *only when an image is actually uploaded* — you're
          // never forced to add a cover, but an image without alt text is an
          // accessibility/SEO miss, so we ask for it when (and only when) there is one.
          validation: (Rule) =>
            Rule.custom((alt, context) => {
              const parent = context.parent as { asset?: unknown } | undefined;
              if (parent?.asset && !alt) {
                return "Add alt text when a cover image is set (accessibility & SEO).";
              }
              return true;
            }),
        }),
        defineField({
          name: "caption",
          title: "Caption",
          type: "string",
        }),
      ],
      // Intentionally not required: a post can ship without a cover. The
      // renderers guard on `coverImage.asset`, so a missing/alt-only cover
      // degrades to a placeholder (index) or is omitted (post page) — never a crash.
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "array",
      group: "content",
      // A post must have body content — an empty body is thin content that
      // undermines the whole point of hosting the post on-site.
      validation: (Rule) => Rule.required().min(1),
      of: [
        defineArrayMember({
          type: "block",
          // No H1: the post page renders the title as the page's single <h1>
          // (see app/blog/[slug]/page.tsx). Body headings start at H2 so the
          // document outline stays valid and accessible.
          styles: [
            { title: "Normal", value: "normal" },
            { title: "H2", value: "h2" },
            { title: "H3", value: "h3" },
            { title: "H4", value: "h4" },
            { title: "Quote", value: "blockquote" },
          ],
          lists: [
            { title: "Bullet", value: "bullet" },
            { title: "Numbered", value: "number" },
          ],
          marks: {
            decorators: [
              { title: "Bold", value: "strong" },
              { title: "Italic", value: "em" },
              { title: "Code", value: "code" },
            ],
            annotations: [
              defineField({
                name: "link",
                title: "Link",
                type: "object",
                fields: [
                  defineField({
                    name: "href",
                    title: "URL",
                    type: "url",
                    validation: (Rule) =>
                      Rule.required().uri({ scheme: ["http", "https", "mailto"] }),
                  }),
                ],
              }),
            ],
          },
        }),
        defineArrayMember({ type: "blockImage" }),
        defineArrayMember({ type: "tweet" }),
      ],
    }),
    defineField({
      name: "author",
      title: "Author",
      type: "reference",
      group: "content",
      to: [{ type: "author" }],
    }),
    defineField({
      name: "tags",
      title: "Tags",
      type: "array",
      group: "content",
      of: [defineArrayMember({ type: "string" })],
      options: { layout: "tags" },
    }),
    defineField({
      name: "publishedAt",
      title: "Published at",
      type: "datetime",
      group: "content",
      description:
        'Controls when the post goes live: a post is only listed on /blog and in the sitemap once this date is set and in the past. Publishing the document is not enough on its own — set the date (use "now") before publishing. NOTE: do not add an initialValue here — the slug locks as soon as publishedAt is set (see slug.readOnly), so auto-filling this on a new doc would lock the slug before the editor can set it.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "seo",
      title: "SEO overrides",
      type: "object",
      group: "seo",
      options: { collapsible: true, collapsed: true },
      fields: [
        defineField({
          name: "metaTitle",
          title: "Meta title override",
          type: "string",
          description: "Falls back to Title when empty.",
        }),
        defineField({
          name: "ogImage",
          title: "Social share image override",
          type: "image",
          description: "Falls back to Cover image when empty.",
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "publishedAt",
      media: "coverImage",
    },
  },
});
