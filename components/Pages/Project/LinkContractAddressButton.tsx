"use client";

import { Button } from "@/components/Utilities/Button";
import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { Dialog, Transition } from "@headlessui/react";
import {
  LinkIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import type { FC, ReactNode } from "react";
import { Fragment, useEffect, useState, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { errorManager } from "@/components/Utilities/errorManager";
import { MESSAGES } from "@/utilities/messages";
import { useAccount } from "wagmi";
import { ContractVerificationModal } from "@/components/Dialogs/ContractVerificationModal";
import { 
  useContractVerification, 
  useContractVerificationStatus,
  useContractDeployer 
} from "@/hooks/useContractVerification";
import { getChainIdByName } from "@/utilities/network";
import { ContractAddressInput } from "./ContractAddressInput";

interface LinkContractAddressesButtonProps {
  buttonClassName?: string;
  project: IProjectResponse & { external: Record<string, string[]> };
  "data-link-contracts-button"?: string;
  buttonElement?: { text: string; icon: ReactNode; styleClass: string } | null;
  onClose?: () => void;
}

interface NetworkAddressPair {
  network: string;
  address: string;
  verified?: boolean;
  verifiedAt?: string;
}

const SUPPORTED_NETWORKS = [
  "ethereum",
  "arbitrum",
  "starknet",
  "optimism",
  "polygon",
  "bnb",
  "avalanche_c",
  "base",
  "fantom",
  "zksync",
  "scroll",
  "gnosis",
  "linea",
  "zora",
  "blast",
  "celo",
  "tron",
  "mantle",
  "sei",
  "sepolia",
  "ronin",
  "sonic",
  "viction",
  "flare",
  "kaia",
  "zkevm",
  "mode",
  "berachain",
  "abstract",
  "bob",
  "degen",
  "worldchain",
  "nova",
  "ink",
  "b3",
  "unichain",
  "sophon",
  "apechain",
];

export const LinkContractAddressButton: FC<
  LinkContractAddressesButtonProps
> = ({
  project,
  buttonClassName,
  "data-link-contracts-button": dataAttr,
  buttonElement,
  onClose,
}) => {
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isCommunityAdmin = useCommunityAdminStore(
    (state) => state.isCommunityAdmin
  );
  const { address } = useAccount();
  const isAuthorized = isOwner || isProjectOwner || isCommunityAdmin;
  const { refreshProject } = useProjectStore();
  const [isOpen, setIsOpen] = useState(false);
  const [networkAddressPairs, setNetworkAddressPairs] = useState<
    NetworkAddressPair[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationModal, setVerificationModal] = useState<{
    isOpen: boolean;
    address: string;
    network: string;
    chainId: number;
  }>({ isOpen: false, address: "", network: "", chainId: 0 });
  const [contractValidationStatus, setContractValidationStatus] = useState<Map<number, boolean>>(new Map());

  // Use React Query hook for verification status
  const { data: verificationStatus } = useContractVerificationStatus(project?.uid);

  useEffect(() => {
    const loadAddressesWithVerification = async () => {
      if (project?.external?.network_addresses?.length) {
        const pairs = project.external.network_addresses.map((entry: string) => {
          const [network, address] = entry.split(":");
          const verificationInfo = verificationStatus?.[address.toLowerCase()];
          return { 
            network, 
            address,
            verified: verificationInfo?.verified || false,
            verifiedAt: verificationInfo?.verifiedAt,
          };
        });
        setNetworkAddressPairs(pairs);
      } else {
        setNetworkAddressPairs([{ network: "", address: "" }]);
      }
    };
    
    loadAddressesWithVerification();
  }, [project?.external?.network_addresses, project?.uid, verificationStatus]);

  useEffect(() => {
    if (buttonElement === null) {
      setIsOpen(true);
    }
  }, [buttonElement]);

  const handleAddPair = () => {
    setNetworkAddressPairs([
      ...networkAddressPairs,
      { network: "", address: "" },
    ]);
  };

  const handleRemovePair = (index: number) => {
    const newPairs = networkAddressPairs.filter((_, i) => i !== index);
    if (newPairs.length === 0) {
      setNetworkAddressPairs([{ network: "", address: "" }]);
    } else {
      setNetworkAddressPairs(newPairs);
    }
  };

  const handleAddressChange = (index: number, value: string) => {
    const newPairs = [...networkAddressPairs];
    newPairs[index] = { ...newPairs[index], address: value };
    setNetworkAddressPairs(newPairs);
  };

  const handleNetworkChange = (index: number, value: string) => {
    const newPairs = [...networkAddressPairs];
    newPairs[index] = { ...newPairs[index], network: value };
    setNetworkAddressPairs(newPairs);
  };

  const handleVerifyClick = async (network: string, address: string, chainId: number) => {
    // Save the contracts first without closing the dialog
    const saved = await handleSave(false);
    
    if (saved) {
      // Then open verification modal
      setVerificationModal({
        isOpen: true,
        address,
        network,
        chainId,
      });
    }
  };

  const handleVerificationSuccess = async (address: string) => {
    // Update the local state to mark the address as verified
    setNetworkAddressPairs(prev => 
      prev.map(pair => 
        pair.address === address 
          ? { ...pair, verified: true, verifiedAt: new Date().toISOString() }
          : pair
      )
    );
    
    // Refresh project data
    refreshProject();
  };

  const handleDeployerStatusChange = useCallback((index: number, canSave: boolean) => {
    setContractValidationStatus(prev => {
      const newMap = new Map(prev);
      newMap.set(index, canSave);
      return newMap;
    });
  }, []);


  const handleSave = async (close = true): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    // Validate that all pairs have both network and address
    const incompletePairs = networkAddressPairs.filter(
      (pair) => (pair?.address?.trim() !== "" && pair?.network?.trim() === "") ||
                (pair?.address?.trim() === "" && pair?.network?.trim() !== "")
    );
    
    if (incompletePairs.length > 0) {
      toast.error("Please select a network for all contract addresses");
      setIsLoading(false);
      return false;
    }
    
    // Filter out pairs with empty network or address
    const validPairs = networkAddressPairs.filter(
      (pair) => pair?.network?.trim() !== "" && pair?.address?.trim() !== ""
    );
    
    // Check for duplicates
    const uniquePairs = new Map();
    const duplicates: string[] = [];
    
    validPairs.forEach((pair) => {
      const key = `${pair.network}:${pair.address.toLowerCase()}`;
      if (uniquePairs.has(key)) {
        duplicates.push(`${pair.network}:${pair.address}`);
      } else {
        uniquePairs.set(key, pair);
      }
    });
    
    if (duplicates.length > 0) {
      toast.error(`Duplicate entries found and removed`);
      setNetworkAddressPairs(Array.from(uniquePairs.values()));
      setIsLoading(false);
      return false;
    }

    // Format pairs as network:address strings
    const formattedAddresses = validPairs.map(
      (pair) => `${pair.network}:${pair.address}`
    );
    try {
      const [data, error] = await fetchData(
        INDEXER.PROJECT.EXTERNAL.UPDATE(project.uid),
        "PUT",
        {
          target: "network_addresses",
          ids: formattedAddresses,
        }
      );

      if (data) {
        setNetworkAddressPairs(validPairs);
        toast.success(MESSAGES.PROJECT.LINK_CONTRACT_ADDRESSES.SUCCESS);
        if (close && buttonElement === null && onClose) {
          setIsOpen(false);
          onClose();
        }
        refreshProject();
        return true;
      }

      if (error) {
        setError(MESSAGES.PROJECT.LINK_CONTRACT_ADDRESSES.ERROR);
        return false;
      }

      return false
    } catch (err) {
      setError(MESSAGES.PROJECT.LINK_CONTRACT_ADDRESSES.ERROR);
      errorManager(
        MESSAGES.PROJECT.LINK_CONTRACT_ADDRESSES.ERROR,
        err,
        {
          projectUID: project.uid,
          target: "network_addresses",
          ids: formattedAddresses,
          address,
        },
        { error: MESSAGES.PROJECT.LINK_CONTRACT_ADDRESSES.ERROR }
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Define a function to handle dialog close
  const handleClose = () => {
    setIsOpen(false);
    if (buttonElement === null && onClose) {
      onClose();
    }
  };

  // Check if any contracts need verification
  const hasUnverifiedContracts = useMemo(() => {
    return networkAddressPairs.some(pair => 
      pair.address && pair.network && !pair.verified
    );
  }, [networkAddressPairs]);

  // Check for duplicate entries
  const duplicateIndices = useMemo(() => {
    const seen = new Map<string, number>();
    const duplicates = new Set<number>();
    
    networkAddressPairs.forEach((pair, index) => {
      if (pair.address && pair.network) {
        const key = `${pair.network}:${pair.address.toLowerCase()}`;
        const firstIndex = seen.get(key);
        if (firstIndex !== undefined) {
          // Mark both the first occurrence and current as duplicates
          duplicates.add(firstIndex);
          duplicates.add(index);
        } else {
          seen.set(key, index);
        }
      }
    });
    
    return duplicates;
  }, [networkAddressPairs]);

  // Check if contracts can be saved
  const canSaveContracts = useMemo(() => {
    // Check for duplicates
    if (duplicateIndices.size > 0) return false;
    
    // Check for incomplete pairs
    const hasIncompletePairs = networkAddressPairs.some(
      pair => (pair?.address?.trim() !== "" && pair?.network?.trim() === "") ||
              (pair?.address?.trim() === "" && pair?.network?.trim() !== "")
    );
    if (hasIncompletePairs) return false;
    
    // Check deployer validation for each unverified contract
    for (let i = 0; i < networkAddressPairs.length; i++) {
      const pair = networkAddressPairs[i];
      if (pair?.address?.trim() !== "" && pair?.network?.trim() !== "" && !pair.verified) {
        const canSave = contractValidationStatus.get(i);
        // If explicitly false, user is not the deployer
        if (canSave === false) return false;
      }
    }
    
    return true;
  }, [networkAddressPairs, contractValidationStatus, duplicateIndices]);

  if (!isAuthorized) {
    return null;
  }

  return (
    <>
      {buttonElement !== null && (
        <Button
          onClick={() => setIsOpen(true)}
          className={buttonClassName}
          data-link-contracts-button={dataAttr}
        >
          <LinkIcon className={"mr-2 h-5 w-5"} aria-hidden="true" />
          Link Contracts
        </Button>
      )}
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={handleClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-3xl transform overflow-visible rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle transition-all ease-in-out duration-300">
                  <Dialog.Title
                    as="h3"
                    className="text-gray-900 dark:text-zinc-100"
                  >
                    <h2 className="text-2xl font-bold leading-6">
                      Link Contract Addresses
                    </h2>
                    <p className="text-md text-gray-500 dark:text-gray-400 mt-2">
                      Add one or more contract addresses for the project. This
                      will enable the project to retrieve its on-chain metrics
                      for impact tracking.
                    </p>


                    {/* Info about deployer validation */}
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <InformationCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            We automatically check if you are the deployer of each contract. 
                            Only deployers can verify their contracts.
                          </p>
                        </div>
                      </div>
                    </div>
                  </Dialog.Title>

                  <div className="max-h-[60vh] flex flex-col gap-4 mt-8 overflow-y-auto overflow-x-hidden">
                    {networkAddressPairs.map((pair, index) => (
                      <ContractAddressInput
                        key={index}
                        index={index}
                        network={pair.network}
                        address={pair.address}
                        verified={pair.verified}
                        verifiedAt={pair.verifiedAt}
                        supportedNetworks={SUPPORTED_NETWORKS}
                        onNetworkChange={handleNetworkChange}
                        onAddressChange={handleAddressChange}
                        onRemove={handleRemovePair}
                        onVerify={handleVerifyClick}
                        onDeployerStatusChange={handleDeployerStatusChange}
                        canRemove={true}
                        projectId={project.uid}
                        isDuplicate={duplicateIndices.has(index)}
                      />
                    ))}

                    <Button
                      onClick={handleAddPair}
                      className="flex items-center justify-center text-white gap-2 border border-primary-500 bg-primary-500 hover:bg-primary-600"
                    >
                      <PlusIcon className="h-5 w-5" />
                      Add Another Contract
                    </Button>


                    {error && <p className="text-red-500 mt-2">{error}</p>}
                  </div>

                  <div className="flex flex-row gap-4 mt-10 justify-end">
                    <Button
                      onClick={() => handleSave()}
                      disabled={isLoading || !canSaveContracts}
                      className="bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? "Saving..." : "Save All"}
                    </Button>
                    <Button
                      className="text-zinc-900 bg-transparent border-black border dark:text-zinc-100 dark:border-zinc-100 hover:bg-zinc-900 hover:text-white disabled:hover:bg-transparent disabled:hover:text-zinc-900"
                      onClick={handleClose}
                    >
                      Close
                    </Button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
      
      {/* Verification Modal */}
      {verificationModal.isOpen && (
        <ContractVerificationModal
          isOpen={verificationModal.isOpen}
          onClose={() => setVerificationModal({ ...verificationModal, isOpen: false })}
          contractAddress={verificationModal.address}
          network={verificationModal.network}
          chainId={verificationModal.chainId}
          projectId={project.uid}
          onSuccess={handleVerificationSuccess}
        />
      )}
    </>
  );
};