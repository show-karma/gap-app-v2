"use client";

import { Button } from "@/components/ui/button";
import { errorManager } from "@/lib/utils/error-manager";
import { useProjectStore } from "@/features/projects/lib/store";
import { useOwnerStore } from "@/features/contract-owner/lib/owner";
import { useCommunityAdminStore } from "@/features/communities/lib/community-admin-store";
import { fetchData } from "@/lib/utils/fetch-data";
import { INDEXER } from "@/services/indexer";
import { MESSAGES } from "@/config/messages";
import { Dialog, Transition } from "@headlessui/react";
import {
  CurrencyDollarIcon,
  CheckIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import type { FC, ReactNode } from "react";
import { Fragment, useEffect, useState, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { isAddress } from "viem";
import debounce from "lodash.debounce";

// Updated interface to handle new JSON payoutAddress structure
interface SetPayoutAddressButtonProps {
  buttonClassName?: string;
  project: IProjectResponse & {
    payoutAddress?: string | { [communityUID: string]: string };
  };
  "data-set-payout-button"?: string;
  buttonElement?: { text: string; icon: ReactNode; styleClass: string } | null;
  onClose?: () => void;
}

// Community option interface for dropdown
interface CommunityOption {
  uid: string;
  name: string;
  imageURL?: string;
  currentPayoutAddress?: string;
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
  const [selectedCommunity, setSelectedCommunity] =
    useState<CommunityOption | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValidated, setIsValidated] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Get communities where this project has grants
  const communities: CommunityOption[] = useMemo(() => {
    if (!project?.grants) return [];

    const communityMap = new Map<string, CommunityOption>();

    project.grants.forEach((grant) => {
      if (grant.community?.uid) {
        const communityUID = grant.community.uid;
        const payoutAddresses =
          typeof project.payoutAddress === "object" && project.payoutAddress
            ? (project.payoutAddress as { [key: string]: string })
            : {};

        communityMap.set(communityUID, {
          uid: communityUID,
          name: grant.community.details?.data?.name || "Unknown Community",
          imageURL: grant.community.details?.data?.imageURL,
          currentPayoutAddress: payoutAddresses[communityUID],
        });
      }
    });

    return Array.from(communityMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [project?.grants, project?.payoutAddress]);

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

  // Reset modal state when opening and set default values
  useEffect(() => {
    if (isOpen) {
      // Reset form state when modal opens
      setError(null);
      setValidationError(null);
      setShowDropdown(false);

      // Auto-select first community if only one exists
      if (communities.length === 1) {
        const community = communities[0];
        setSelectedCommunity(community);
        setPayoutAddress(community.currentPayoutAddress || "");
        setIsValidated(!!community.currentPayoutAddress);
      } else {
        // Reset selections if multiple communities
        setSelectedCommunity(null);
        setPayoutAddress("");
        setIsValidated(false);
      }
    }
  }, [isOpen, communities]);

  // Update payout address when community selection changes
  useEffect(() => {
    if (selectedCommunity) {
      const currentAddress = selectedCommunity.currentPayoutAddress || "";
      setPayoutAddress(currentAddress);
      setIsValidated(!!currentAddress);
      setValidationError(null);
      setError(null);
    }
  }, [selectedCommunity]);

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
    if (!address.startsWith("0x")) {
      setValidationError("Ethereum address must start with '0x'");
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
      setValidationError("Please enter a valid Ethereum address");
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
    if (!selectedCommunity) {
      setError("Please select a community first");
      return;
    }

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
          communityUID: selectedCommunity.uid,
        }
      );

      if (data) {
        // Show success message from API response
        toast.success(data.message || MESSAGES.PROJECT.PAYOUT_ADDRESS.SUCCESS);

        // Update project store with new payout address structure
        const currentPayoutAddresses =
          typeof project.payoutAddress === "object" && project.payoutAddress
            ? { ...(project.payoutAddress as { [key: string]: string }) }
            : ({} as { [key: string]: string });

        if (payoutAddress.trim()) {
          currentPayoutAddresses[selectedCommunity.uid] = payoutAddress.trim();
        } else {
          delete currentPayoutAddresses[selectedCommunity.uid];
        }

        const updatedProject = {
          ...project,
          payoutAddress: currentPayoutAddresses,
        };
        setProject(updatedProject as any);

        // Update selected community's current address
        setSelectedCommunity({
          ...selectedCommunity,
          currentPayoutAddress: payoutAddress.trim() || undefined,
        });

        // Close modal
        setIsOpen(false);
        if (buttonElement === null && onClose) {
          onClose();
        }
      }

      if (error) {
        // Use the error message from the API, with fallbacks for different status codes
        const errorMessage =
          error.message || getDefaultErrorMessage(error.status);
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err) {
      // Only show errorManager for unexpected errors
      if (!error) {
        errorManager(
          MESSAGES.PROJECT.PAYOUT_ADDRESS.ERROR ||
            "Error setting payout address",
          err,
          {
            projectUID: project.uid,
            payoutAddress: payoutAddress,
            communityUID: selectedCommunity.uid,
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
    if (!selectedCommunity) {
      setError("Please select a community first");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [data, error] = await fetchData(
        INDEXER.PROJECT.PAYOUT_ADDRESS.UPDATE(project.uid),
        "PATCH",
        {
          payoutAddress: null,
          communityUID: selectedCommunity.uid,
        }
      );

      if (data) {
        // Show success message from API response
        toast.success(data.message || "Payout address removed successfully");

        // Update project store to remove payout address for this community
        const currentPayoutAddresses =
          typeof project.payoutAddress === "object" && project.payoutAddress
            ? { ...(project.payoutAddress as { [key: string]: string }) }
            : {};

        delete currentPayoutAddresses[selectedCommunity.uid];

        const updatedProject = {
          ...project,
          payoutAddress:
            Object.keys(currentPayoutAddresses).length > 0
              ? currentPayoutAddresses
              : undefined,
        };
        setProject(updatedProject as any);

        // Clear form and update selected community
        setPayoutAddress("");
        setIsValidated(false);
        setSelectedCommunity({
          ...selectedCommunity,
          currentPayoutAddress: undefined,
        });

        // Close modal
        setIsOpen(false);
        if (buttonElement === null && onClose) {
          onClose();
        }
      }

      if (error) {
        // Use the error message from the API, with fallbacks for different status codes
        const errorMessage =
          error.message || getDefaultErrorMessage(error.status);
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
            communityUID: selectedCommunity.uid,
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

  // Check if project has any payout addresses
  const hasAnyPayoutAddress = useMemo(() => {
    if (typeof project?.payoutAddress === "string") {
      return !!project.payoutAddress;
    }
    if (typeof project?.payoutAddress === "object" && project.payoutAddress) {
      return Object.keys(project.payoutAddress).length > 0;
    }
    return false;
  }, [project?.payoutAddress]);

  if (!isAuthorized) {
    return null;
  }

  // Don't show if no communities with grants
  if (communities.length === 0) {
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
          <CurrencyDollarIcon className={"mr-2 h-5 w-5"} aria-hidden="true" />
          {hasAnyPayoutAddress ? "Manage Payout Address" : "Set Payout Address"}
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
                <Dialog.Panel className="w-full max-w-2xl transform overflow-visible rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle transition-all ease-in-out duration-300">
                  <Dialog.Title
                    as="h2"
                    className="text-gray-900 dark:text-zinc-100 text-2xl font-bold leading-6"
                  >
                    {hasAnyPayoutAddress
                      ? "Manage Payout Address"
                      : "Set Payout Address"}
                  </Dialog.Title>
                  <p className="text-md text-gray-500 dark:text-gray-400 mt-2">
                    {hasAnyPayoutAddress
                      ? "Update or remove the Ethereum address for receiving payouts for this project in specific communities."
                      : "Set an Ethereum address to receive payouts for this project in specific communities."}
                  </p>

                  <div className="mt-8">
                    {/* Community Selection */}
                    <div className="flex flex-col gap-4">
                      <div className="relative">
                        <label className="text-md font-bold text-gray-900 dark:text-zinc-100 mb-2 block">
                          Select Community
                        </label>
                        <div
                          className="flex items-center justify-between p-3 bg-gray-100 dark:bg-zinc-700 rounded-lg cursor-pointer border border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                          onClick={() => setShowDropdown(!showDropdown)}
                        >
                          <div className="flex items-center space-x-3">
                            {selectedCommunity ? (
                              <>
                                {selectedCommunity.imageURL && (
                                  <img
                                    src={selectedCommunity.imageURL}
                                    alt={selectedCommunity.name}
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                )}
                                <div className="flex flex-col">
                                  <span className="text-gray-900 dark:text-gray-100 font-medium">
                                    {selectedCommunity.name}
                                  </span>
                                  {selectedCommunity.currentPayoutAddress && (
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                      Current:{" "}
                                      {selectedCommunity.currentPayoutAddress}
                                    </span>
                                  )}
                                </div>
                              </>
                            ) : (
                              <span className="text-gray-500 dark:text-gray-400">
                                Select a community...
                              </span>
                            )}
                          </div>
                          <ChevronDownIcon
                            className={`h-5 w-5 text-gray-400 transition-transform ${
                              showDropdown ? "rotate-180" : ""
                            }`}
                          />
                        </div>

                        {/* Dropdown */}
                        {showDropdown && (
                          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {communities.map((community) => (
                              <div
                                key={community.uid}
                                className="flex items-center space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-zinc-600 cursor-pointer transition-colors"
                                onClick={() => {
                                  setSelectedCommunity(community);
                                  setShowDropdown(false);
                                }}
                              >
                                {community.imageURL && (
                                  <img
                                    src={community.imageURL}
                                    alt={community.name}
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                )}
                                <div className="flex flex-col flex-1">
                                  <span className="text-gray-900 dark:text-gray-100 font-medium">
                                    {community.name}
                                  </span>
                                  {community.currentPayoutAddress ? (
                                    <span className="text-sm text-green-600 dark:text-green-400">
                                      ✓ {community.currentPayoutAddress}
                                    </span>
                                  ) : (
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                      No payout address set
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Payout Address Input - only show when community is selected */}
                      {selectedCommunity && (
                        <div className="flex flex-col">
                          <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-zinc-700 rounded-lg">
                            <div className="flex items-center space-x-4 w-full">
                              <span className="text-md font-bold capitalize whitespace-nowrap">
                                Payout Address
                              </span>
                              <input
                                type="text"
                                value={payoutAddress}
                                onChange={(e) =>
                                  handleAddressChange(e.target.value)
                                }
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
                        !selectedCommunity ||
                        (payoutAddress.trim() && !isValidated) ||
                        validationError !== null
                      }
                      className="bg-primary-500 text-white hover:bg-primary-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isLoading
                        ? "Saving..."
                        : selectedCommunity?.currentPayoutAddress
                        ? "Update Payout Address"
                        : "Set Payout Address"}
                    </Button>
                    {selectedCommunity?.currentPayoutAddress && (
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

export default SetPayoutAddressButton;
