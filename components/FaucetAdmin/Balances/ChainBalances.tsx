"use client";

import { useAllFaucetBalances } from "@/hooks/useFaucet";
import { Spinner } from "@/components/Utilities/Spinner";
import { formatEther } from "viem";
import { ExclamationTriangleIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

export function ChainBalances() {
  const { data, isLoading, error, refetch } = useAllFaucetBalances();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 text-center">
        <p className="text-red-800 dark:text-red-200">
          Failed to load balances. Please try again.
        </p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const balances = data?.balances || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Faucet Balances by Chain
        </h2>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {balances.map((balance) => (
          <div
            key={balance.chainId}
            className={`bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6 border-2 ${
              balance.isLow 
                ? "border-red-300 dark:border-red-700" 
                : "border-green-300 dark:border-green-700"
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {balance.chainName}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Chain ID: {balance.chainId}
                </p>
              </div>
              {balance.isLow ? (
                <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
              ) : (
                <CheckCircleIcon className="w-6 h-6 text-green-500" />
              )}
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Current Balance</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatEther(BigInt(balance.balance))} {balance.symbol}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Low Balance Threshold</p>
                <p className="text-md text-gray-700 dark:text-gray-300">
                  {formatEther(BigInt(balance.threshold))} {balance.symbol}
                </p>
              </div>

              {balance.isLow && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                    Low Balance Warning
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                    Please top up this faucet wallet soon
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {balances.length === 0 && (
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No balance data available
          </p>
        </div>
      )}
    </div>
  );
}