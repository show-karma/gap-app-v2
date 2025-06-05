"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/Utilities/Button";
import { ChainSelector } from "./ChainSelector";
import { getPoolInfo, formatPoolAmount } from "@/utilities/allo/query";
import { getStrategyCapabilities } from "@/utilities/allo/contracts";
import type { PoolInfo } from "@/types/allo";
import { toast } from "react-hot-toast";
import { Spinner } from "@/components/Utilities/Spinner";

interface PoolLookupFormData {
  poolId: string;
  chainId: number;
}

interface PoolLookupProps {
  onPoolFound: (poolInfo: PoolInfo, chainId: number) => void;
}

export function PoolLookup({ onPoolFound }: PoolLookupProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [selectedChainId, setSelectedChainId] = useState<number>(10);
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<PoolLookupFormData>({
    defaultValues: {
      chainId: 10, // Optimism by default
    }
  });

  const selectedChain = watch("chainId");

  const onSubmit = async (data: PoolLookupFormData) => {
    setIsLoading(true);
    try {
      const info = await getPoolInfo(data.poolId, data.chainId);
      setPoolInfo(info);
      setSelectedChainId(data.chainId);
      onPoolFound(info, data.chainId);
      toast.success("Pool found successfully!");
    } catch (error) {
      console.error("Error fetching pool:", error);
      toast.error("Failed to fetch pool information. Please check the pool ID and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const strategyCapabilities = poolInfo ? getStrategyCapabilities(poolInfo.strategy.type, poolInfo.chainId) : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">
        Pool Lookup
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="poolId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Pool ID
          </label>
          <input
            id="poolId"
            type="text"
            {...register("poolId", {
              required: "Pool ID is required",
              pattern: {
                value: /^\d+$/,
                message: "Pool ID must be a number"
              }
            })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="Enter pool ID (e.g., 523)"
          />
          {errors.poolId && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.poolId.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Chain
          </label>
          <ChainSelector
            selectedChain={selectedChain}
            onSelectChain={(chainId) => setValue("chainId", chainId)}
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Spinner className="mr-2" />
              Looking up pool...
            </>
          ) : (
            "Lookup Pool"
          )}
        </Button>
      </form>

      {poolInfo && !isLoading && (
        <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Pool Information
          </h3>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Pool ID:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{poolInfo.poolId}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Amount:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {formatPoolAmount(poolInfo.totalAmount, poolInfo.token)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Strategy:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{poolInfo.strategy.name}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Strategy Type:</span>
              <span className="text-sm font-mono text-gray-900 dark:text-gray-100">{poolInfo.strategy.type}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Approved Applications:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{poolInfo.totalApprovedCount}</span>
            </div>

            {strategyCapabilities && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">Strategy Capabilities</h4>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className={`w-3 h-3 rounded-full mr-2 ${strategyCapabilities.supportsDirectDistribution ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {strategyCapabilities.supportsDirectDistribution ? 'Supports direct distribution' : 'Requires claiming'}
                    </span>
                  </div>
                  {strategyCapabilities.requiresMerkleTree && (
                    <div className="flex items-center">
                      <span className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Uses Merkle tree distribution</span>
                    </div>
                  )}
                </div>
                {strategyCapabilities.description && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
                    {strategyCapabilities.description}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 