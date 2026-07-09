import { defineField, defineType } from "sanity";

/**
 * An inline image, usable as a Portable Text body block. Separate from
 * `post.coverImage` so the two can evolve independently even though both
 * currently require `alt` text for accessibility.
 */
export const blockImage = defineType({
  name: "blockImage",
  title: "Image",
  type: "image",
  options: { hotspot: true },
  fields: [
    defineField({
      name: "alt",
      title: "Alt text",
      description: "Required for accessibility and SEO.",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "caption",
      title: "Caption",
      type: "string",
    }),
  ],
});
