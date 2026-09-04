"use client";

import type { InfiniteData } from "@tanstack/react-query";
import { Suspense, useRef, useState } from "react";
import { PROJECTS_EXPLORER_CONSTANTS } from "@/constants/projects-explorer";
import { useProjectsExplorerInfinite } from "@/hooks/useProjectsExplorerInfinite";
import type { PaginatedProjectsResponse } from "@/types/v2/project";
import {
  type ProjectsExplorerState,
  parseProjectsExplorerRequest,
} from "@/utilities/projects-explorer-request";
import { CrawlableProjectsPagination } from "./CrawlablePagination";
import { ProjectsLoading } from "./Loading";
import { ProjectCard } from "./ProjectCard";
import { ProjectsExplorerControls } from "./ProjectsExplorerControls";

interface ProjectsExplorerProps {
  /** Server-rendered first page for the initial (matching) request. */
  initialData?: PaginatedProjectsResponse;
  /** Effective request the server rendered, used to gate the seed. */
  initialState?: ProjectsExplorerState;
}

export const ProjectsExplorer = ({ initialData, initialState }: ProjectsExplorerProps = {}) => {
  const sectionRef = useRef<HTMLElement>(null);

  // No URL read here: nuqs calls useSearchParams(), which aborts the prerender
  // of this crawlable route. The controls own the reads and publish the live
  // state back; until they do, the server's default state is what renders — and
  // that default is what a crawler should index.
  const [urlState, setUrlState] = useState<ProjectsExplorerState | null>(null);

  // The live filters, normalised by the controls with the same shared policy the
  // server used, so the seed decision matches exactly what it parsed.
  const normalizedState = urlState ?? initialState ?? parseProjectsExplorerRequest({});

  const matchesInitialState =
    initialState !== undefined &&
    normalizedState.q === initialState.q &&
    normalizedState.sortBy === initialState.sortBy &&
    normalizedState.sortOrder === initialState.sortOrder &&
    normalizedState.raisingFunds === initialState.raisingFunds;

  // When the live filters still match the server request, start from its page so
  // even a failed server fetch retries the same page client-side; otherwise
  // reset to page 1 so a stale seed cannot bleed into a different query.
  const effectivePage = matchesInitialState && initialState ? initialState.page : 1;
  const seededData: InfiniteData<PaginatedProjectsResponse, number> | undefined =
    matchesInitialState && initialData
      ? { pages: [initialData], pageParams: [effectivePage] }
      : undefined;

  // Infinite query
  const {
    projects,
    totalCount,
    isLoading,
    isFetching,
    isFetchingNextPage,
    isError,
    hasNextPage,
    fetchNextPage,
  } = useProjectsExplorerInfinite({
    // Feed the service normalized values so an invalid URL param can never reach
    // the indexer or diverge from the seed decision.
    search: normalizedState.q,
    sortBy: normalizedState.sortBy,
    sortOrder: normalizedState.sortOrder,
    hasPayoutAddress: normalizedState.raisingFunds,
    initialData: seededData,
    initialPage: effectivePage,
  });

  // Crawlable pagination: only meaningful in SSR mode (initialState present).
  // Derived from the effective page and the total pages so bots can follow
  // Previous/Next without JavaScript.
  const totalPages = Math.ceil(totalCount / PROJECTS_EXPLORER_CONSTANTS.RESULT_LIMIT);
  const hrefState: ProjectsExplorerState = { ...normalizedState, page: effectivePage };
  const showCrawlablePagination = initialState !== undefined && projects.length > 0;
  const hasCrawlablePrev = showCrawlablePagination && effectivePage > 1;
  const hasCrawlableNext = showCrawlablePagination && effectivePage < totalPages;

  return (
    <section
      ref={sectionRef}
      id="browse-projects"
      className="w-full max-w-7xl mx-auto px-4 py-8 mt-8"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-black dark:text-white">Projects on Karma</h2>
          {!isLoading && totalCount > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {totalCount.toLocaleString()} {totalCount === 1 ? "project" : "projects"} found
            </p>
          )}
        </div>

        {/* Controls read the URL; the grid below does not. nuqs calls
            useSearchParams(), which aborts the prerender of this crawlable
            route unconditionally, so the reads live behind a leaf and the
            grid renders from the server-provided default. */}
        <Suspense fallback={null}>
          <ProjectsExplorerControls onStateChange={setUrlState} />
        </Suspense>
      </div>

      {/* Grid */}
      {isLoading ? (
        <ProjectsLoading />
      ) : isError ? (
        <div className="text-center py-12 text-gray-500">
          Failed to load projects. Please try again.
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {normalizedState.q
            ? `No projects found for "${normalizedState.q}"`
            : normalizedState.raisingFunds
              ? "No projects are currently raising funds"
              : "No projects available"}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {projects.map((project, index) => (
              <ProjectCard key={project.uid} project={project} index={index} />
            ))}
          </div>

          <CrawlableProjectsPagination
            hrefState={hrefState}
            effectivePage={effectivePage}
            hasPrev={hasCrawlablePrev}
            hasNext={hasCrawlableNext}
          />

          {/* Load More Button */}
          {hasNextPage && (
            <div className="flex justify-center py-8">
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isFetchingNextPage ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Loading…
                  </>
                ) : (
                  "Load More Projects"
                )}
              </button>
            </div>
          )}

          {/* End of results */}
          {!hasNextPage && projects.length > 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              Showing all {totalCount.toLocaleString()} projects
            </div>
          )}
        </>
      )}

      {/* Fetching indicator (for refetches) */}
      {isFetching && !isLoading && !isFetchingNextPage && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2">
          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Updating…
        </div>
      )}
    </section>
  );
};
