"use client";

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DOTS, usePagination } from "@/hooks/usePagination";
import { FUNDING_MAP_PAGE_SIZE } from "../constants/filter-options";
import { useFundingFilters } from "../hooks/use-funding-filters";

interface FundingMapPaginationProps {
  totalCount: number;
}

export function FundingMapPagination({ totalCount }: FundingMapPaginationProps) {
  const { filters, setPage, setOnlyOnKarma } = useFundingFilters();
  const currentPage = filters.page;
  const totalPages = Math.ceil(totalCount / FUNDING_MAP_PAGE_SIZE);

  const paginationRange = usePagination({
    currentPage,
    totalPosts: totalCount,
    postsPerPage: FUNDING_MAP_PAGE_SIZE,
  });

  const startResult = (currentPage - 1) * FUNDING_MAP_PAGE_SIZE + 1;
  const endResult = Math.min(currentPage * FUNDING_MAP_PAGE_SIZE, totalCount);

  if (totalPages <= 1) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-2 py-12">
        <ResultInfo
          onlyOnKarma={filters.onlyOnKarma}
          onShowAll={() => setOnlyOnKarma(false)}
          resultText={`Showing ${totalCount} result${totalCount !== 1 ? "s" : ""}`}
        />
      </div>
    );
  }

  return (
    <div className="flex w-full items-center justify-between py-12 max-md:flex-col-reverse max-md:gap-4">
      <div className="flex flex-col gap-1 max-md:items-center">
        <ResultInfo
          onlyOnKarma={filters.onlyOnKarma}
          onShowAll={() => setOnlyOnKarma(false)}
          resultText={`Showing ${startResult}-${endResult} of ${totalCount} results`}
        />
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2"
          disabled={currentPage === 1}
          onClick={() => setPage(currentPage - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="max-sm:hidden">Previous</span>
        </Button>

        {paginationRange?.map((page, index) => {
          if (page === DOTS) {
            return (
              <Button
                key={`dots-${index}`}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            );
          }
          const pageNumber = page as number;
          return (
            <PaginationButton
              key={pageNumber}
              page={pageNumber}
              isActive={currentPage === pageNumber}
              onClick={() => setPage(pageNumber)}
            />
          );
        })}

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2"
          disabled={currentPage === totalPages}
          onClick={() => setPage(currentPage + 1)}
        >
          <span className="max-sm:hidden">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function PaginationButton({
  page,
  isActive,
  onClick,
}: {
  page: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant={isActive ? "outline" : "ghost"}
      size="sm"
      className="h-8 w-8 p-0"
      onClick={onClick}
    >
      {page}
    </Button>
  );
}

function ResultInfo({
  onlyOnKarma,
  onShowAll,
  resultText,
}: {
  onlyOnKarma: boolean;
  onShowAll: () => void;
  resultText: string;
}) {
  if (onlyOnKarma) {
    return (
      <button
        type="button"
        className="text-sm font-medium text-primary hover:underline"
        onClick={onShowAll}
      >
        Show all programs
      </button>
    );
  }

  return <p className="text-sm font-medium text-muted-foreground">{resultText}</p>;
}
