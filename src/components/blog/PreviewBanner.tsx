import { PAGES } from "@/utilities/pages";

/**
 * Visible banner rendered on `/blog/[slug]` whenever Next.js draft mode is
 * active (`app/blog/[slug]/page.tsx` checks `(await draftMode()).isEnabled`)
 * — so an editor previewing an unpublished draft always knows they aren't
 * looking at the live, published page. No client interactivity beyond a
 * plain link (full navigation, not `next/link`, so the exit route's
 * `Set-Cookie`/redirect round-trip behaves like a normal page load), so
 * this stays a server component.
 */
export function PreviewBanner({ slug }: { readonly slug: string }) {
  return (
    <output className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900 dark:border-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
      <span>Preview mode — showing unpublished draft content.</span>
      <a
        href={`${PAGES.BLOG_PREVIEW_EXIT}?slug=${encodeURIComponent(slug)}`}
        className="rounded-md border border-amber-300 bg-white px-3 py-1 font-semibold text-amber-900 transition-colors hover:bg-amber-50 dark:border-amber-700 dark:bg-transparent dark:text-amber-200 dark:hover:bg-amber-900/60"
      >
        Exit preview
      </a>
    </output>
  );
}
