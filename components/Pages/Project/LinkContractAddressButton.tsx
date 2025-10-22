"use client";

import { LinkIcon } from "@heroicons/react/24/outline";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import type { FC, ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Utilities/Button";
import { useContractAddressPairs } from "@/hooks/useContractAddressPairs";
import { useContractAddressSave } from "@/hooks/useContractAddressSave";
import { useContractAddressValidation } from "@/hooks/useContractAddressValidation";
import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import { ContractAddressDialog } from "./ContractAddressDialog";
import { ContractAddressList } from "./ContractAddressList";

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
      <ContractAddressDialog
        isOpen={isOpen}
        onClose={handleClose}
        title="Link Contract Addresses"
        description="Add one or more contract addresses for the project. This will enable the project to retrieve its on-chain metrics for impact tracking."
      >
        <ContractAddressList
          pairs={pairs}
          invalidContracts={invalidContracts}
          onNetworkChange={handleNetworkChange}
          onAddressChange={handleAddressChange}
          onRemove={handleRemovePair}
          onAdd={handleAddPair}
          supportedNetworks={SUPPORTED_NETWORKS}
          error={error}
        />
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
      </ContractAddressDialog>
    </>
  );
};
