
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
/* eslint-disable react/jsx-key */
import type React from "react";
import { DOTS, usePagination } from "@/hooks/usePagination";

interface Props {
  currentPage: number;
  totalPosts: number;
  setCurrentPage:
  | React.Dispatch<React.SetStateAction<number>>
  | ((page: number) => void);
  postsPerPage: number;
}

export default function TablePagination({
  currentPage,
  setCurrentPage,
  totalPosts,
  postsPerPage,
}: Props) {
  const paginationRange = usePagination({
    currentPage,
    totalPosts,
    postsPerPage,
  });

  const lastPage = paginationRange && paginationRange[paginationRange.length - 1];

  function handlePageChange(page: number | string) {
    if (page === currentPage) {
      return `z-10 border-brand-blue relative inline-flex items-center px-4 py-2 border text-sm font-medium`;
    } else {
      return "bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800 relative inline-flex items-center px-4 py-2 border text-sm font-medium duration-200 ease-in-out";
    }
  }

  return (
    <>
      <div className="md:py-5 py-2 px-4 flex items-center justify-between border-t border-gray-200 dark:border-zinc-700">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => {
              setCurrentPage(currentPage - 1);
            }}
            disabled={currentPage === 1}
            className={`border-t-2 border-transparent inline-flex items-center text-sm font-medium text-gray-500 ${currentPage !== 1 && "hover:bg-brand-blue hover:text-white"
              } px-3 py-2 rounded-xl`}
          >
            <ArrowLeftIcon className="mr-3 h-5 w-5" aria-hidden="true" />
            Previous
          </button>
          <button
            className={`border-t-2 border-transparent inline-flex items-center text-sm font-medium text-gray-500 ${currentPage !== lastPage &&
              lastPage !== undefined &&
              "hover:bg-brand-blue hover:text-white"
              } px-3 py-2 rounded-xl`}
            onClick={() => {
              setCurrentPage(currentPage + 1);
            }}
            disabled={currentPage === lastPage || lastPage === undefined}
          >
            Next
            <ArrowRightIcon className="ml-3 h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          {totalPosts > 0 ? (
            <div>
              <p className="text-sm text-gray-700 dark:text-zinc-200">
                Showing &nbsp;
                <span className="font-medium">
                  {currentPage * postsPerPage - postsPerPage + 1}
                </span>
                &nbsp;-&nbsp;
                <span className="font-medium">
                  {currentPage * postsPerPage > totalPosts
                    ? totalPosts
                    : currentPage * postsPerPage}
                </span>
                &nbsp;of&nbsp;
                <span className="font-medium">{totalPosts}</span> results
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-700 dark:text-zinc-200">
              No results found
            </p>
          )}
          <div>
            <nav
              className="relative z-0 inline-flex rounded-md  -space-x-px"
              aria-label="Pagination"
            >
              <button
                onClick={() => {
                  setCurrentPage(currentPage - 1);
                }}
                disabled={currentPage === 1}
                className="relative inline-flex  disabled:opacity-40 items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-medium text-gray-500 dark:hover:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800 duration-200 ease-in-out"
              >
                <span className="sr-only">Previous</span>
                <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
              </button>
              {paginationRange?.map((page, index) => {
                if (page === DOTS) {
                  return (
                    <button
                      key={`${page}-${index}`}
                      className="bg-white  dark:bg-zinc-900 border-gray-300 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800 relative inline-flex items-center px-4 py-2 border text-sm font-medium duration-200 ease-in-out"
                    >
                      {DOTS}
                    </button>
                  );
                }
                return (
                  <button
                    type="button"
                    key={`${page}-${index}`}
                    className={handlePageChange(page)}
                    onClick={() => {
                      setCurrentPage(Number(page));
                    }}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => {
                  setCurrentPage(currentPage + 1);
                }}
                disabled={currentPage === lastPage || lastPage === undefined}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-medium text-gray-500 dark:hover:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800 duration-200 ease-in-out disabled:opacity-40"
              >
                <span className="sr-only">Next</span>
                <ArrowRightIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    </>
  );
}
