"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useWalletClient, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import type { ValidatedCSVRow, PoolInfo } from "@/types/allo";
import { 
  executeDirectDistribution, 
  checkDistributionPermission, 
  prepareDistributionData 
} from "@/utilities/allo/distribution";
import { formatPoolAmount } from "@/utilities/allo/query";
import { FiCheckCircle, FiXCircle, FiAlertTriangle, FiExternalLink } from "react-icons/fi";
import { toast } from "react-hot-toast";

type DistributionExecutionStatus = "idle" | "preparing" | "pending" | "success" | "error";

interface DistributionExecutionProps {
  csvData: ValidatedCSVRow[];
  poolInfo: PoolInfo;
  chainId: number;
  onBack: () => void;
  onComplete: (txHash: string) => void;
}

export function DistributionExecution({ 
  csvData, 
  poolInfo, 
  chainId, 
  onBack, 
  onComplete 
}: DistributionExecutionProps) {
  const [status, setStatus] = useState<DistributionExecutionStatus>("idle");
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  const { openConnectModal } = useConnectModal();

  const distributionData = prepareDistributionData(poolInfo.strategy.type, csvData, poolInfo.chainId);

  useEffect(() => {
    checkPermissions();
  }, [address, poolInfo.poolId, chainId]);

  const checkPermissions = async () => {
    if (!address) {
      setHasPermission(null);
      return;
    }

    try {
      const permission = await checkDistributionPermission(
        poolInfo.poolId,
        address,
        chainId
      );
      setHasPermission(permission);
    } catch (error) {
      console.error("Error checking permissions:", error);
      setHasPermission(false);
    }
  };

  const handleConnectWallet = () => {
    if (openConnectModal) {
      openConnectModal();
    }
  };

  const handleSwitchChain = async () => {
    try {
      await switchChain({ chainId });
    } catch (error) {
      console.error("Error switching chain:", error);
      toast.error("Failed to switch chain");
    }
  };

  const handleExecuteDistribution = async () => {
    if (!walletClient || !address) {
      toast.error("Wallet not connected");
      return;
    }

    setStatus("preparing");
    setError(null);

    try {
      const txHash = await executeDirectDistribution(
        poolInfo.strategy.address,
        poolInfo.strategy.type,
        csvData,
        walletClient,
        chainId
      );

      setTransactionHash(txHash);
      setStatus("success");
      toast.success("Distribution completed successfully!");
      onComplete(txHash);

    } catch (error) {
      console.error("Distribution error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setError(errorMessage);
      setStatus("error");
      toast.error(`Distribution failed: ${errorMessage}`);
    }
  };

  const getChainName = (chainId: number): string => {
    const chainNames: Record<number, string> = {
      10: "Optimism",
      42161: "Arbitrum",
      42220: "Celo",
      11155420: "Optimism Sepolia",
      11155111: "Sepolia",
      84532: "Base Sepolia",
    };
    return chainNames[chainId] || `Chain ${chainId}`;
  };

  const getBlockExplorerUrl = (txHash: string): string => {
    const explorerUrls: Record<number, string> = {
      10: "https://optimistic.etherscan.io",
      42161: "https://arbiscan.io",
      42220: "https://celoscan.io",
      11155420: "https://sepolia-optimism.etherscan.io",
      11155111: "https://sepolia.etherscan.io",
      84532: "https://sepolia.basescan.org",
    };
    const baseUrl = explorerUrls[chainId] || "https://etherscan.io";
    return `${baseUrl}/tx/${txHash}`;
  };

  const canExecute = isConnected && 
    chain?.id === chainId && 
    hasPermission && 
    distributionData.canDistribute &&
    status === "idle";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">
        Execute Distribution
      </h2>

      {/* Distribution Summary */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-gray-100">
          Distribution Summary
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Recipients:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
              {distributionData.totalRecipients}
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
              {formatPoolAmount(distributionData.totalAmount, poolInfo.token)}
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Strategy:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
              {poolInfo.strategy.name}
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Estimated Gas:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
              {distributionData.estimatedGas}
            </span>
          </div>
          {distributionData.requiresMerkleRoot && (
            <div className="col-span-2">
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                  Merkle-based Distribution
                </h4>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  This strategy uses a two-step process: (1) Set merkle root with distribution metadata, (2) Execute direct transfers to all recipients.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Checks */}
      <div className="space-y-3 mb-6">
        {/* Wallet Connection */}
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <FiCheckCircle className="text-green-500" />
          ) : (
            <FiXCircle className="text-red-500" />
          )}
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {isConnected ? "Wallet connected" : "Wallet not connected"}
          </span>
        </div>

        {/* Chain Check */}
        <div className="flex items-center space-x-2">
          {chain?.id === chainId ? (
            <FiCheckCircle className="text-green-500" />
          ) : (
            <FiXCircle className="text-red-500" />
          )}
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {chain?.id === chainId 
              ? `Connected to ${getChainName(chainId)}` 
              : `Switch to ${getChainName(chainId)}`}
          </span>
        </div>

        {/* Permission Check */}
        <div className="flex items-center space-x-2">
          {hasPermission === true ? (
            <FiCheckCircle className="text-green-500" />
          ) : hasPermission === false ? (
            <FiXCircle className="text-red-500" />
          ) : (
            <FiAlertTriangle className="text-yellow-500" />
          )}
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {hasPermission === true 
              ? "Distribution permission verified" 
              : hasPermission === false 
                ? "No distribution permission" 
                : "Checking permissions..."}
          </span>
        </div>

        {/* Strategy Support */}
        <div className="flex items-center space-x-2">
          {distributionData.canDistribute ? (
            <FiCheckCircle className="text-green-500" />
          ) : (
            <FiXCircle className="text-red-500" />
          )}
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {distributionData.canDistribute 
              ? "Strategy supports direct distribution" 
              : "Strategy does not support direct distribution"}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-4">
        {!isConnected && (
          <Button onClick={handleConnectWallet} className="w-full">
            Connect Wallet
          </Button>
        )}

        {isConnected && chain?.id !== chainId && (
          <Button onClick={handleSwitchChain} className="w-full">
            Switch to {getChainName(chainId)}
          </Button>
        )}

        {canExecute && (
          <Button
            onClick={handleExecuteDistribution}
            disabled={status !== "idle"}
            className="w-full"
          >
            Execute Distribution
          </Button>
        )}

        {(status === "preparing" || status === "pending") && (
          <Button
            disabled={true}
            className="w-full"
          >
            <Spinner className="mr-2" />
            Executing Distribution...
          </Button>
        )}

        {/* Transaction Status */}
        {status === "success" && transactionHash && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center">
              <FiCheckCircle className="h-5 w-5 text-green-400 mr-2" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Distribution Completed Successfully
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {distributionData.totalRecipients} recipients received funds
                </p>
                <a
                  href={getBlockExplorerUrl(transactionHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200 mt-1"
                >
                  View transaction
                  <FiExternalLink className="ml-1 h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        )}

        {status === "error" && error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex">
              <FiXCircle className="h-5 w-5 text-red-400 mr-2" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Distribution Failed
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Back Button */}
        <Button
          variant="secondary"
          onClick={onBack}
          disabled={status === "preparing" || status === "pending"}
          className="w-full"
        >
          Back to Review
        </Button>
      </div>
    </div>
  );
} 