import { buildCommunityProjectsPageHref } from "@/utilities/queries/v2/communityProjectsRequest";

interface CrawlableCommunityPaginationProps {
  /** Route-constant base path for the hub (no query string of our own). */
  basePath: string;
  /** The server-rendered page the links are relative to. */
  currentPage: number;
  hasPrev: boolean;
  hasNext: boolean;
}

const LINK_CLASS =
  "px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors";

/**
 * Crawlable pagination — plain native `<a>` anchors so bots (and users without
 * JavaScript) can walk the full project list with real SSR navigations. A
 * Next.js `<Link>` client-intercepts the click into a soft navigation, and in
 * the observed QA on /projects that interception swallowed it, so ordinary
 * anchors are deliberate here. Infinite scroll remains the progressive
 * enhancement for humans with JavaScript.
 */
export const CrawlableCommunityPagination = ({
  basePath,
  currentPage,
  hasPrev,
  hasNext,
}: CrawlableCommunityPaginationProps) => {
  if (!hasPrev && !hasNext) {
    return null;
  }

  return (
    <nav aria-label="Pagination" className="flex justify-center items-center gap-4 py-8">
      {hasPrev && (
        <a
          href={buildCommunityProjectsPageHref(basePath, currentPage - 1)}
          rel="prev"
          className={LINK_CLASS}
        >
          Previous
        </a>
      )}
      {hasNext && (
        <a
          href={buildCommunityProjectsPageHref(basePath, currentPage + 1)}
          rel="next"
          className={LINK_CLASS}
        >
          Next
        </a>
      )}
    </nav>
  );
};
