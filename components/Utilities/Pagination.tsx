/* eslint-disable react/jsx-key */

import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/outline"
import type React from "react"
import { DOTS, usePagination } from "@/hooks/usePagination"

interface Props {
  currentPage: number
  totalPosts: number
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>
  postsPerPage: number
}

export default function Pagination({
  currentPage,
  setCurrentPage,
  totalPosts,
  postsPerPage,
}: Props) {
  const paginationRange = usePagination({
    currentPage,
    totalPosts,
    postsPerPage,
  })

  const lastPage = paginationRange?.[paginationRange.length - 1]

  function handlePageChange(page: number | string) {
    if (page === currentPage) {
      return `z-10 bg-background border-brand-blue text-primary relative inline-flex items-center px-4 py-2 max-sm:px-3 max-sm:py-1 border text-sm font-medium`
    } else {
      return "bg-background border-gray-300 dark:border-zinc-800 text-primary hover:bg-gray-50 relative inline-flex items-center px-4 py-2 max-sm:px-3 max-sm:py-1 border text-sm font-medium duration-200 ease-in-out"
    }
  }

  return (
    <div className="mt-5 md:py-5 py-2 flex items-center justify-between border-t border-gray-200 dark:border-zinc-900">
      <div className="flex-1 flex flex-row items-center justify-between max-sm:flex-col gap-4">
        {totalPosts > 0 ? (
          <div>
            <p className="text-sm text-gray-700 dark:text-zinc-400">
              Showing &nbsp;
              <span className="font-medium">{currentPage * postsPerPage - postsPerPage + 1}</span>
              &nbsp;-&nbsp;
              <span className="font-medium">
                {currentPage * postsPerPage > totalPosts ? totalPosts : currentPage * postsPerPage}
              </span>
              &nbsp;of&nbsp;
              <span className="font-medium">{totalPosts}</span> results
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-700 dark:text-zinc-200">No results found</p>
        )}
        <div>
          <nav className="relative z-0 inline-flex rounded-md  -space-x-px" aria-label="Pagination">
            <button
              onClick={() => {
                setCurrentPage(currentPage - 1)
              }}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center p-2 rounded-l-md border border-gray-300 dark:border-zinc-800 hover:bg-gray-50 text-sm font-medium duration-200 ease-in-out ${
                currentPage === 1
                  ? "bg-white dark:bg-zinc-900 text-gray-300 dark:text-zinc-400"
                  : "bg-white dark:bg-zinc-900 text-gray-500 dark:text-zinc-400"
              }`}
            >
              <span className="sr-only">Previous</span>
              <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            {paginationRange?.map((page, index) => {
              if (page === DOTS) {
                return (
                  <button
                    key={`${page}-${index}`}
                    className="bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:bg-gray-50 relative inline-flex items-center px-4 py-2 max-sm:px-2 max-sm:py-1 border text-sm font-medium duration-200 ease-in-out"
                  >
                    {DOTS}
                  </button>
                )
              }
              return (
                <button
                  type="button"
                  key={`${page}-${index}`}
                  className={handlePageChange(page)}
                  onClick={() => {
                    setCurrentPage(Number(page))
                  }}
                >
                  {page}
                </button>
              )
            })}
            <button
              onClick={() => {
                setCurrentPage(currentPage + 1)
              }}
              disabled={currentPage === lastPage || lastPage === undefined}
              className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-zinc-800 text-sm font-medium hover:bg-gray-50 duration-200 ease-in-out ${
                currentPage === lastPage || lastPage === undefined
                  ? "bg-white dark:bg-zinc-900 text-gray-300 dark:text-zinc-400"
                  : "bg-white dark:bg-zinc-900 text-gray-500 dark:text-zinc-400"
              }`}
            >
              <span className="sr-only">Next</span>
              <ArrowRightIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  )
}
