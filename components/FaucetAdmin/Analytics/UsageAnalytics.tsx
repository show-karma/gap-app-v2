"use client"

import { useState } from "react"
import { formatEther } from "viem"
import { Spinner } from "@/components/Utilities/Spinner"
import { useFaucetHistory, useFaucetStats } from "@/hooks/useFaucet"
import { useChains, useRequests } from "@/hooks/useFaucetAdmin"

type RequestStatus = "PENDING" | "CLAIMED" | "EXPIRED" | "FAILED"

export function UsageAnalytics() {
  const [selectedDays, setSelectedDays] = useState(7)
  const [selectedChain, setSelectedChain] = useState<number | undefined>(undefined)
  const [selectedStatus, setSelectedStatus] = useState<RequestStatus | undefined>(undefined)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const { chains } = useChains()
  const { data: stats, isLoading: statsLoading } = useFaucetStats(selectedChain, selectedDays)
  const { data: requests, isLoading: isRequestsPending } = useRequests({
    page: currentPage,
    limit: pageSize,
    status: selectedStatus,
    chainId: selectedChain,
  })
  const { data: recentHistory, isLoading: historyLoading } = useFaucetHistory(
    undefined,
    selectedChain
  )

  const isLoading = statsLoading || isRequestsPending || historyLoading

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Chain
            </label>
            <select
              value={selectedChain || ""}
              onChange={(e) => {
                setSelectedChain(e.target.value ? parseInt(e.target.value) : undefined)
                setCurrentPage(1)
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
            >
              <option value="">All Chains</option>
              {chains?.map((chain) => (
                <option key={chain.chainId} value={chain.chainId}>
                  {chain.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={selectedStatus || ""}
              onChange={(e) => {
                setSelectedStatus(e.target.value as RequestStatus | undefined)
                setCurrentPage(1)
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="CLAIMED">Claimed</option>
              <option value="EXPIRED">Expired</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Time Period
            </label>
            <select
              value={selectedDays}
              onChange={(e) => setSelectedDays(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
            >
              <option value={1}>Last 24 hours</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Page Size
            </label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value))
                setCurrentPage(1)
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Faucet Statistics
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Requests</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
              {stats?.totalRequests || 0}
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">Successful Claims</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
              {stats?.successfulClaims || 0}
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">Failed Claims</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
              {stats?.failedClaims || 0}
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">Unique Addresses</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
              {stats?.uniqueAddresses || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Filtered Requests */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {selectedStatus ? `${selectedStatus} Requests` : "All Requests"}
          </h3>
          {requests?.pagination.totalCount && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total: {requests?.pagination.totalCount} requests
            </p>
          )}
        </div>

        {requests && requests?.payload && requests?.payload?.length > 0 ? (
          <>
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-zinc-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Address
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Chain
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
                  {requests.payload.map((request) => (
                    <tr key={request.id}>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">
                        {request.walletAddress.slice(0, 6)}...{request.walletAddress.slice(-4)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {chains?.find((n) => n.chainId === request.chainId)?.name ||
                          request.chainId}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            request.status === "CLAIMED"
                              ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                              : request.status === "FAILED"
                                ? "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400"
                                : request.status === "EXPIRED"
                                  ? "bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-400"
                                  : "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400"
                          }`}
                        >
                          {request.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {formatEther(BigInt(request.amount))} ETH
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {request.status === "PENDING" && request.expiresAt
                          ? `Expires: ${new Date(request.expiresAt).toLocaleTimeString()}`
                          : new Date(request.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {requests?.pagination.totalCount > pageSize && (
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(currentPage * pageSize, requests?.pagination.totalCount)} of{" "}
                  {requests.pagination.totalCount} results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  {/* Page numbers */}
                  {Array.from(
                    { length: Math.min(5, Math.ceil(requests?.pagination.totalCount / pageSize)) },
                    (_, i) => {
                      const pageNum = currentPage > 3 ? currentPage - 2 + i : i + 1
                      if (pageNum > Math.ceil(requests?.pagination.totalCount / pageSize))
                        return null
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 text-sm rounded-lg ${
                            pageNum === currentPage
                              ? "bg-blue-500 text-white"
                              : "bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-700"
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    }
                  ).filter(Boolean)}

                  <button
                    onClick={() =>
                      setCurrentPage(
                        Math.min(
                          Math.ceil(requests?.pagination.totalCount / pageSize),
                          currentPage + 1
                        )
                      )
                    }
                    disabled={currentPage >= Math.ceil(requests?.pagination.totalCount / pageSize)}
                    className="px-3 py-1 text-sm bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              {selectedStatus
                ? `No ${selectedStatus.toLowerCase()} requests found`
                : "No requests found"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
