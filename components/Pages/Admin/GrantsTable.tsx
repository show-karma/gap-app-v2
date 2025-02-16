import { Button } from "@/components/Utilities/Button";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import TablePagination from "@/components/Utilities/TablePagination";
import { SimplifiedGrant } from "@/hooks/useGrants";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { Listbox, Transition } from "@headlessui/react";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/20/solid";
import pluralize from "pluralize";
import { Fragment } from "react";

type SortField = "project" | "grant" | "description" | "categories";
type SortDirection = "asc" | "desc";

interface GrantsTableProps {
  grants: SimplifiedGrant[];
  categories: { id: number; name: string }[];
  selectedCategories: Record<string, string[]>;
  onCategoryChange: (uid: string, categories: string[]) => void;
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  isSaving?: boolean;
  onSave: () => void;
  sort: {
    field?: SortField;
    direction?: SortDirection;
  };
  onSort: (field: SortField) => void;
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
  const hasChanges = Object.keys(selectedCategories).length > 0;

  const renderSortIcon = (field: SortField) => {
    if (sort.field !== field) {
      return (
        <ChevronUpDownIcon
          className="h-4 w-4 text-gray-400 ml-1"
          aria-hidden="true"
        />
      );
    }
    return sort.direction === "asc" ? (
      <ChevronUpIcon
        className="h-4 w-4 text-primary-600 ml-1"
        aria-hidden="true"
      />
    ) : (
      <ChevronDownIcon
        className="h-4 w-4 text-primary-600 ml-1"
        aria-hidden="true"
      />
    );
  };

  const renderColumnHeader = (field: SortField, label: string) => (
    <button
      onClick={() => onSort(field)}
      className="flex items-center text-left font-medium hover:text-primary-600 transition-colors"
    >
      {label}
      {renderSortIcon(field)}
    </button>
  );

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
            <th
              scope="col"
              className="h-12 px-4 text-left align-middle font-medium"
            >
              Manage categories
            </th>
          </tr>
        </thead>
        <tbody className="px-4 divide-y divide-gray-200 dark:divide-zinc-800">
          {grants.map((grant) => {
            const grantCategories =
              selectedCategories[grant.projectUid] || grant.categories;
            return (
              <tr
                key={grant.uid}
                className="dark:text-zinc-300 text-gray-900 px-4 py-4"
              >
                <td className="px-4 py-2 font-medium h-16">
                  <ExternalLink
                    href={PAGES.PROJECT.OVERVIEW(
                      grant.projectSlug || grant.projectUid
                    )}
                    className="max-w-full line-clamp-2 underline"
                  >
                    {grant.project}
                  </ExternalLink>
                </td>
                <td className="px-4 py-2">
                  <ExternalLink
                    href={PAGES.PROJECT.GRANT(
                      grant.projectSlug || grant.projectUid,
                      grant.uid
                    )}
                    className="max-w-full line-clamp-2 underline w-max"
                  >
                    {grant.grant}
                  </ExternalLink>
                </td>
                <td className="px-4 py-2">
                  <div className="max-w-[200px] line-clamp-2">
                    {grant.description}
                  </div>
                </td>
                <td className="px-4 py-2 max-w-[200px]">
                  {grant.categories.join(", ")}
                </td>
                <td className="w-max">
                  <Listbox
                    value={grantCategories}
                    onChange={(value) => onCategoryChange(grant.projectUid, value)}
                    multiple
                  >
                    {({ open }) => (
                      <div className="flex items-center gap-x-2">
                        <div className="relative flex-1 w-56">
                          <Listbox.Button className="dark:bg-zinc-800 dark:text-white relative w-full max-w-[200px] cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-600 sm:text-sm sm:leading-6">
                            <p className="block truncate">
                              {grantCategories.length > 0
                                ? `${grantCategories.length} ${pluralize(
                                  "category",
                                  grantCategories.length
                                )} selected`
                                : "Categories"}
                            </p>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                              <ChevronUpDownIcon
                                className="h-5 w-5 text-gray-400"
                                aria-hidden="true"
                              />
                            </span>
                          </Listbox.Button>

                          <Transition
                            show={open}
                            as={Fragment}
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                          >
                            <Listbox.Options className="dark:bg-zinc-800 dark:text-white absolute z-10 mt-1 max-h-60 w-full max-w-max min-w-[200px] overflow-auto rounded-md bg-white py-1 text-base ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                              {categories.map((category) => (
                                <Listbox.Option
                                  key={category.id}
                                  className={({ active }) =>
                                    cn(
                                      active
                                        ? "bg-gray-100 text-black dark:text-gray-300 dark:bg-zinc-900"
                                        : "text-gray-900 dark:text-gray-200",
                                      "relative cursor-default select-none py-2 pl-3 pr-9 transition-all ease-in-out duration-200"
                                    )
                                  }
                                  value={category.name}
                                >
                                  {({ selected, active }) => (
                                    <>
                                      <span
                                        className={cn(
                                          selected
                                            ? "font-semibold"
                                            : "font-normal",
                                          "block truncate"
                                        )}
                                      >
                                        {category.name}
                                      </span>
                                      {selected && (
                                        <span
                                          className={cn(
                                            "text-primary-600 dark:text-primary-400",
                                            "absolute inset-y-0 right-0 flex items-center pr-4"
                                          )}
                                        >
                                          <CheckIcon
                                            className="h-5 w-5"
                                            aria-hidden="true"
                                          />
                                        </span>
                                      )}
                                    </>
                                  )}
                                </Listbox.Option>
                              ))}
                            </Listbox.Options>
                          </Transition>
                        </div>
                      </div>
                    )}
                  </Listbox>
                </td>
              </tr>
            );
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
  );
};
