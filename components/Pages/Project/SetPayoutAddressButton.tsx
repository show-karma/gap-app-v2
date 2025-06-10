"use client";

import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { useOwnerStore, useProjectStore } from "@/store";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { Dialog, Transition } from "@headlessui/react";
import { WalletIcon, CheckIcon } from "@heroicons/react/24/outline";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import type { FC, ReactNode } from "react";
import { Fragment, useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { isAddress } from "viem";
import debounce from "lodash.debounce";

interface SetPayoutAddressButtonProps {
  buttonClassName?: string;
  project: IProjectResponse & { payoutAddress?: string };
  "data-set-payout-button"?: string;
  buttonElement?: { text: string; icon: ReactNode; styleClass: string } | null;
  onClose?: () => void;
}

export const SetPayoutAddressButton: FC<SetPayoutAddressButtonProps> = ({
  project,
  buttonClassName,
  "data-set-payout-button": dataAttr,
  buttonElement,
  onClose,
}) => {
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const setProject = useProjectStore((state) => state.setProject);
  const isCommunityAdmin = useCommunityAdminStore(
    (state) => state.isCommunityAdmin
  );
  const isAuthorized = isOwner || isProjectOwner || isCommunityAdmin;
  const { address } = useAccount();

  const [isOpen, setIsOpen] = useState(false);
  const [payoutAddress, setPayoutAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValidated, setIsValidated] = useState(false);

  // Helper function for default error messages based on status code
  const getDefaultErrorMessage = (status: number): string => {
    switch (status) {
      case 400:
        return "Invalid request. Please check your input.";
      case 401:
        return "Authentication required.";
      case 403:
        return "Insufficient permissions - Project Admin access required.";
      case 422:
        return "Project not found.";
      default:
        return "An error occurred. Please try again.";
    }
  };

  // Auto open the dialog if buttonElement is null
  useEffect(() => {
    if (buttonElement === null) {
      setIsOpen(true);
    }
  }, [buttonElement]);

  // Reset modal state when opening and set default value from project
  useEffect(() => {
    if (isOpen) {
      // Reset form state when modal opens
      setError(null);
      setValidationError(null);
      
      // Set default value from project
      if (project?.payoutAddress) {
        setPayoutAddress(project.payoutAddress);
        setIsValidated(true);
      } else {
        setPayoutAddress("");
        setIsValidated(false);
      }
    }
  }, [isOpen, project?.payoutAddress]);

  // Also update if project payout address changes while modal is closed
  useEffect(() => {
    if (!isOpen && project?.payoutAddress !== payoutAddress) {
      if (project?.payoutAddress) {
        setPayoutAddress(project.payoutAddress);
        setIsValidated(true);
      } else {
        setPayoutAddress("");
        setIsValidated(false);
      }
    }
  }, [project?.payoutAddress, isOpen, payoutAddress]);

  const validatePayoutAddress = useCallback((address: string): boolean => {
    if (!address.trim()) {
      // Empty is valid (for removing payout address)
      setValidationError(null);
      setIsValidated(true);
      return true;
    }

    // Check exact format: must be exactly 42 characters including '0x' prefix
    if (address.length !== 42) {
      setValidationError(
        "Ethereum address must be exactly 42 characters including '0x' prefix"
      );
      setIsValidated(false);
      return false;
    }

    // Check if it starts with 0x
    if (!address.startsWith('0x')) {
      setValidationError(
        "Ethereum address must start with '0x'"
      );
      setIsValidated(false);
      return false;
    }

    // Check if the rest are hexadecimal characters
    const hexPart = address.slice(2);
    if (!/^[a-fA-F0-9]{40}$/.test(hexPart)) {
      setValidationError(
        "Ethereum address must contain only hexadecimal characters after '0x'"
      );
      setIsValidated(false);
      return false;
    }

    // Use viem's isAddress for final validation
    if (!isAddress(address)) {
      setValidationError(
        "Please enter a valid Ethereum address"
      );
      setIsValidated(false);
      return false;
    }

    // Clear any validation errors
    setValidationError(null);
    setIsValidated(true);
    return true;
  }, []);

  const debouncedValidate = useCallback(
    debounce((address: string) => {
      validatePayoutAddress(address);
    }, 300),
    [validatePayoutAddress]
  );

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedValidate.cancel();
    };
  }, [debouncedValidate]);

  const handleAddressChange = (value: string) => {
    setPayoutAddress(value);
    setError(null);
    
    // Clear validation state when user starts typing
    setIsValidated(false);
    setValidationError(null);
    
    // Trigger debounced validation
    debouncedValidate(value);
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);

    // Validate before saving
    if (!validatePayoutAddress(payoutAddress)) {
      setIsLoading(false);
      return;
    }

    try {
      const [data, error] = await fetchData(
        INDEXER.PROJECT.PAYOUT_ADDRESS.UPDATE(project.uid),
        "PATCH",
        {
          payoutAddress: payoutAddress.trim() || null,
        }
      );

      if (data) {
        // Show success message from API response
        toast.success(data.message || MESSAGES.PROJECT.PAYOUT_ADDRESS.SUCCESS);
        
        // Update project store with new payout address
        const updatedProject = { ...project, payoutAddress: payoutAddress.trim() || null };
        setProject(updatedProject);
        
        // Close modal
        setIsOpen(false);
        if (buttonElement === null && onClose) {
          onClose();
        }
      }

      if (error) {
        // Use the error message from the API, with fallbacks for different status codes
        const errorMessage = error.message || getDefaultErrorMessage(error.status);
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err) {
      // Only show errorManager for unexpected errors
      if (!error) {
        errorManager(
          MESSAGES.PROJECT.PAYOUT_ADDRESS.ERROR || "Error setting payout address",
          err,
          {
            projectUID: project.uid,
            payoutAddress: payoutAddress,
            address,
          },
          { error: "Failed to save payout address" }
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [data, error] = await fetchData(
        INDEXER.PROJECT.PAYOUT_ADDRESS.UPDATE(project.uid),
        "PATCH",
        {
          payoutAddress: null,
        }
      );

      if (data) {
        // Show success message from API response
        toast.success(data.message || "Payout address removed successfully");
        
        // Update project store to remove payout address
        const updatedProject = { ...project, payoutAddress: null };
        setProject(updatedProject);
        
        // Clear form
        setPayoutAddress("");
        setIsValidated(false);
        
        // Close modal
        setIsOpen(false);
        if (buttonElement === null && onClose) {
          onClose();
        }
      }

      if (error) {
        // Use the error message from the API, with fallbacks for different status codes
        const errorMessage = error.message || getDefaultErrorMessage(error.status);
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err) {
      // Only show errorManager for unexpected errors
      if (!error) {
        errorManager(
          "Error removing payout address",
          err,
          {
            projectUID: project.uid,
            address,
          },
          { error: "Failed to remove payout address" }
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

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
          data-set-payout-button={dataAttr}
        >
          <WalletIcon className={"mr-2 h-5 w-5"} aria-hidden="true" />
          {project?.payoutAddress ? "Manage Payout Address" : "Set Payout Address"}
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
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle transition-all ease-in-out duration-300">
                  <Dialog.Title
                    as="h3"
                    className="text-gray-900 dark:text-zinc-100"
                  >
                    <h2 className="text-2xl font-bold leading-6">
                      {project?.payoutAddress ? "Manage Payout Address" : "Set Payout Address"}
                    </h2>
                    <p className="text-md text-gray-500 dark:text-gray-400 mt-2">
                      {project?.payoutAddress 
                        ? "Update or remove the Ethereum address for receiving payouts for this project."
                        : "Set an Ethereum address to receive payouts for this project."
                      }
                    </p>
                    {project?.payoutAddress && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          <strong>Current Address:</strong> {project.payoutAddress}
                        </p>
                      </div>
                    )}
                  </Dialog.Title>
                  <div className="mt-8">
                    <div className="flex flex-col">
                      <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-zinc-700 rounded-lg">
                        <div className="flex items-center space-x-4 w-full">
                          <span className="text-md font-bold capitalize whitespace-nowrap">
                            Payout Address
                          </span>
                          <input
                            type="text"
                            value={payoutAddress}
                            onChange={(e) => handleAddressChange(e.target.value)}
                            className="text-sm rounded-md w-full text-gray-600 dark:text-gray-300 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
                            placeholder="0x1234567890abcdef1234567890abcdef12345678"
                          />
                        </div>
                        <div className="flex items-center">
                          {isValidated && payoutAddress.trim() && (
                            <div className="relative group">
                              <CheckIcon
                                className="h-9 w-10 text-green-500 p-2 mx-1 border border-green-500 rounded-md"
                                aria-label="Valid address"
                              />
                              <div className="absolute bottom-1/2 right-full transform translate-y-1/2 mr-2 px-3 py-1 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                Valid Ethereum address
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      {validationError && (
                        <p className="text-red-500 text-sm mt-1 ml-4">
                          {validationError}
                        </p>
                      )}
                    </div>
                    {error && (
                      <p className="text-red-500 text-sm mt-4">{error}</p>
                    )}
                  </div>
                  <div className="flex flex-row gap-4 mt-10 justify-end">
                    <Button
                      onClick={handleSave}
                      disabled={
                        isLoading ||
                        (payoutAddress.trim() && !isValidated) ||
                        validationError !== null
                      }
                      className="bg-primary-500 text-white hover:bg-primary-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isLoading ? "Saving..." : project?.payoutAddress ? "Update Payout Address" : "Set Payout Address"}
                    </Button>
                    {project?.payoutAddress && (
                      <Button
                        onClick={handleRemove}
                        disabled={isLoading}
                        className="bg-red-500 text-white hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {isLoading ? "Removing..." : "Remove Payout Address"}
                      </Button>
                    )}
                    <Button
                      className="text-zinc-900 text-lg bg-transparent border-black border dark:text-zinc-100 dark:border-zinc-100 hover:bg-zinc-900 hover:text-white"
                      onClick={handleClose}
                      type="button"
                    >
                      Cancel
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

// Add display name
SetPayoutAddressButton.displayName = "SetPayoutAddressButton"; 