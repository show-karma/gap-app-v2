"use client";

import { Dialog, Transition } from "@headlessui/react";
import { ExclamationTriangleIcon, LinkIcon } from "@heroicons/react/24/outline";
import type { FC } from "react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Utilities/Button";
import { SUPPORTED_CONTRACT_NETWORKS } from "@/constants/contract-networks";
import { useAuth } from "@/hooks/useAuth";
import { useContractAddressPairs } from "@/hooks/useContractAddressPairs";
import { useContractAddressSave } from "@/hooks/useContractAddressSave";
import { useContractAddressValidation } from "@/hooks/useContractAddressValidation";
import { validateNetworkAddressPair } from "@/schemas/contractAddress";
import { useIsCommunityAdmin } from "@/src/core/rbac/context/permission-context";
import { usePermissionsQuery } from "@/src/core/rbac/hooks/use-permissions";
import { Role } from "@/src/core/rbac/types";
import { useOwnerStore, useProjectStore } from "@/store";
import { ContractAddressDialog } from "./ContractAddressDialog";
import { ContractAddressList } from "./ContractAddressList";
import type { LinkContractAddressesButtonProps } from "./types";

export const LinkContractAddressButton: FC<LinkContractAddressesButtonProps> = ({
  project,
  buttonClassName,
  "data-link-contracts-button": dataAttr,
  buttonElement,
  onClose,
  readOnly: readOnlyProp,
}) => {
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isCommunityAdmin = useIsCommunityAdmin();
  const { authenticated } = useAuth();
  const { data: permissions } = usePermissionsQuery({}, { enabled: authenticated });
  const isSuperAdmin = permissions?.roles?.roles?.includes(Role.SUPER_ADMIN) ?? false;
  const isAuthorized = isOwner || isProjectOwner || isCommunityAdmin || isSuperAdmin;

  // Compute effective read-only mode: external prop OR lack of authorization
  const isReadOnly = readOnlyProp ?? !isAuthorized;
  const [isOpen, setIsOpen] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // Custom hooks for state and logic management
  const { pairs, addPair, removePair, updateAddress, updateNetwork } = useContractAddressPairs({
    project,
  });
  const { clearError } = useContractAddressValidation({
    projectUid: project.uid,
  });
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
    [pairs, removePair, clearError]
  );

  const handleAddressChange = useCallback(
    (index: number, value: string) => {
      const oldPair = pairs[index];
      updateAddress(index, value);
      clearError(oldPair);
      setError(null);
    },
    [pairs, updateAddress, clearError, setError]
  );

  const handleNetworkChange = useCallback(
    (index: number, value: string) => {
      const oldPair = pairs[index];
      updateNetwork(index, value);
      clearError(oldPair);
      setError(null);
    },
    [pairs, updateNetwork, clearError, setError]
  );

  const handleSave = useCallback(async () => {
    await save(pairs);
  }, [pairs, save]);

  // Detect unsaved changes (must be before handleClose)
  const hasUnsavedChanges = useMemo(() => {
    const projectNetworkAddresses = project?.external?.network_addresses || [];

    // Create a set of saved contract keys
    const savedKeys = new Set<string>();
    projectNetworkAddresses.forEach((entry: string) => {
      savedKeys.add(entry.toLowerCase());
    });

    // Check if there are any new or modified pairs
    const currentValidPairs = pairs.filter((pair) => pair.address.trim() && pair.network.trim());

    // If the number of valid pairs is different, there are changes
    if (currentValidPairs.length !== projectNetworkAddresses.length) {
      return true;
    }

    // Check if any current pair is not in saved pairs or has different values
    return currentValidPairs.some((pair) => {
      const key = `${pair.network}:${pair.address}`.toLowerCase();
      return !savedKeys.has(key);
    });
  }, [pairs, project?.external?.network_addresses]);

  // Define a function to handle dialog close
  const handleClose = useCallback(() => {
    // Skip unsaved changes check in read-only mode
    if (!isReadOnly && hasUnsavedChanges) {
      setShowUnsavedWarning(true);
      return;
    }

    setIsOpen(false);
    if (buttonElement === null && onClose) {
      onClose();
    }
  }, [isReadOnly, hasUnsavedChanges, buttonElement, onClose]);

  // Force close without checking for unsaved changes
  const handleForceClose = useCallback(() => {
    setShowUnsavedWarning(false);
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
    const allPairsEmpty = pairs.every((pair) => !pair.address.trim() && !pair.network.trim());

    return hasFormatErrors || hasBackendErrors || allPairsEmpty;
  }, [pairs, invalidContracts]);

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
        </Button>
      )}
      <ContractAddressDialog
        isOpen={isOpen}
        onClose={handleClose}
        title={isReadOnly ? "Contract Addresses" : "Link Contract Addresses"}
        description={
          isReadOnly
            ? "View the contract addresses linked to this project."
            : "Add one or more contract addresses for the project. This will enable the project to retrieve its on-chain metrics for impact tracking."
        }
      >
        <ContractAddressList
          pairs={pairs}
          invalidContracts={invalidContracts}
          onNetworkChange={handleNetworkChange}
          onAddressChange={handleAddressChange}
          onRemove={handleRemovePair}
          onAdd={handleAddPair}
          supportedNetworks={SUPPORTED_CONTRACT_NETWORKS}
          error={error}
          readOnly={isReadOnly}
        />
        <div className="flex flex-row gap-4 mt-10 justify-end">
          {!isReadOnly && (
            <Button
              onClick={handleSave}
              disabled={isLoading || hasValidationErrors}
              className="bg-brand-blue text-white hover:opacity-90"
            >
              {isLoading ? "Saving..." : "Save All"}
            </Button>
          )}
          <Button
            className="text-zinc-900 text-lg bg-transparent border-black border dark:text-zinc-100 dark:border-zinc-100 hover:bg-zinc-900 hover:text-white disabled:hover:bg-transparent disabled:hover:text-zinc-900"
            onClick={handleClose}
          >
            Close
          </Button>
        </div>
      </ContractAddressDialog>
      {/* Unsaved Changes Warning Dialog */}
      <Transition appear show={showUnsavedWarning} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowUnsavedWarning(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25 dark:bg-black/50" />
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-zinc-800 p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                    >
                      Unsaved Changes
                    </Dialog.Title>
                  </div>

                  <div className="mt-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      You have unsaved changes to contract addresses. If you close now, these
                      changes will be lost.
                    </p>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <Button
                      onClick={() => setShowUnsavedWarning(false)}
                      className="bg-brand-blue text-white hover:opacity-90"
                    >
                      Continue Editing
                    </Button>
                    <Button
                      onClick={handleForceClose}
                      className="text-zinc-900 text-lg bg-transparent border-black border dark:text-zinc-100 dark:border-zinc-100 hover:bg-zinc-900 hover:text-white"
                    >
                      Discard Changes
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
