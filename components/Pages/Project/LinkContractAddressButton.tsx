"use client";

import { Button } from "@/components/Utilities/Button";
import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { Dialog, Transition } from "@headlessui/react";
import {
  CheckCircleIcon,
  LinkIcon,
  PlusIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import type { FC, ReactNode } from "react";
import { Fragment, useEffect, useState } from "react";
import { SearchDropdown } from "@/components/Pages/ProgramRegistry/SearchDropdown";
import toast from "react-hot-toast";
import { errorManager } from "@/components/Utilities/errorManager";
import { MESSAGES } from "@/utilities/messages";
import { useAccount } from "wagmi";
import { ContractVerificationModal } from "@/components/Dialogs/ContractVerificationModal";
import { useContractVerification } from "@/hooks/useContractVerification";
import { getChainIdByName } from "@/utilities/network";

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
  const { getVerificationStatus } = useContractVerification();

  useEffect(() => {
    const loadAddressesWithVerification = async () => {
      if (project?.external?.network_addresses?.length) {
        const pairs = project.external.network_addresses.map((entry) => {
          const [network, address] = entry.split(":");
          return { network, address };
        });
        
        // Fetch verification status for all addresses
        try {
          const verificationStatus = await getVerificationStatus(project.uid);
          const pairsWithVerification = pairs.map(pair => ({
            ...pair,
            verified: verificationStatus[pair.address.toLowerCase()]?.verified || false,
            verifiedAt: verificationStatus[pair.address.toLowerCase()]?.verifiedAt,
          }));
          setNetworkAddressPairs(pairsWithVerification);
        } catch (error) {
          console.error("Failed to fetch verification status:", error);
          setNetworkAddressPairs(pairs);
        }
      } else {
        setNetworkAddressPairs([{ network: "", address: "" }]);
      }
    };
    
    loadAddressesWithVerification();
  }, [project?.external?.network_addresses, project?.uid, getVerificationStatus]);

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

  const handleVerifyClick = async (pair: NetworkAddressPair) => {
    await handleSave(false)
      const chainId = getChainIdByName(pair.network);
    setVerificationModal({
      isOpen: true,
      address: pair.address,
      network: pair.network,
      chainId,
    });
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

  const handleSave = async (close=true) => {
    setIsLoading(true);
    setError(null);
    // Filter out pairs with empty network or address
    const validPairs = networkAddressPairs.filter(
      (pair) => pair?.network?.trim() !== "" && pair?.address?.trim() !== ""
    );

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
          refreshProject();
        }
      }

      if (error) {
        setError(MESSAGES.PROJECT.LINK_CONTRACT_ADDRESSES.ERROR);
        throw new Error(MESSAGES.PROJECT.LINK_CONTRACT_ADDRESSES.ERROR);
      }
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
                <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle transition-all ease-in-out duration-300">
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
                    {/* Grace Period Warning */}
                    {networkAddressPairs.some(pair => pair.address && pair.network && !pair.verified) && (
                      <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <div className="flex items-start gap-2">
                          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                              Contract Verification Required
                            </p>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                              Please verify your contract addresses to prove ownership. 
                              Unverified contracts will be removed after the grace period.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </Dialog.Title>
                  <div className="max-h-[60vh] flex flex-col gap-4 mt-8 overflow-y-auto">
                    {networkAddressPairs.map((pair, index) => (
                      <div key={index} className="flex flex-col gap-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-zinc-700 rounded-lg flex-grow">
                            <div className="flex items-center space-x-4 w-full">
                              <span className="text-md font-bold capitalize whitespace-nowrap">
                                Contract {index + 1}
                              </span>
                              <div className="flex-1 flex space-x-4">
                                <SearchDropdown
                                  onSelectFunction={(value) =>
                                    handleNetworkChange(index, value)
                                  }
                                  selected={pair.network ? [pair.network] : []}
                                  list={SUPPORTED_NETWORKS}
                                  type="network"
                                  prefixUnselected="Select"
                                  buttonClassname="flex-1"
                                />
                                <input
                                  type="text"
                                  value={pair.address}
                                  onChange={(e) =>
                                    handleAddressChange(index, e.target.value)
                                  }
                                  className="flex-1 text-sm rounded-md text-gray-600 dark:text-gray-300 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
                                  placeholder="Enter contract address"
                                />
                              </div>
                            </div>
                          </div>
                          {networkAddressPairs.length > 1 && (
                            <Button
                              onClick={() => handleRemovePair(index)}
                              className="p-2 text-red-500 hover:text-red-700"
                              aria-label="Remove contract"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </Button>
                          )}
                        </div>
                        {/* Verification Status */}
                        {pair.address && pair.network && (
                          <div className="flex items-center justify-end gap-2 px-4">
                            {pair.verified ? (
                              <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                                <ShieldCheckIcon className="h-4 w-4" />
                                <span>Verified</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 text-sm">
                                  <ExclamationTriangleIcon className="h-4 w-4" />
                                  <span>Unverified</span>
                                </div>
                                <Button
                                  onClick={() => handleVerifyClick(pair)}
                                  className="text-sm text-primary-500 hover:text-primary-600 underline"
                                >
                                  Verify
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
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
                      disabled={isLoading}
                      className="bg-primary-500 text-white hover:bg-primary-600"
                    >
                      {isLoading ? "Saving..." : "Save All"}
                    </Button>
                    <Button
                      className="text-zinc-900 text-lg bg-transparent border-black border dark:text-zinc-100 dark:border-zinc-100 hover:bg-zinc-900 hover:text-white disabled:hover:bg-transparent disabled:hover:text-zinc-900"
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
