import { defineField, defineType } from "sanity";

/**
 * A blog post author. Seeded with a single "Karma" house author for posts
 * that aren't attributed to a named individual — create that document in
 * the Studio (Content > Author > New), it is not seeded by code.
 */
export const author = defineType({
  name: "author",
  title: "Author",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "name", maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: { title: "name" },
  },
});
