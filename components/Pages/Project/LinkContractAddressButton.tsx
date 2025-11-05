"use client";

import { LinkIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import type { FC } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Utilities/Button";
import { useContractAddressPairs } from "@/hooks/useContractAddressPairs";
import { useContractAddressSave } from "@/hooks/useContractAddressSave";
import { useContractAddressValidation } from "@/hooks/useContractAddressValidation";
import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import { SUPPORTED_CONTRACT_NETWORKS } from "@/constants/contract-networks";
import { validateNetworkAddressPair } from "@/schemas/contractAddress";
import { ContractAddressDialog } from "./ContractAddressDialog";
import { ContractAddressList } from "./ContractAddressList";
import { ContractVerificationDialog } from "./ContractVerificationDialog";
import type { LinkContractAddressesButtonProps } from "./types";

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
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [contractToVerify, setContractToVerify] = useState<{
    index: number;
    network: string;
    address: string;
  } | null>(null);

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

  const handleVerify = useCallback(
    (index: number) => {
      const pair = pairs[index];
      if (pair && pair.network && pair.address) {
        setContractToVerify({
          index,
          network: pair.network,
          address: pair.address,
        });
        setVerificationDialogOpen(true);
      }
    },
    [pairs]
  );

  const handleVerificationSuccess = useCallback(() => {
    // Refresh project data to get updated verification status
    window.location.reload();
  }, []);

  // Define a function to handle dialog close
  const handleClose = useCallback(() => {
    setIsOpen(false);
    if (buttonElement === null && onClose) {
      onClose();
    }
  }, [buttonElement, onClose]);

  // Check if there are any validation errors or incomplete pairs
  const hasValidationErrors = useMemo(() => {
    // Check if there are any pairs with invalid formats
    const hasFormatErrors = pairs.some((pair) => {
      // Skip empty pairs (they will be filtered out on save)
      if (!pair.address.trim() && !pair.network.trim()) {
        return false;
      }

      // Check if either field is missing
      if (!pair.network.trim() || !pair.address.trim()) {
        return true;
      }

      // Validate the format
      const validation = validateNetworkAddressPair(pair.network, pair.address);
      return !validation.isValid;
    });

    // Check if there are backend validation errors
    const hasBackendErrors = invalidContracts.size > 0;

    // Check if all pairs are empty (at least one valid pair required)
    const allPairsEmpty = pairs.every(
      (pair) => !pair.address.trim() && !pair.network.trim()
    );

    return hasFormatErrors || hasBackendErrors || allPairsEmpty;
  }, [pairs, invalidContracts]);

  // Count unverified contracts
  const unverifiedCount = useMemo(() => {
    return pairs.filter(
      (pair) =>
        pair.address.trim() &&
        pair.network.trim() &&
        !pair.verified
    ).length;
  }, [pairs]);

  if (!isAuthorized) {
    return null;
  }

  return (
    <>
      {buttonElement !== null && (
        <Button
          onClick={() => setIsOpen(true)}
          className={`${buttonClassName} relative`}
          data-link-contracts-button={dataAttr}
        >
          <LinkIcon className={"mr-2 h-5 w-5"} aria-hidden="true" />
          Link Contracts
          {unverifiedCount > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              <ExclamationTriangleIcon className="h-3 w-3" />
              {unverifiedCount} Unverified
            </span>
          )}
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
          onVerify={handleVerify}
          supportedNetworks={SUPPORTED_CONTRACT_NETWORKS}
          error={error}
        />
        <div className="flex flex-row gap-4 mt-10 justify-end">
          <Button
            onClick={handleSave}
            disabled={isLoading || hasValidationErrors}
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
      {contractToVerify && (
        <ContractVerificationDialog
          isOpen={verificationDialogOpen}
          onClose={() => {
            setVerificationDialogOpen(false);
            setContractToVerify(null);
          }}
          network={contractToVerify.network}
          contractAddress={contractToVerify.address}
          projectUid={project.uid}
          onSuccess={handleVerificationSuccess}
        />
      )}
    </>
  );
};
