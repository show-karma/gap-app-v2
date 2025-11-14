"use client"

import { TrashIcon } from "@heroicons/react/24/outline"
import { useState } from "react"
import { Spinner } from "@/components/Utilities/Spinner"
import { useChains, useWhitelistedContracts } from "@/hooks/useFaucetAdmin"

export function WhitelistManager() {
  const { contracts, isLoading, whitelistContract, removeFromWhitelist } = useWhitelistedContracts()
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    chainId: "",
    contractAddress: "",
    name: "",
    description: "",
    maxGasLimit: "",
  })
  const { chains } = useChains()

  console.log(contracts)
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    whitelistContract({
      chainId: parseInt(formData.chainId),
      contractAddress: formData.contractAddress,
      name: formData.name,
      description: formData.description,
      maxGasLimit: formData.maxGasLimit || undefined,
    })
    setFormData({
      chainId: "",
      contractAddress: "",
      name: "",
      description: "",
      maxGasLimit: "",
    })
    setShowAddForm(false)
  }

  const getChainName = (chainId: number) => {
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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Whitelisted Contracts
        </h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Add Contract
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Add Contract to Whitelist</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Chain
                </label>
                <select
                  value={formData.chainId}
                  onChange={(e) => setFormData({ ...formData, chainId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Select a chain</option>
                  {chains?.map((network) => (
                    <option key={network.chainId} value={network.chainId}>
                      {network.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contract Address
                </label>
                <input
                  type="text"
                  value={formData.contractAddress}
                  onChange={(e) => setFormData({ ...formData, contractAddress: e.target.value })}
                  placeholder="0x..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max Gas Limit (optional)
                </label>
                <input
                  type="text"
                  value={formData.maxGasLimit}
                  onChange={(e) => setFormData({ ...formData, maxGasLimit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description (optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white"
              />
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
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Add Contract
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
                Chain
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Contract Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
            {contracts?.data?.map((contract) => (
              <tr key={`${contract.chainId}-${contract.contractAddress}`}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {getChainName(contract.chainId)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                  {contract.contractAddress}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {contract.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      contract.enabled
                        ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                        : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400"
                    }`}
                  >
                    {contract.enabled ? "Enabled" : "Disabled"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <button
                    onClick={() => {
                      if (
                        confirm("Are you sure you want to remove this contract from the whitelist?")
                      ) {
                        removeFromWhitelist({
                          chainId: contract.chainId,
                          address: contract.contractAddress,
                        })
                      }
                    }}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {contracts?.data?.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No whitelisted contracts yet
          </div>
        )}
      </div>
    </div>
  )
}
