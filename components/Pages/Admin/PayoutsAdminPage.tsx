"use client"

import { ChevronLeftIcon } from "@heroicons/react/20/solid"
import Link from "next/link"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { isAddress } from "viem"
import { useAccount } from "wagmi"
import { ProgramFilter } from "@/components/Pages/Communities/Impact/ProgramFilter"
import { Button } from "@/components/Utilities/Button"
import { ExternalLink } from "@/components/Utilities/ExternalLink"
import { Spinner } from "@/components/Utilities/Spinner"
import TablePagination from "@/components/Utilities/TablePagination"
import { useCommunityDetails } from "@/hooks/useCommunityDetails"
import { type AttestationBatchUpdateItem, useBatchUpdatePayouts } from "@/hooks/useCommunityPayouts"
import { useGrants } from "@/hooks/useGrants"
import { useIsCommunityAdmin } from "@/hooks/useIsCommunityAdmin"
import { MESSAGES } from "@/utilities/messages"
import { PAGES } from "@/utilities/pages"
import { cn } from "@/utilities/tailwind"
import { type CsvParseResult, PayoutsCsvUpload } from "./PayoutsCsvUpload"

// Component-specific types
interface EditableFields {
  payoutAddress?: string
  amount?: string
}

interface PayoutsTableData {
  uid: string
  projectUid: string
  projectName: string
  projectSlug: string
  grantName: string
  grantProgramId: string
  grantChainId: number
  projectChainId: number
  currentPayoutAddress?: string
  currentAmount?: string
}

export default function PayoutsAdminPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { address } = useAccount()
  const params = useParams()
  const communityId = params.communityId as string

  // State for tracking edits
  const [editedFields, setEditedFields] = useState<Record<string, EditableFields>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Get values from URL params or use defaults
  const selectedProgramId = searchParams.get("programId")
  const itemsPerPage = Number(searchParams.get("limit")) || 200
  const currentPage = Number(searchParams.get("page")) || 1

  // Create URLSearchParams utility function
  const createQueryString = useCallback(
    (params: Record<string, string | null>) => {
      const newSearchParams = new URLSearchParams(searchParams.toString())

      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === "") {
          newSearchParams.delete(key)
        } else {
          newSearchParams.set(key, value)
        }
      })

      return newSearchParams.toString()
    },
    [searchParams]
  )

  // Fetch community details
  const {
    data: community,
    isLoading: isLoadingCommunity,
    error: communityError,
  } = useCommunityDetails(communityId)

  // Check if user is admin of this community
  const { isCommunityAdmin: isAdmin, isLoading: loadingAdmin } = useIsCommunityAdmin(
    community?.uid,
    address
  )

  // Extract the actual programId from the composite value (programId_chainId)
  const actualProgramId = selectedProgramId?.split("_")[0] || null

  // Fetch grants data with filter and pagination
  const {
    data: grantsData,
    isLoading: isLoadingGrants,
    refetch: refreshGrants,
  } = useGrants(communityId, {
    filter: actualProgramId ? { selectedProgramId: actualProgramId } : undefined,
    paginationOps: {
      page: currentPage - 1, // Backend expects 0-based page index
      pageLimit: itemsPerPage,
    },
    sortBy: "recent", // Use backend's recent sort option
  })

  const grants = grantsData?.grants || []
  const totalItems = grantsData?.totalItems || 0

  // Batch update mutation
  const { mutate: batchUpdate, isPending: isSaving } = useBatchUpdatePayouts()

  // Process grants into table data format
  const tableData: PayoutsTableData[] = useMemo(() => {
    const grantsArray: PayoutsTableData[] = []

    grants.forEach((grant) => {
      // Extract payout address for this community from the project's payoutAddress dictionary
      // Note: grant.payoutAddress is actually the project's payoutAddress extracted by useGrants hook
      let currentPayoutAddress = ""
      if (grant.payoutAddress) {
        if (typeof grant.payoutAddress === "string") {
          // Backward compatibility: if it's still a string, use it directly
          currentPayoutAddress = grant.payoutAddress
        } else if (typeof grant.payoutAddress === "object" && community?.uid) {
          // New structure: extract address for this specific community
          currentPayoutAddress = grant.payoutAddress[community.uid] || ""
        }
      }

      grantsArray.push({
        uid: grant.uid,
        projectUid: grant.projectUid,
        projectName: grant.project,
        projectSlug: grant.projectSlug,
        grantName: grant.grant,
        grantProgramId: grant.programId,
        grantChainId: grant.grantChainId,
        projectChainId: grant.projectChainId,
        currentPayoutAddress: currentPayoutAddress,
        currentAmount: grant.payoutAmount || "",
      })
    })

    return grantsArray
  }, [grants, community?.uid])

  // Since we're now using backend pagination, we don't need to filter or paginate client-side
  const paginatedData = tableData

  // URL param update handlers
  const handleProgramChange = (programId: string | null) => {
    const query = createQueryString({
      programId: programId,
      page: "1", // Reset to first page when changing program
    })
    router.push(`${pathname}?${query}`)
  }

  const handleItemsPerPageChange = (limit: number) => {
    const query = createQueryString({
      limit: limit.toString(),
      page: "1", // Reset to first page when changing items per page
    })
    router.push(`${pathname}?${query}`)
  }

  const handlePageChange = (page: number) => {
    const query = createQueryString({
      page: page.toString(),
    })
    router.push(`${pathname}?${query}`)
  }

  // Handle field changes
  const handleFieldChange = (uid: string, field: keyof EditableFields, value: string) => {
    setEditedFields((prev) => ({
      ...prev,
      [uid]: {
        ...prev[uid],
        [field]: value,
      },
    }))

    // Clear error when user starts typing
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[`${uid}-${field}`]
      return newErrors
    })
  }

  // Validate a single field
  const validateField = (uid: string, field: keyof EditableFields, value: string): boolean => {
    if (field === "payoutAddress" && value) {
      if (!isAddress(value)) {
        setErrors((prev) => ({
          ...prev,
          [`${uid}-${field}`]: "Invalid Ethereum address",
        }))
        return false
      }
    }

    if (field === "amount" && value) {
      if (!/^\d+(\.\d{1,2})?$/.test(value)) {
        setErrors((prev) => ({
          ...prev,
          [`${uid}-${field}`]: "Must be a valid number with up to 2 decimal places",
        }))
        return false
      }
    }

    return true
  }

  // State to store last CSV result for display
  const [lastCsvResult, setLastCsvResult] = useState<{
    unmatchedProjects: string[]
  } | null>(null)

  // Handle CSV data
  const handleCsvData = useCallback(
    (parseResult: CsvParseResult) => {
      const unmatchedProjects: string[] = []
      let matchedCount = 0

      // Clear previous results when new CSV is uploaded
      setLastCsvResult(null)

      // Use functional state update to avoid stale closure issues
      setEditedFields((prevEditedFields) => {
        const newEditedFields = { ...prevEditedFields }

        parseResult.data.forEach((csvRow) => {
          // Find matching project in table data
          const matchingProject = tableData.find((item) => item.projectSlug === csvRow.projectSlug)

          if (matchingProject) {
            matchedCount++
            newEditedFields[matchingProject.uid] = {
              ...newEditedFields[matchingProject.uid],
              payoutAddress: csvRow.payoutAddress,
              amount: csvRow.amount,
            }
          } else {
            unmatchedProjects.push(csvRow.projectSlug)
          }
        })

        return newEditedFields
      })

      // Store unmatched projects for display
      setLastCsvResult({ unmatchedProjects })

      // Show feedback about matches
      if (matchedCount > 0) {
        toast.success(`Matched ${matchedCount} projects`)
      }

      if (unmatchedProjects.length > 0) {
        console.warn("Unmatched projects:", unmatchedProjects)
      }
    },
    [tableData]
  )

  // Handle example CSV download
  const handleDownloadExampleCsv = useCallback(() => {
    // Create example CSV data with actual project slugs from current data
    const exampleData = tableData.slice(0, 3).map((item, index) => ({
      projectSlug: item.projectSlug,
      payoutAddress: `0x${"1".repeat(40)}`, // Example address
      amount: `${(index + 1) * 100}.00`, // Example amounts: 100.00, 200.00, 300.00
    }))

    // If no data available, create generic examples
    if (exampleData.length === 0) {
      exampleData.push(
        {
          projectSlug: "https://karmahq.xyz/project/example-project-1",
          payoutAddress: "0x1111111111111111111111111111111111111111",
          amount: "100.00",
        },
        {
          projectSlug: "https://karmahq.xyz/project/example-project-2",
          payoutAddress: "0x2222222222222222222222222222222222222222",
          amount: "200.00",
        },
        {
          projectSlug: "https://karmahq.xyz/project/example-project-3",
          payoutAddress: "0x3333333333333333333333333333333333333333",
          amount: "300.00",
        }
      )
    }

    // Convert to CSV format
    const csvHeader = "Project URL,Wallet Address,Amount\n"
    const csvRows = exampleData
      .map((row) => `${row.projectSlug},${row.payoutAddress},${row.amount}`)
      .join("\n")
    const csvContent = csvHeader + csvRows

    // Create and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", "payouts-example.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [tableData])

  // Handle save
  const handleSave = async () => {
    // Clear all errors
    setErrors({})

    // Prepare updates
    const updates: AttestationBatchUpdateItem[] = []
    let hasValidationError = false

    Object.entries(editedFields).forEach(([uid, fields]) => {
      const item = tableData.find((d) => d.uid === uid)
      if (!item) return

      // Validate fields
      if (Object.hasOwn(fields, "payoutAddress")) {
        // Allow empty string to clear the field
        if (fields.payoutAddress && !validateField(uid, "payoutAddress", fields.payoutAddress)) {
          hasValidationError = true
          return
        }

        updates.push({
          uid: item.projectUid,
          chainId: item.projectChainId,
          type: "Project",
          payoutAddress: fields.payoutAddress,
        })
      }

      if (Object.hasOwn(fields, "amount")) {
        // Allow empty string to clear the field
        if (fields.amount && !validateField(uid, "amount", fields.amount)) {
          hasValidationError = true
          return
        }

        updates.push({
          uid,
          chainId: item.grantChainId,
          type: "Grant",
          amount: fields.amount,
        })
      }
    })

    if (hasValidationError) {
      toast.error("Please fix validation errors before saving")
      return
    }

    if (updates.length === 0) {
      toast.error("No changes to save")
      return
    }

    // Execute batch update
    batchUpdate(
      {
        communityIdOrSlug: communityId,
        updates,
      },
      {
        onSuccess: (data) => {
          // Clear edited fields for successful updates
          const successfulUids = data.success
          setEditedFields((prev) => {
            const newEdited = { ...prev }
            successfulUids.forEach((uid) => {
              delete newEdited[uid]
            })
            return newEdited
          })

          // Refresh grants data
          refreshGrants()
        },
      }
    )
  }

  // Handle errors
  useEffect(() => {
    if (
      communityError?.message === "Community not found" ||
      communityError?.message?.includes("422")
    ) {
      router.push(PAGES.NOT_FOUND)
    }
  }, [communityError, router])

  // Loading state
  if (loadingAdmin || isLoadingGrants || isLoadingCommunity) {
    return (
      <div className="flex w-full items-center justify-center h-96">
        <Spinner />
      </div>
    )
  }

  // Not authorized state
  if (!isAdmin) {
    return (
      <div className="flex w-full items-center justify-center h-96">
        <p className="text-lg">{MESSAGES.ADMIN.NOT_AUTHORIZED(community?.uid || "")}</p>
      </div>
    )
  }

  const hasChanges = Object.keys(editedFields).length > 0

  return (
    <div className="my-4 flex gap-8 flex-row max-lg:flex-col-reverse w-full">
      <div className="w-full flex flex-col gap-8">
        <div className="w-full flex flex-wrap flex-row items-center justify-between px-4">
          <Link
            href={PAGES.ADMIN.ROOT(community?.details?.data?.slug || (community?.uid as string))}
          >
            <Button className="flex flex-row items-center gap-2 px-0 py-2 bg-transparent text-black dark:text-white dark:bg-transparent hover:bg-transparent rounded-md transition-all ease-in-out duration-200">
              <ChevronLeftIcon className="h-5 w-5" />
              Return to admin page
            </Button>
          </Link>
          <div className="flex flex-row flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <ProgramFilter onChange={handleProgramChange} />
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Show</p>
              <select
                className="border border-gray-300 dark:border-zinc-700 rounded-md px-3 py-1.5 pr-8 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
              <p className="text-sm text-gray-600 dark:text-gray-400">entries</p>
            </div>
          </div>
        </div>

        {selectedProgramId && (
          <div className="px-4">
            <PayoutsCsvUpload
              onDataParsed={handleCsvData}
              disabled={isSaving}
              unmatchedProjects={lastCsvResult?.unmatchedProjects}
              onDownloadExample={handleDownloadExampleCsv}
            />
          </div>
        )}

        <div className="px-4">
          <div className="flex flex-col justify-center w-full max-w-full overflow-x-auto rounded-md border">
            <table className="pt-3 min-w-full divide-y dark:bg-zinc-900 divide-gray-300 dark:divide-zinc-800 dark:text-white">
              <thead>
                <tr className="border-b transition-colors text-gray-500 dark:text-gray-200 hover:bg-muted/50">
                  <th scope="col" className="h-12 px-4 text-left align-middle font-medium">
                    Project
                  </th>
                  <th scope="col" className="h-12 px-4 text-left align-middle font-medium">
                    Grant
                  </th>
                  <th scope="col" className="h-12 px-4 text-left align-middle font-medium">
                    Payout Address
                  </th>
                  <th scope="col" className="h-12 px-4 text-left align-middle font-medium">
                    Payout Amount
                  </th>
                </tr>
              </thead>
              <tbody className="px-4 divide-y divide-gray-200 dark:divide-zinc-800">
                {paginatedData.map((item) => {
                  const fieldId = item.uid
                  const payoutError = errors[`${fieldId}-payoutAddress`]
                  const amountError = errors[`${fieldId}-amount`]

                  return (
                    <tr
                      key={`${item.uid}-${item.projectUid}`}
                      className="dark:text-zinc-300 text-gray-900 px-4 py-4"
                    >
                      <td className="px-4 py-2 font-medium h-16">
                        <ExternalLink
                          href={PAGES.PROJECT.OVERVIEW(item.projectSlug || item.projectUid)}
                          className="max-w-full line-clamp-2 underline"
                        >
                          {item.projectName}
                        </ExternalLink>
                      </td>
                      <td className="px-4 py-2">
                        <ExternalLink
                          href={PAGES.PROJECT.GRANT(item.projectSlug || item.projectUid, item.uid)}
                          className="max-w-full line-clamp-2 underline"
                        >
                          {item.grantName}
                        </ExternalLink>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-col gap-1">
                          <input
                            type="text"
                            className={cn(
                              "w-full px-3 py-2 border rounded-md bg-transparent placeholder:text-gray-400",
                              "focus:outline-none focus:ring-2 focus:ring-blue-500",
                              "dark:border-zinc-700 dark:text-white",
                              payoutError ? "border-red-500" : "border-gray-300"
                            )}
                            placeholder="Enter payout address"
                            value={
                              editedFields[fieldId]?.hasOwnProperty("payoutAddress")
                                ? editedFields[fieldId].payoutAddress
                                : item.currentPayoutAddress || ""
                            }
                            onChange={(e) =>
                              handleFieldChange(fieldId, "payoutAddress", e.target.value)
                            }
                            disabled={isSaving}
                          />
                          {payoutError && (
                            <span className="text-red-500 text-sm">{payoutError}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-col gap-1">
                          <input
                            type="text"
                            className={cn(
                              "w-full px-3 py-2 border rounded-md bg-transparent placeholder:text-gray-400",
                              "focus:outline-none focus:ring-2 focus:ring-blue-500",
                              "dark:border-zinc-700 dark:text-white",
                              amountError ? "border-red-500" : "border-gray-300"
                            )}
                            placeholder="0"
                            value={
                              editedFields[fieldId]?.hasOwnProperty("amount")
                                ? editedFields[fieldId].amount
                                : item.currentAmount || ""
                            }
                            onChange={(e) => handleFieldChange(fieldId, "amount", e.target.value)}
                            disabled={isSaving}
                          />
                          {amountError && (
                            <span className="text-red-500 text-sm">{amountError}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Footer with pagination and save button */}
            <div className="dark:bg-zinc-900 flex flex-col pb-4 items-end">
              <div className="w-full">
                <TablePagination
                  currentPage={currentPage}
                  setCurrentPage={handlePageChange}
                  postsPerPage={itemsPerPage}
                  totalPosts={totalItems}
                />
              </div>
              <Button
                disabled={isSaving || !hasChanges || Object.keys(errors).length > 0}
                onClick={handleSave}
                className="w-max mx-4 px-8 py-2 bg-blue-400 text-white rounded-md disabled:opacity-25 dark:bg-blue-900"
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
