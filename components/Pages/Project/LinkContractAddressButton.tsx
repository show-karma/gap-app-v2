"use client";

import { Dialog, Transition } from "@headlessui/react";
import { LinkIcon, PlusIcon } from "@heroicons/react/24/outline";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import type { FC, ReactNode } from "react";
import { Fragment, useCallback, useEffect, useState } from "react";
import { ContractAddressItem } from "@/components/Pages/Project/ContractAddressItem";
import { Button } from "@/components/Utilities/Button";
import { useContractAddressPairs } from "@/hooks/useContractAddressPairs";
import { useContractAddressSave } from "@/hooks/useContractAddressSave";
import { useContractAddressValidation } from "@/hooks/useContractAddressValidation";
import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/communityAdmin";

interface LinkContractAddressesButtonProps {
  buttonClassName?: string;
  project: IProjectResponse & { external: Record<string, string[]> };
  "data-link-contracts-button"?: string;
  buttonElement?: { text: string; icon: ReactNode; styleClass: string } | null;
  onClose?: () => void;
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
    (state) => state.isCommunityAdmin,
  );
  const isAuthorized = isOwner || isProjectOwner || isCommunityAdmin;
  const [isOpen, setIsOpen] = useState(false);

  // Custom hooks for state and logic management
  const { pairs, addPair, removePair, updateAddress, updateNetwork } = useContractAddressPairs({ project });
  const { clearError } = useContractAddressValidation({ projectUid: project.uid });
  const { save, isLoading, error, setError, invalidContracts } = useContractAddressSave({
    projectUid: project.uid,
    onSuccess: () => {
      if (buttonElement === null && onClose) {
        setIsOpen(false);
        onClose();
      }
    },
  });

  useEffect(() => {
    if (buttonElement === null) {
      setIsOpen(true);
    }
  }, [buttonElement]);

  const handleAddPair = useCallback(() => {
    addPair();
  }, [addPair]);

  const handleRemovePair = useCallback(
    (index: number) => {
      const pairToRemove = pairs[index];
      removePair(index);
      clearError(pairToRemove);
    },
    [pairs, removePair, clearError],
  );

  const handleAddressChange = useCallback(
    (index: number, value: string) => {
      const oldPair = pairs[index];
      updateAddress(index, value);
      clearError(oldPair);
      setError(null);
    },
    [pairs, updateAddress, clearError, setError],
  );

  const handleNetworkChange = useCallback(
    (index: number, value: string) => {
      const oldPair = pairs[index];
      updateNetwork(index, value);
      clearError(oldPair);
      setError(null);
    },
    [pairs, updateNetwork, clearError, setError],
  );

  const handleSave = useCallback(async () => {
    await save(pairs);
  }, [pairs, save]);

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
                    {pairs.map((pair, index) => (
                      <ContractAddressItem
                        key={index}
                        pair={pair}
                        index={index}
                        invalidContracts={invalidContracts}
                        canRemove={pairs.length > 1}
                        onNetworkChange={handleNetworkChange}
                        onAddressChange={handleAddressChange}
                        onRemove={handleRemovePair}
                        supportedNetworks={SUPPORTED_NETWORKS}
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
