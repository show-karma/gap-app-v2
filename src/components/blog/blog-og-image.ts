import { urlForImage } from "@/sanity/lib/image";
import type { BlogPost, CoverImage } from "@/sanity/lib/types";

const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

/**
 * The OG/Twitter image for a post: the explicit SEO override if the editor set
 * one, otherwise the cover.
 *
 * Lives apart from `BlogPostArticle` because that file exports a component and
 * fast refresh only works when a module exports components alone.
 */
export function resolveOgImage(
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
