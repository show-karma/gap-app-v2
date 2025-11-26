"use client";

import { PencilIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Spinner } from "@/components/Utilities/Spinner";
import { useChains } from "@/hooks/useFaucetAdmin";
import { ChainForm } from "./ChainForm";

export function ChainManager() {
  const { chains, isLoading, createChain, updateChain, deleteChain, isUpdating } = useChains();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingChain, setEditingChain] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  const handleCreateChain = async (chainData: any) => {
    createChain(chainData);
    setShowAddForm(false);
  };

  const handleUpdateChain = async (chainData: any) => {
    if (editingChain) {
      const { chainId, ...updates } = chainData;
      updateChain({ chainId, updates });
      setEditingChain(null);
    }
  };

  const handleDeleteChain = async (chainId: number) => {
    if (
      confirm(
        "Are you sure you want to delete this chain configuration? This action cannot be undone."
      )
    ) {
      deleteChain(chainId);
    }
  };

  const filteredChains = chains.filter((chain: any) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      chain.name?.toLowerCase().includes(searchLower) ||
      chain.symbol?.toLowerCase().includes(searchLower) ||
      chain.chainId?.toString().includes(searchTerm)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Chain Configurations
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage blockchain network configurations for the faucet system
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Chain
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-4">
        <input
          type="text"
          placeholder="Search by name, symbol, or chain ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white"
        />
      </div>

      {/* Add New Chain Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Add New Chain</h3>
          <ChainForm
            onSave={handleCreateChain}
            onCancel={() => setShowAddForm(false)}
            isLoading={isUpdating}
          />
        </div>
      )}

      {/* Edit Chain Form */}
      {editingChain && (
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Edit Chain: {editingChain.name}</h3>
          <ChainForm
            chain={editingChain}
            onSave={handleUpdateChain}
            onCancel={() => setEditingChain(null)}
            isLoading={isUpdating}
          />
        </div>
      )}

      {/* Chains List */}
      {filteredChains.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredChains.map((chain: any) => (
            <div key={chain.chainId} className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {chain.name}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Chain ID: {chain.chainId}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setEditingChain(chain)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                    title="Edit"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteChain(chain.chainId)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    title="Delete"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Symbol:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{chain.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Decimals:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {chain.decimals}
                  </span>
                </div>
                {chain.rpcUrl && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">RPC:</span>
                    <span
                      className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]"
                      title={chain.rpcUrl}
                    >
                      {chain.rpcUrl}
                    </span>
                  </div>
                )}
                {chain.explorerUrl && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Explorer:</span>
                    <a
                      href={chain.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[200px]"
                      title={chain.explorerUrl}
                    >
                      {chain.explorerUrl}
                    </a>
                  </div>
                )}
                {chain.createdAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Created:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {new Date(chain.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm ? "No chains found matching your search" : "No chain configurations yet"}
          </p>
          {!searchTerm && !showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Add First Chain
            </button>
          )}
        </div>
      )}
    </div>
  );
}
