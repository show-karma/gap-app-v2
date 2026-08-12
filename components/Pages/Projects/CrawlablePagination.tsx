import {
  buildProjectsPageHref,
  type ProjectsExplorerState,
} from "@/utilities/projects-explorer-request";

interface CrawlableProjectsPaginationProps {
  /** Effective request state used to build the preserved-filter hrefs. */
  hrefState: ProjectsExplorerState;
  /** The current SSR page the crawlable links are relative to. */
  effectivePage: number;
  hasPrev: boolean;
  hasNext: boolean;
}

const LINK_CLASS =
  "px-4 py-2 rounded-md border border-gray-300 dark:border-zinc-700 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors";

/**
 * Crawlable pagination — plain native `<a>` anchors that bots and users can
 * follow with a full SSR navigation. Once hydrated, a Next.js `<Link>`
 * client-intercepts the click to do a soft navigation, and in the observed QA
 * that interception swallowed it (the URL and cards stayed on the current page).
 * A native anchor guarantees a real full navigation regardless of hydration
 * state, so we deliberately use ordinary anchors here. Rendered only in SSR
 * mode; the Load More button in ProjectsExplorer remains the client-side
 * progressive-enhancement path for humans.
 */
export const CrawlableProjectsPagination = ({
  hrefState,
  effectivePage,
  hasPrev,
  hasNext,
}: CrawlableProjectsPaginationProps) => {
  if (!hasPrev && !hasNext) {
    return null;
  }

  return (
    <nav aria-label="Pagination" className="flex justify-center items-center gap-4 py-8">
      {hasPrev && (
        <a
          href={buildProjectsPageHref(hrefState, effectivePage - 1)}
          rel="prev"
          className={LINK_CLASS}
        >
          Previous
        </a>
      )}
      {hasNext && (
        <a
          href={buildProjectsPageHref(hrefState, effectivePage + 1)}
          rel="next"
          className={LINK_CLASS}
        >
          Next
        </a>
      )}
    </nav>
  );
};
