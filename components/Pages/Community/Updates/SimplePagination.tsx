import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline"
import type { FC } from "react"
import { cn } from "@/utilities/tailwind"

interface SimplePaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export const SimplePagination: FC<SimplePaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1)
    }
  }

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1)
    }
  }

  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      const sidePages = Math.floor((maxVisiblePages - 1) / 2)
      let startPage = Math.max(1, currentPage - sidePages)
      let endPage = Math.min(totalPages, currentPage + sidePages)

      if (currentPage <= sidePages) {
        endPage = maxVisiblePages
      }

      if (currentPage > totalPages - sidePages) {
        startPage = totalPages - maxVisiblePages + 1
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i)
      }
    }

    return pages
  }

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center space-x-1">
      <button
        onClick={handlePrevious}
        disabled={currentPage === 1}
        className={cn(
          "p-2 rounded-lg border text-sm font-medium transition-colors",
          currentPage === 1
            ? "border-gray-300 text-gray-400 cursor-not-allowed"
            : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        )}
      >
        <ChevronLeftIcon className="h-4 w-4" />
      </button>

      <div className="flex space-x-1">
        {getPageNumbers().map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={cn(
              "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              page === currentPage
                ? "bg-brand-blue text-white"
                : "text-gray-700 hover:bg-gray-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
            )}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        onClick={handleNext}
        disabled={currentPage === totalPages}
        className={cn(
          "p-2 rounded-lg border text-sm font-medium transition-colors",
          currentPage === totalPages
            ? "border-gray-300 text-gray-400 cursor-not-allowed"
            : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        )}
      >
        <ChevronRightIcon className="h-4 w-4" />
      </button>
    </div>
  )
}
