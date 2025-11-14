"use client"

import { useState } from "react"
import { Spinner } from "@/components/Utilities/Spinner"
import { useBlockedAddresses, useChains } from "@/hooks/useFaucetAdmin"

export function BlocklistManager() {
  const { addresses, isLoading, blockAddress, unblockAddress } = useBlockedAddresses()
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    address: "",
    reason: "",
    chainId: "",
    expiresAt: "",
  })
  const { chains } = useChains()
  const handleBlock = (e: React.FormEvent) => {
    e.preventDefault()
    blockAddress({
      address: formData.address,
      chainId: formData.chainId ? parseInt(formData.chainId) : undefined,
      expiresAt: formData.expiresAt || undefined,
      reason: formData.reason,
    })
    setFormData({
      address: "",
      reason: "",
      chainId: "",
      expiresAt: "",
    })
    setShowAddForm(false)
  }

  const getChainName = (chainId?: number) => {
    if (!chainId) return "All Chains"
    return chains?.find((n) => n.chainId === chainId)?.name || `Chain ${chainId}`
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Blocked Addresses</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Block Address
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Block Address</h3>
          <form onSubmit={handleBlock} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Wallet Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="0x..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Chain (optional - leave empty for all chains)
                </label>
                <select
                  value={formData.chainId}
                  onChange={(e) => setFormData({ ...formData, chainId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white"
                >
                  <option value="">All chains</option>
                  {chains?.map((network) => (
                    <option key={network.chainId} value={network.chainId}>
                      {network.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason
                </label>
                <input
                  type="text"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Expires At (optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Block Address
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-zinc-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Chain
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Reason
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Expires
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
            {addresses?.data.map((blocked, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                  {blocked.address}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {getChainName(blocked.chainId)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {blocked.reason}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {blocked.expiresAt ? new Date(blocked.expiresAt).toLocaleDateString() : "Never"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to unblock this address?")) {
                        unblockAddress({
                          address: blocked.address,
                          chainId: blocked.chainId,
                        })
                      }
                    }}
                    className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                  >
                    Unblock
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {addresses?.data.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No blocked addresses
          </div>
        )}
      </div>
    </div>
  )
}
