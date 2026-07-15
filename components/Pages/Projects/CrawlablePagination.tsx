import Link from "next/link";
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
 * Crawlable pagination — ordinary Next.js `<Link>` anchors bots can follow
 * without JavaScript. Rendered only in SSR mode; the Load More button in
 * ProjectsExplorer remains the progressive-enhancement path for humans.
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
        <Link
          href={buildProjectsPageHref(hrefState, effectivePage - 1)}
          rel="prev"
          className={LINK_CLASS}
        >
          Previous
        </Link>
      )}
      {hasNext && (
        <Link
          href={buildProjectsPageHref(hrefState, effectivePage + 1)}
          rel="next"
          className={LINK_CLASS}
        >
          Next
        </Link>
      )}
    </nav>
  );
};
