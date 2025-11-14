import { ChevronDownIcon, ChevronUpDownIcon, ChevronUpIcon } from "@heroicons/react/20/solid"
import pluralize from "pluralize"
import { Fragment } from "react"
import { SearchWithValueDropdown } from "@/components/Pages/Communities/Impact/SearchWithValueDropdown"
import { Button } from "@/components/Utilities/Button"
import { ExternalLink } from "@/components/Utilities/ExternalLink"
import TablePagination from "@/components/Utilities/TablePagination"
import type { SimplifiedGrant } from "@/hooks/useGrants"
import { PAGES } from "@/utilities/pages"
import { cn } from "@/utilities/tailwind"

type SortField = "project" | "grant" | "description" | "categories"
type SortDirection = "asc" | "desc"

interface GrantsTableProps {
  grants: SimplifiedGrant[]
  categories: { id: number; name: string }[]
  selectedCategories: Record<string, string[]>
  onCategoryChange: (uid: string, categories: string[]) => void
  currentPage: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  isSaving?: boolean
  onSave: () => void
  sort: {
    field?: SortField
    direction?: SortDirection
  }
  onSort: (field: SortField) => void
}

export const GrantsTable = ({
  grants,
  categories,
  selectedCategories,
  onCategoryChange,
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  isSaving,
  onSave,
  sort,
  onSort,
}: GrantsTableProps) => {
  const hasChanges = Object.keys(selectedCategories).length > 0

  const renderSortIcon = (field: SortField) => {
    if (sort.field !== field) {
      return <ChevronUpDownIcon className="h-4 w-4 text-gray-400 ml-1" aria-hidden="true" />
    }
    return sort.direction === "asc" ? (
      <ChevronUpIcon className="h-4 w-4 text-primary-600 ml-1" aria-hidden="true" />
    ) : (
      <ChevronDownIcon className="h-4 w-4 text-primary-600 ml-1" aria-hidden="true" />
    )
  }

  const renderColumnHeader = (field: SortField, label: string) => (
    <button
      onClick={() => onSort(field)}
      className="flex items-center text-left font-medium hover:text-primary-600 transition-colors"
    >
      {label}
      {renderSortIcon(field)}
    </button>
  )

  return (
    <div className="flex flex-col justify-center w-full max-w-full overflow-x-auto rounded-md border">
      <table className="pt-3 min-w-full divide-y dark:bg-zinc-900 divide-gray-300 dark:divide-zinc-800 dark:text-white">
        <thead>
          <tr className="border-b transition-colors text-gray-500 dark:text-gray-200 hover:bg-muted/50 data-[state=selected]:bg-muted">
            <th scope="col" className="h-12 px-4 text-left align-middle">
              {renderColumnHeader("project", "Project")}
            </th>
            <th scope="col" className="h-12 px-4 text-left align-middle">
              {renderColumnHeader("grant", "Grant Program")}
            </th>
            <th scope="col" className="h-12 px-4 text-left align-middle">
              {renderColumnHeader("description", "Description")}
            </th>
            <th scope="col" className="h-12 px-4 text-left align-middle">
              {renderColumnHeader("categories", "Categories")}
            </th>
            <th scope="col" className="h-12 px-4 text-left align-middle font-medium">
              Manage categories
            </th>
          </tr>
        </thead>
        <tbody className="px-4 divide-y divide-gray-200 dark:divide-zinc-800">
          {grants.map((grant) => {
            const grantCategories = selectedCategories[grant.projectUid] || grant.categories
            return (
              <tr key={grant.uid} className="dark:text-zinc-300 text-gray-900 px-4 py-4">
                <td className="px-4 py-2 font-medium h-16">
                  <ExternalLink
                    href={PAGES.PROJECT.OVERVIEW(grant.projectSlug || grant.projectUid)}
                    className="max-w-full line-clamp-2 underline"
                  >
                    {grant.project}
                  </ExternalLink>
                </td>
                <td className="px-4 py-2">
                  <ExternalLink
                    href={PAGES.PROJECT.GRANT(grant.projectSlug || grant.projectUid, grant.uid)}
                    className="max-w-full line-clamp-2 underline w-max"
                  >
                    {grant.grant}
                  </ExternalLink>
                </td>
                <td className="px-4 py-2">
                  <div className="max-w-[200px] line-clamp-2">{grant.description}</div>
                </td>
                <td className="px-4 py-2 max-w-[200px]">{grant.categories.sort().join(", ")}</td>
                <td className="w-max">
                  <SearchWithValueDropdown
                    list={categories.map((cat) => ({
                      value: cat.name,
                      title: cat.name,
                    }))}
                    onSelectFunction={(value) =>
                      onCategoryChange(
                        grant.projectUid,
                        grantCategories.includes(value)
                          ? grantCategories.filter((cat) => cat !== value)
                          : [...grantCategories, value]
                      )
                    }
                    selected={grantCategories}
                    type="Categories"
                    id={`categories-${grant.uid}`}
                    buttonClassname="min-w-[200px] max-w-[200px]"
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="dark:bg-zinc-900 flex flex-col pb-4 items-end">
        <div className="w-full">
          <TablePagination
            currentPage={currentPage}
            setCurrentPage={onPageChange}
            postsPerPage={itemsPerPage}
            totalPosts={totalItems}
          />
        </div>
        <Button
          disabled={isSaving || !hasChanges}
          onClick={onSave}
          className="w-max mx-4 px-8 py-2 bg-blue-400 text-white rounded-md disabled:opacity-25 dark:bg-blue-900"
        >
          Save
        </Button>
      </div>
    </div>
  )
}
