"use client";

import { Dialog, Transition } from "@headlessui/react";
import { LinkIcon, PlusIcon } from "@heroicons/react/24/outline";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import type { FC, ReactNode } from "react";
import { Fragment, useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { ContractAddressItem } from "@/components/Pages/Project/ContractAddressItem";
import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { useContractAddressValidation } from "@/hooks/useContractAddressValidation";
import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";

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
}

// Helper function to create composite keys for validation Map
const getContractKey = (network: string, address: string) =>
  `${network}:${address}`;

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
    (state) => state.isCommunityAdmin,
  );
  const { address } = useAccount();
  const isAuthorized = isOwner || isProjectOwner || isCommunityAdmin;
  const { refreshProject } = useProjectStore();
  const { validateContract } = useContractAddressValidation();
  const [isOpen, setIsOpen] = useState(false);
  const [networkAddressPairs, setNetworkAddressPairs] = useState<
    NetworkAddressPair[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalidContracts, setInvalidContracts] = useState<
    Map<string, { projectName: string; projectSlug?: string }>
  >(new Map());

  useEffect(() => {
    if (project?.external?.network_addresses?.length) {
      const pairs = project.external.network_addresses.map((entry) => {
        const [network, address] = entry.split(":");
        return { network, address };
      });
      setNetworkAddressPairs(pairs);
    } else {
      setNetworkAddressPairs([{ network: "", address: "" }]);
    }
  }, [project?.external?.network_addresses]);

  useEffect(() => {
    if (buttonElement === null) {
      setIsOpen(true);
    }
  }, [buttonElement]);

  // Helper to clear validation error for a contract
  const clearContractValidationError = useCallback(
    (pair: NetworkAddressPair) => {
      if (pair.network && pair.address) {
        const contractKey = getContractKey(pair.network, pair.address);
        setInvalidContracts((prev) => {
          const newMap = new Map(prev);
          newMap.delete(contractKey);
          return newMap;
        });
      }
      setError(null);
    },
    [],
  );

  const handleAddPair = useCallback(() => {
    setNetworkAddressPairs([
      ...networkAddressPairs,
      { network: "", address: "" },
    ]);
  }, [networkAddressPairs]);

  const handleRemovePair = useCallback(
    (index: number) => {
      const pairToRemove = networkAddressPairs[index];
      const newPairs = networkAddressPairs.filter((_, i) => i !== index);

      if (newPairs.length === 0) {
        setNetworkAddressPairs([{ network: "", address: "" }]);
      } else {
        setNetworkAddressPairs(newPairs);
      }

      clearContractValidationError(pairToRemove);
    },
    [networkAddressPairs, clearContractValidationError],
  );

  const handleAddressChange = useCallback(
    (index: number, value: string) => {
      const oldPair = networkAddressPairs[index];
      const newPairs = [...networkAddressPairs];
      newPairs[index] = { ...newPairs[index], address: value };
      setNetworkAddressPairs(newPairs);

      clearContractValidationError(oldPair);
    },
    [networkAddressPairs, clearContractValidationError],
  );

  const handleNetworkChange = useCallback(
    (index: number, value: string) => {
      const oldPair = networkAddressPairs[index];
      const newPairs = [...networkAddressPairs];
      newPairs[index] = { ...newPairs[index], network: value };
      setNetworkAddressPairs(newPairs);

      clearContractValidationError(oldPair);
    },
    [networkAddressPairs, clearContractValidationError],
  );

  const validateAllContracts = useCallback(
    async (
      pairs: NetworkAddressPair[],
    ): Promise<Map<string, { projectName: string; projectSlug?: string }>> => {
      // Create validation promises for all pairs in parallel
      const validationPromises = pairs.map((pair) =>
        validateContract({
          address: pair.address,
          network: pair.network,
          excludeProjectId: project.uid,
        })
          .then((result) => ({ pair, result, error: null }))
          .catch((error) => ({ pair, result: null, error })),
      );

      // Wait for all validations to complete
      const results = await Promise.all(validationPromises);

      // Build validation results map using composite keys
      const validationResults = new Map<
        string,
        { projectName: string; projectSlug?: string; errorMessage?: string }
      >();

      results.forEach(({ pair, result, error }) => {
        if (error) {
          console.error("Error validating contract address:", error);
          const contractKey = getContractKey(pair.network, pair.address);
          const errorMessage = error?.message || String(error);
          validationResults.set(contractKey, {
            projectName: "Validation Failed",
            errorMessage: errorMessage,
          });
          return;
        }

        if (result && !result.isAvailable && result.existingProject) {
          const contractKey = getContractKey(pair.network, pair.address);
          validationResults.set(contractKey, {
            projectName: result.existingProject.name || "Unknown Project",
            projectSlug: result.existingProject.slug,
          });
        }
      });

      return validationResults;
    },
    [validateContract, project.uid],
  );

  const saveContracts = useCallback(
    async (pairs: NetworkAddressPair[]): Promise<boolean> => {
      const formattedAddresses = pairs.map(
        (pair) => `${pair.network}:${pair.address}`,
      );

      try {
        const [data, error] = await fetchData(
          INDEXER.PROJECT.EXTERNAL.UPDATE(project.uid),
          "PUT",
          {
            target: "network_addresses",
            ids: formattedAddresses,
          },
        );

        if (error) {
          setError(MESSAGES.PROJECT.LINK_CONTRACT_ADDRESSES.ERROR);
          throw new Error(MESSAGES.PROJECT.LINK_CONTRACT_ADDRESSES.ERROR);
        }

        if (data) {
          setNetworkAddressPairs(pairs);
          toast.success(MESSAGES.PROJECT.LINK_CONTRACT_ADDRESSES.SUCCESS);
          if (buttonElement === null && onClose) {
            setIsOpen(false);
            onClose();
            refreshProject();
          }
          return true;
        }

        return false;
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
          { error: MESSAGES.PROJECT.LINK_CONTRACT_ADDRESSES.ERROR },
        );
        return false;
      }
    },
    [project.uid, buttonElement, onClose, refreshProject, address],
  );

  const handleSave = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setInvalidContracts(new Map());

    try {
      // Filter out empty pairs
      const validPairs = networkAddressPairs.filter(
        (pair) => pair?.network?.trim() !== "" && pair?.address?.trim() !== "",
      );

      // Validate all contracts
      const invalidResults = await validateAllContracts(validPairs);

      // Stop if any contracts are invalid
      if (invalidResults.size > 0) {
        setInvalidContracts(invalidResults);
        return;
      }

      // All valid - proceed with save
      await saveContracts(validPairs);
    } finally {
      setIsLoading(false);
    }
  }, [networkAddressPairs, validateAllContracts, saveContracts]);

  // Define a function to handle dialog close
  const handleClose = useCallback(() => {
    setIsOpen(false);
    if (buttonElement === null && onClose) {
      onClose();
    }
  }, [buttonElement, onClose]);

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
                    as="h2"
                    className="text-gray-900 dark:text-zinc-100"
                  >
                    <div className="text-2xl font-bold leading-6">
                      Link Contract Addresses
                    </div>
                    <p className="text-md text-gray-500 dark:text-gray-400 mt-2">
                      Add one or more contract addresses for the project. This
                      will enable the project to retrieve its on-chain metrics
                      for impact tracking.
                    </p>
                  </Dialog.Title>
                  <div className="max-h-[60vh] flex flex-col gap-4 mt-8 overflow-y-auto">
                    {networkAddressPairs.map((pair, index) => {
                      const contractKey = getContractKey(
                        pair.network,
                        pair.address,
                      );
                      const isInvalid = invalidContracts.has(contractKey);
                      const invalidInfo = invalidContracts.get(contractKey);

                      return (
                        <ContractAddressItem
                          key={index}
                          pair={pair}
                          index={index}
                          isInvalid={isInvalid}
                          invalidInfo={invalidInfo}
                          canRemove={networkAddressPairs.length > 1}
                          onNetworkChange={handleNetworkChange}
                          onAddressChange={handleAddressChange}
                          onRemove={handleRemovePair}
                          supportedNetworks={SUPPORTED_NETWORKS}
                        />
                      );
                    })}
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
                      onClick={handleSave}
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
    </>
  );
};
