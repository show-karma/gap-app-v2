"use client"

import { Listbox, Transition } from "@headlessui/react"
import { ChevronDownIcon, ClockIcon, UserIcon } from "@heroicons/react/24/outline"
import { type FC, Fragment, useEffect } from "react"
import { useApplicationVersions } from "@/hooks/useFundingPlatform"
import { useApplicationVersionsStore } from "@/store/applicationVersions"
import { formatDate } from "@/utilities/formatDate"
import { cn } from "@/utilities/tailwind"

interface ApplicationVersionSelectorProps {
  applicationId: string // Can be either application ID or reference number
  onVersionSelect?: (versionId: string) => void
}

const ApplicationVersionSelector: FC<ApplicationVersionSelectorProps> = ({
  applicationId,
  onVersionSelect,
}) => {
  // Fetch versions using React Query
  const { versions, isLoading, error } = useApplicationVersions(applicationId)

  // Get UI state from Zustand store
  const { selectedVersionId, selectedVersion, selectVersion } = useApplicationVersionsStore()

  // Auto-select the latest version when versions are loaded
  useEffect(() => {
    if (versions.length > 0 && !selectedVersion) {
      selectVersion(versions[0].id, versions)
    }
  }, [versions, selectedVersion, selectVersion])

  const handleVersionChange = (versionId: string) => {
    selectVersion(versionId, versions)
    onVersionSelect?.(versionId)
  }

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 dark:text-red-400">Failed to load version history</div>
    )
  }

  if (versions.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">No version history available</div>
    )
  }

  return (
    <div className="w-full">
      <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Select Version
      </div>
      <Listbox value={selectedVersionId} onChange={handleVersionChange}>
        <div className="relative">
          <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white dark:bg-zinc-800 border border-gray-300 dark:border-gray-600 py-2.5 pl-3 pr-10 text-left shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm">
            <span className="flex items-center">
              <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
              <span className="block truncate">
                {selectedVersion ? (
                  <>
                    Version {selectedVersion.versionNumber} -{" "}
                    {formatDate(selectedVersion.createdAt)}
                    {selectedVersion.submittedBy && (
                      <span className="ml-2 text-gray-500 dark:text-gray-400">
                        by {selectedVersion.submittedBy.slice(0, 6)}...
                        {selectedVersion.submittedBy.slice(-4)}
                      </span>
                    )}
                  </>
                ) : (
                  "Select a version"
                )}
              </span>
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </span>
          </Listbox.Button>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-zinc-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {versions.map((version) => (
                <Listbox.Option
                  key={version.id}
                  className={({ active }) =>
                    cn(
                      "relative cursor-pointer select-none py-3 pl-3 pr-9",
                      active
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200"
                        : "text-gray-900 dark:text-gray-100"
                    )
                  }
                  value={version.id}
                >
                  {({ selected, active }) => (
                    <>
                      <div className="flex items-start">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <span className={cn("font-medium", selected && "font-semibold")}>
                              Version {version.versionNumber}
                            </span>
                            {version.versionNumber === versions[0].versionNumber && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                Latest
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(version.createdAt)}
                            {version.submittedBy && (
                              <>
                                {" • "}
                                <span className="inline-flex items-center">
                                  <UserIcon className="h-3 w-3 mr-1 inline" />
                                  {version.submittedBy.slice(0, 6)}...
                                  {version.submittedBy.slice(-4)}
                                </span>
                              </>
                            )}
                          </div>
                          {version.hasChanges && (
                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                              {version.changeCount} change{version.changeCount !== 1 ? "s" : ""}
                              {version.diffFromPrevious &&
                                version.diffFromPrevious.changedFields.length > 0 && (
                                  <span className="ml-1 italic">
                                    (
                                    {version.diffFromPrevious.changedFields
                                      .slice(0, 2)
                                      .map((f) => f.fieldLabel)
                                      .join(", ")}
                                    {version.diffFromPrevious.changedFields.length > 2 &&
                                      `, +${version.diffFromPrevious.changedFields.length - 2} more`}
                                    )
                                  </span>
                                )}
                            </div>
                          )}
                        </div>
                      </div>

                      {selected && (
                        <span
                          className={cn(
                            "absolute inset-y-0 right-0 flex items-center pr-4",
                            active ? "text-blue-600" : "text-blue-600"
                          )}
                        >
                          <svg
                            className="h-5 w-5"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      )}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  )
}

export default ApplicationVersionSelector
