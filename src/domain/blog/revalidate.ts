import { PAGES } from "@/utilities/pages";

/**
 * Pure mapper from a Sanity webhook payload to the Next.js paths that need
 * `revalidatePath()`. Kept dependency-free (no Sanity client, no Next
 * request/response) so it is trivial to unit test with plain objects, and
 * so `app/api/blog/revalidate/route.ts` stays a thin wrapper: verify the
 * signature, call this mapper, revalidate what it returns.
 *
 * The `/blog` index and the sitemap are always included for a `post`
 * document — a title/excerpt/publishedAt/unpublish change on any post
 * changes what the index and sitemap render, not just the post's own page.
 * `revalidate = 60` on the affected routes is the self-healing fallback if
 * this webhook is ever missed or misconfigured.
 */

/** Shape of the Sanity webhook payload this app cares about. Every field is
 * optional — the webhook payload varies by document type and by which
 * projection the Sanity webhook GROQ filter selects. */
export interface SanityRevalidatePayload {
  _type?: string;
  slug?: { current?: string | null } | string | null;
}

const SITEMAP_PATH = "/sitemaps/static/sitemap.xml";

function extractSlug(payload: SanityRevalidatePayload): string | null {
  const { slug } = payload;
  if (typeof slug === "string") return slug || null;
  if (slug && typeof slug === "object") return slug.current || null;
  return null;
}

/**
 * Maps a webhook payload to the list of paths to revalidate. Returns `[]`
 * for anything that isn't a `post` document (e.g. an `author` edit) — those
 * changes are covered by the 60s ISR ceiling instead of an immediate
 * revalidation, since this mapper has no way to know which posts reference
 * the changed author.
 */
export function mapPayloadToPaths(payload: SanityRevalidatePayload | null | undefined): string[] {
  if (!payload || payload._type !== "post") return [];

  const slug = extractSlug(payload);
  const paths = [PAGES.BLOG, SITEMAP_PATH];
  if (slug) paths.splice(1, 0, PAGES.BLOG_POST(slug));

  return paths;
}
