"use client";

import { Dialog, Transition } from "@headlessui/react";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import debounce from "lodash.debounce";
import Image from "next/image";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { isAddress } from "viem";
import { errorManager } from "@/components/Utilities/errorManager";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/store";
import { PAYOUT_CHAINS } from "@/utilities/network";
import {
  hasConfiguredPayoutAddresses,
  useUpdateChainPayoutAddress,
} from "../hooks/use-chain-payout-address";
import type {
  ChainPayoutAddressFormEntry,
  SetChainPayoutAddressModalProps,
} from "../types/chain-payout-address";

/**
 * Modal for setting chain-specific payout addresses.
 * Shows all supported chains with input fields for wallet addresses.
 */
export function SetChainPayoutAddressModal({
  isOpen,
  onClose,
  projectId,
  currentAddresses,
  onSuccess,
}: SetChainPayoutAddressModalProps) {
  // Form state for each chain
  const [formEntries, setFormEntries] = useState<ChainPayoutAddressFormEntry[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  const hasExistingAddresses = hasConfiguredPayoutAddresses(currentAddresses);
  const refreshProject = useProjectStore((state) => state.refreshProject);

  // Initialize form entries from current addresses and supported chains
  useEffect(() => {
    if (isOpen) {
      const entries: ChainPayoutAddressFormEntry[] = PAYOUT_CHAINS.map((chain) => {
        const existingAddress = currentAddresses?.[String(chain.id)] || "";
        return {
          chainId: chain.id,
          chainName: chain.name,
          address: existingAddress,
          isEnabled: Boolean(existingAddress),
        };
      });
      setFormEntries(entries);
      setValidationErrors({});
      setError(null);
    }
  }, [isOpen, currentAddresses]);

  // Mutation hook
  const { mutate: updateAddresses, isPending: isLoading } = useUpdateChainPayoutAddress(projectId, {
    onSuccess: async (data) => {
      toast.success(
        hasExistingAddresses
          ? "Payout addresses updated successfully"
          : "Payout addresses configured successfully"
      );
      // Refresh the project store to get updated chainPayoutAddress
      await refreshProject();
      onSuccess?.(data || {});
      onClose();
    },
    onError: (err) => {
      const message = err.message || "Failed to update payout addresses";
      setError(message);
      errorManager("Error updating chain payout addresses", err, { projectId }, { error: message });
    },
  });

  // Validation function
  const validateAddress = useCallback((address: string): string | null => {
    if (!address.trim()) {
      return null; // Empty is valid (means disabled)
    }

    if (address.length !== 42) {
      return "Address must be 42 characters";
    }

    if (!address.startsWith("0x")) {
      return "Address must start with '0x'";
    }

    const hexPart = address.slice(2);
    if (!/^[a-fA-F0-9]{40}$/.test(hexPart)) {
      return "Invalid hexadecimal characters";
    }

    if (!isAddress(address)) {
      return "Invalid Ethereum address";
    }

    return null;
  }, []);

  // Debounced validation
  const debouncedValidate = useMemo(
    () =>
      debounce((chainId: number, address: string) => {
        const validationError = validateAddress(address);
        setValidationErrors((prev) => {
          if (validationError) {
            return { ...prev, [chainId]: validationError };
          }
          const { [chainId]: _, ...rest } = prev;
          return rest;
        });
      }, 300),
    [validateAddress]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedValidate.cancel();
    };
  }, [debouncedValidate]);

  // Handle address input change
  const handleAddressChange = useCallback(
    (chainId: number, value: string) => {
      setFormEntries((prev) =>
        prev.map((entry) =>
          entry.chainId === chainId
            ? { ...entry, address: value, isEnabled: Boolean(value.trim()) }
            : entry
        )
      );
      setError(null);
      debouncedValidate(chainId, value);
    },
    [debouncedValidate]
  );

  // Handle save
  const handleSave = useCallback(() => {
    // Validate all entries
    const errors: Record<number, string> = {};
    for (const entry of formEntries) {
      if (entry.address.trim()) {
        const validationError = validateAddress(entry.address);
        if (validationError) {
          errors[entry.chainId] = validationError;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Build the payload - only include chains with changes
    const payload: Record<string, string | null> = {};

    for (const entry of formEntries) {
      const currentValue = currentAddresses?.[String(entry.chainId)] || "";
      const newValue = entry.address.trim();

      // Only include if there's a change
      if (newValue !== currentValue) {
        payload[String(entry.chainId)] = newValue || null;
      }
    }

    // Don't call API if nothing changed
    if (Object.keys(payload).length === 0) {
      toast.success("No changes to save");
      onClose();
      return;
    }

    updateAddresses(payload);
  }, [formEntries, currentAddresses, validateAddress, updateAddresses, onClose]);

  // Check if form has any validation errors
  const hasErrors = Object.keys(validationErrors).length > 0;

  // Get chain icon URL from /images/networks/
  const getChainIconUrl = (chainId: number): string => {
    const chainIcons: Record<number, string> = {
      1: "/images/networks/ethereum.svg",
      10: "/images/networks/optimism.svg",
      137: "/images/networks/polygon.svg",
      42161: "/images/networks/arbitrum-one.svg",
      8453: "/images/networks/base.svg",
      42220: "/images/networks/celo.svg",
      1329: "/images/networks/sei.svg",
      1135: "/images/networks/lisk.svg",
      534352: "/images/networks/scroll.svg",
      // Testnets (use mainnet icons as fallback)
      11155111: "/images/networks/ethereum.svg", // Sepolia
      11155420: "/images/networks/optimism.svg", // Optimism Sepolia
      84532: "/images/networks/base.svg", // Base Sepolia
    };

    return chainIcons[chainId] || "/images/networks/ethereum.svg";
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-visible rounded-2xl dark:bg-zinc-800 bg-white p-4 sm:p-6 text-left align-middle transition-all ease-in-out duration-300">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title
                    as="h2"
                    className="text-gray-900 dark:text-zinc-100 text-xl font-bold leading-6"
                  >
                    {hasExistingAddresses ? "Manage Payout Addresses" : "Set Payout Addresses"}
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Error message - displayed at top */}
                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-600 border border-red-700">
                    <p className="text-white text-sm font-medium">{error}</p>
                  </div>
                )}

                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Configure wallet addresses to receive donations on each blockchain network. Leave
                  empty to disable donations on that chain.
                </p>

                {/* Chain list */}
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {formEntries.map((entry) => (
                    <div key={entry.chainId} className="flex flex-col gap-2">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-700 rounded-lg">
                        {/* Chain icon and name */}
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <div className="w-6 h-6 relative flex-shrink-0">
                            <Image
                              src={getChainIconUrl(entry.chainId)}
                              alt={entry.chainName}
                              width={24}
                              height={24}
                              className="rounded-full"
                              onError={(e) => {
                                // Fallback to a colored circle if image fails
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          </div>
                          <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                            {entry.chainName}
                          </span>
                        </div>

                        {/* Address input */}
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={entry.address}
                            onChange={(e) => handleAddressChange(entry.chainId, e.target.value)}
                            className="flex-1 text-sm rounded-md px-3 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-zinc-600 border border-gray-300 dark:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0x..."
                          />
                          {entry.address.trim() && !validationErrors[entry.chainId] && (
                            <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                      {validationErrors[entry.chainId] && (
                        <p className="text-red-500 text-xs ml-2">
                          {validationErrors[entry.chainId]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 mt-6 justify-end">
                  <Button
                    variant="secondary"
                    onClick={onClose}
                    disabled={isLoading}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isLoading || hasErrors}
                    className="w-full sm:w-auto"
                  >
                    {isLoading ? "Saving..." : hasExistingAddresses ? "Update" : "Save"}
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

SetChainPayoutAddressModal.displayName = "SetChainPayoutAddressModal";
