"use client";

import type { InfiniteData } from "@tanstack/react-query";
import InfiniteScroll from "react-infinite-scroll-component";
import { Skeleton } from "@/components/Utilities/Skeleton";
import type { ProgramFinancialsResponse } from "@/types/financials";
import { ProjectFinancialRow } from "./ProjectFinancialRow";

interface ProjectFinancialsListProps {
  data: InfiniteData<ProgramFinancialsResponse> | undefined;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
}

function LoadingSkeleton() {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      data-testid="financials-loading"
    >
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="flex flex-col gap-3 p-4 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex gap-6">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
          <div className="flex flex-col gap-1">
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyProjectsList() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 p-8 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900"
      data-testid="financials-no-projects"
    >
      <p className="text-lg font-semibold text-gray-900 dark:text-white">No projects found</p>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        There are no funded projects in this program yet.
      </p>
    </div>
  );
}

export function ProjectFinancialsList({
  data,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
}: ProjectFinancialsListProps) {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const projects = data?.pages.flatMap((page) => page.projects) ?? [];

  if (projects.length === 0) {
    return <EmptyProjectsList />;
  }

  return (
    <div className="flex flex-col gap-4" data-testid="financials-projects-list">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Projects ({data?.pages[0]?.pagination.totalCount ?? 0})
        </h2>
      </div>

      <InfiniteScroll
        dataLength={projects.length}
        next={fetchNextPage}
        hasMore={hasNextPage}
        loader={
          <div className="flex justify-center py-4">
            <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        }
        style={{ overflow: "visible" }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectFinancialRow key={project.grantUID} project={project} />
          ))}
        </div>
      </InfiniteScroll>

      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      )}
    </div>
  );
}
