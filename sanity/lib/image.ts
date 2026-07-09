import { createImageUrlBuilder, type SanityImageSource } from "@sanity/image-url";

import { dataset, projectId } from "@/sanity/env";

const imageBuilder = createImageUrlBuilder({ projectId, dataset });

/**
 * Builds a Sanity image URL builder instance for the given image source.
 * Safe to call with an empty `projectId` — it will simply produce an
 * unusable URL, which callers should guard against by checking the
 * source is present before rendering (the content gateway never returns
 * a cover image reference when Sanity is unconfigured).
 */
export function urlForImage(source: SanityImageSource) {
  return imageBuilder.image(source);
}
