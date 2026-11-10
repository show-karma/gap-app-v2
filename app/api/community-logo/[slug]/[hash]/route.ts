import {
  inlineImageHash,
  isInlineImageHash,
  isSafeCommunitySlug,
  parseInlineImage,
} from "@/utilities/community-logo.server";
import { getCommunityDetailsCached } from "@/utilities/queries/v2/getCommunityData.cached";

/**
 * Serves a community logo that the indexer stores inline as a `data:` URI.
 *
 * The cached project loaders link here instead of embedding the image, so it
 * no longer travels — and is no longer written to the ISR cache — once per
 * feed item (see `utilities/community-logo.server.ts`).
 *
 * The path carries the image's content hash. When it matches the community's
 * current logo the response is immutable and the CDN keeps it; when it does
 * not (the logo changed after the page was cached), the current logo is served
 * with a short lifetime so an older page still shows the community's picture.
 *
 * Only raster `data:` images are served. A community whose logo is a normal
 * URL, or anything that does not parse, is a 404: this is not a redirector.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; hash: string }> }
): Promise<Response> {
  const { slug, hash } = await params;
  if (!isSafeCommunitySlug(slug) || !isInlineImageHash(hash)) {
    return new Response(null, { status: 404 });
  }

  const community = await getCommunityDetailsCached(slug).catch(() => null);
  const dataUri = community?.details?.logoUrl ?? community?.details?.imageURL;
  const image = parseInlineImage(dataUri);
  if (!dataUri || !image) {
    return new Response(null, { status: 404 });
  }

  const current = inlineImageHash(dataUri) === hash;
  return new Response(image.bytes, {
    status: 200,
    headers: {
      "Content-Type": image.mimeType,
      "Content-Length": String(image.bytes.byteLength),
      "Cache-Control": current
        ? "public, max-age=31536000, s-maxage=31536000, immutable"
        : "public, max-age=300, s-maxage=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
