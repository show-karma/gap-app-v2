"use client";

import { FC, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { SearchDropdown } from "@/components/Pages/ProgramRegistry/SearchDropdown";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrashIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { useContractDeployer } from "@/hooks/useContractVerification";
import { getChainIdByName } from "@/utilities/network";

interface ContractAddressInputProps {
  index: number;
  network: string;
  address: string;
  verified?: boolean;
  verifiedAt?: string;
  supportedNetworks: string[];
  onNetworkChange: (index: number, value: string) => void;
  onAddressChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  onVerify: (network: string, address: string, chainId: number) => void;
  onDeployerStatusChange: (index: number, canSave: boolean) => void;
  canRemove: boolean;
  projectId: string;
  isDuplicate?: boolean;
}

export const ContractAddressInput: FC<ContractAddressInputProps> = ({
  index,
  network,
  address,
  verified = false,
  verifiedAt,
  supportedNetworks,
  onNetworkChange,
  onAddressChange,
  onRemove,
  onVerify,
  onDeployerStatusChange,
  canRemove,
  projectId,
  isDuplicate = false,
}) => {
  const { address: userAddress } = useAccount();
  const [chainId, setChainId] = useState<number | undefined>();
  const [isAddressValid, setIsAddressValid] = useState(true);

  // Get chain ID when network changes
  useEffect(() => {
    if (network) {
      const id = getChainIdByName(network);
      setChainId(id);
    } else {
      setChainId(undefined);
    }
  }, [network]);

  // Validate Ethereum address format
  useEffect(() => {
    if (address) {
      const isValid = /^0x[a-fA-F0-9]{40}$/.test(address);
      setIsAddressValid(isValid);
    } else {
      setIsAddressValid(true);
    }
  }, [address]);

  // Fetch contract deployer
  const { data: deployerData, isLoading: isLoadingDeployer } = useContractDeployer(
    isAddressValid && address ? address : undefined,
    chainId
  );

  const isUserDeployer = deployerData?.owner && userAddress && 
    deployerData.owner.toLowerCase() === userAddress.toLowerCase();
  
  const hasDeployerError = deployerData?.error && address && network;
  const canVerify = isUserDeployer && !verified && isAddressValid && !isDuplicate;
  const showDeployerWarning = !isUserDeployer && deployerData?.owner && !verified && userAddress;

  // Notify parent about deployer validation status
  useEffect(() => {
    // Can save if:
    // 1. Contract is already verified, OR
    // 2. No address/network yet (empty)
    
    // Cannot save if:
    // 1. Still loading deployer data, OR
    // 2. User is the deployer but hasn't verified yet, OR
    // 3. User is not the deployer
    
    let canSave = true;
    
    if (address && network) {
      if (!verified) {
        // Unverified contract
        if (isLoadingDeployer) {
          // Still loading, cannot save yet
          canSave = false;
        } else if (deployerData?.owner) {
          // We have deployer data
          if (isUserDeployer) {
            // User is deployer but hasn't verified - must verify first
            canSave = false;
          } else {
            // User is not the deployer - cannot save
            canSave = false;
          }
        } else if (hasDeployerError) {
          // Error fetching deployer, allow save (backend will validate)
          canSave = true;
        }
      }
      // If verified, canSave remains true
    }
    
    onDeployerStatusChange(index, canSave);
  }, [index, address, network, verified, isUserDeployer, isLoadingDeployer, deployerData, hasDeployerError, onDeployerStatusChange]);

  const getStatusDisplay = () => {
    if (verified) {
      return (
        <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
          <ShieldCheckIcon className="h-4 w-4" />
          <span>Verified</span>
          {verifiedAt && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({new Date(verifiedAt).toLocaleDateString()})
            </span>
          )}
        </div>
      );
    }

    if (!address || !network) {
      return null;
    }

    if (isDuplicate) {
      return (
        <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-sm">
          <XCircleIcon className="h-4 w-4" />
          <span>Duplicate contract - this address and network combination already exists</span>
        </div>
      );
    }

    if (!isAddressValid) {
      return (
        <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-sm">
          <XCircleIcon className="h-4 w-4" />
          <span>Invalid address format</span>
        </div>
      );
    }

    if (isLoadingDeployer) {
      return (
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
          <Spinner className="h-4 w-4" />
          <span>Checking deployer...</span>
        </div>
      );
    }

    if (hasDeployerError) {
      return (
        <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 text-sm">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <span>Unable to verify deployer</span>
        </div>
      );
    }

    if (isUserDeployer) {
      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
            <CheckCircleIcon className="h-4 w-4" />
            <span>You are the deployer</span>
          </div>
          {canVerify && (
            <Button
              onClick={() => onVerify(network, address, chainId!)}
              className="text-sm text-white"
            >
              Verify
            </Button>
          )}
        </div>
      );
    }

    if (showDeployerWarning) {
      return (
        <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-sm">
          <XCircleIcon className="h-4 w-4" />
          <span>You are not the deployer</span>
          {deployerData?.owner && (
            <span className="text-xs">
              (Deployer: {deployerData.owner.slice(0, 6)}...{deployerData.owner.slice(-4)})
            </span>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 text-sm">
        <ExclamationTriangleIcon className="h-4 w-4" />
        <span>Unverified</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-2">
        <div className={`flex items-center justify-between p-4 rounded-lg flex-grow w-full ${
          verified
            ? "bg-green-50 dark:bg-green-900/20 border-2 border-green-500"
            : isDuplicate && address && network
            ? "bg-red-50 dark:bg-red-900/20 border-2 border-red-500"
            : "bg-gray-100 dark:bg-zinc-700"
        }`}>
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4 w-full">
            <span className="text-md font-bold capitalize whitespace-nowrap flex items-center gap-2">
              Contract {index + 1}
              {verified && (
                <LockClosedIcon className="h-4 w-4 text-green-600 dark:text-green-400" title="Verified - Cannot be edited" />
              )}
            </span>
            <div className="flex-1 flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 w-full">
              {verified ? (
                // Display read-only view for verified contracts
                <div className="flex-1 flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 w-full">
                  <div className="flex-1 px-3 py-2 text-sm rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 cursor-not-allowed">
                    {network ? network.charAt(0).toUpperCase() + network.slice(1) : ""}
                  </div>
                  <div className="flex-1 px-3 py-2 text-sm rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 font-mono cursor-not-allowed">
                    {address}
                  </div>
                </div>
              ) : (
                // Editable inputs for unverified contracts
                <>
                  <SearchDropdown
                    onSelectFunction={(value) => onNetworkChange(index, value)}
                    selected={network ? [network] : []}
                    list={supportedNetworks}
                    type="network"
                    prefixUnselected="Select"
                    buttonClassname="flex-1 w-full md:w-auto"
                  />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => onAddressChange(index, e.target.value)}
                    className={`flex-1 w-full md:w-auto text-sm rounded-md text-gray-600 dark:text-gray-300 bg-transparent border-b ${
                      isDuplicate && address && network
                        ? "border-red-500 focus:border-red-600"
                        : !isAddressValid && address
                        ? "border-red-500 focus:border-red-600"
                        : "border-gray-300 dark:border-gray-600 focus:border-blue-500"
                    } focus:outline-none`}
                    placeholder="Enter contract address (0x...)"
                  />
                </>
              )}
            </div>
          </div>
        </div>
        {canRemove && (
          <Button
            onClick={() => onRemove(index)}
            className="p-2 bg-red-500 text-white hover:bg-red-600 mt-2 md:mt-0"
            aria-label="Remove contract"
          >
            <TrashIcon className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Status Display */}
      {(address || network) && (
        <div className="flex flex-wrap items-center justify-end gap-2 px-4">
          {getStatusDisplay()}
        </div>
      )}


      {/* Warning for unverified contracts */}
      {address && network && !verified && !isLoadingDeployer && !isDuplicate && (
        <div className="mx-4 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs">
          <p className="text-yellow-700 dark:text-yellow-300">
            Contract verification is required to prove ownership. Unverified contracts may be removed after the grace period.
          </p>
        </div>
      )}
    </div>
  );
};