"use client";

import { Dialog, Transition } from "@headlessui/react";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { formatUnits, isAddress, parseUnits } from "viem";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import {
  getAvailableNetworks,
  getNativeTokenSymbol,
  NETWORKS,
  type SupportedChainId,
  TOKEN_ADDRESSES,
} from "@/config/tokens";
import { envVars } from "@/utilities/enviromentVars";
import { sanitizeNumericInput } from "@/utilities/validation";
import {
  useGrantMilestones,
  usePayoutConfigByGrant,
  useSavePayoutConfig,
} from "../hooks/use-payout-disbursement";
import type {
  MilestoneAllocation,
  MilestoneInfo,
  PayoutConfigItem,
  PayoutGrantConfig,
} from "../types/payout-disbursement";

export interface PayoutConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  grantUID: string;
  projectUID: string;
  communityUID: string;
  grantName: string;
  projectName: string;
  /** Existing config if editing */
  existingConfig?: PayoutGrantConfig | null;
  onSuccess?: () => void;
}

/** Token type selection */
type TokenType = "usdc" | "native" | "custom";

/** Get available networks based on environment */
const getSupportedNetworks = () => getAvailableNetworks(envVars.isDev);

/** Token decimals by type - USDC uses 6 decimals, native tokens use 18 */
const TOKEN_DECIMALS: Record<TokenType, number> = {
  usdc: 6,
  native: 18,
  custom: 18, // Default to 18 for custom tokens
};

export function PayoutConfigurationModal({
  isOpen,
  onClose,
  grantUID,
  projectUID,
  communityUID,
  grantName,
  projectName,
  existingConfig,
  onSuccess,
}: PayoutConfigurationModalProps) {
  // Fetch existing config if not provided
  const { data: fetchedConfig, isLoading: isLoadingConfig } = usePayoutConfigByGrant(grantUID, {
    enabled: isOpen && !existingConfig,
  });

  // Fetch grant milestones
  const { data: fetchedMilestones = [], isLoading: isLoadingMilestones } = useGrantMilestones(
    projectUID,
    grantUID,
    { enabled: isOpen }
  );

  // Convert fetched milestones to MilestoneInfo format
  const milestones: MilestoneInfo[] = useMemo(
    () =>
      fetchedMilestones.map((m) => ({
        uid: m.uid,
        title: m.title,
      })),
    [fetchedMilestones]
  );

  const currentConfig = existingConfig ?? fetchedConfig;

  // Form state
  const [payoutAddress, setPayoutAddress] = useState("");
  const [totalGrantAmount, setTotalGrantAmount] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState<SupportedChainId>(10);
  const [tokenType, setTokenType] = useState<TokenType>("usdc");
  const [customTokenAddress, setCustomTokenAddress] = useState("");
  const [milestoneAllocations, setMilestoneAllocations] = useState<MilestoneAllocation[]>([]);

  // Validation state
  const [addressError, setAddressError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [tokenAddressError, setTokenAddressError] = useState<string | null>(null);
  const [allocationErrors, setAllocationErrors] = useState<Record<string, string>>({});

  // Computed token values
  const selectedTokenSymbol = useMemo(() => {
    if (tokenType === "usdc") return "USDC";
    if (tokenType === "native") return getNativeTokenSymbol(selectedNetwork);
    return "Custom";
  }, [tokenType, selectedNetwork]);

  const selectedTokenAddress = useMemo(() => {
    if (tokenType === "usdc") {
      return TOKEN_ADDRESSES.usdc[selectedNetwork as keyof typeof TOKEN_ADDRESSES.usdc] || "";
    }
    if (tokenType === "custom") {
      return customTokenAddress;
    }
    return ""; // Native token has no address
  }, [tokenType, selectedNetwork, customTokenAddress]);

  const selectedNetworkName = useMemo(() => {
    return NETWORKS[selectedNetwork]?.name || `Chain ${selectedNetwork}`;
  }, [selectedNetwork]);

  // Get token decimals based on selected token type
  const selectedTokenDecimals = useMemo(() => {
    return TOKEN_DECIMALS[tokenType];
  }, [tokenType]);

  /**
   * Generate milestone allocations from grant milestones.
   * Structure: First payment, Milestone 1, 2, 3..., Final payment
   */
  const generateAllocationsFromMilestones = useCallback(
    (existingAllocations?: MilestoneAllocation[] | null): MilestoneAllocation[] => {
      const allocations: MilestoneAllocation[] = [];

      // First payment allocation - find existing by label since we can't use fixed IDs
      const existingFirst = existingAllocations?.find((a) => a.label === "First payment");
      allocations.push({
        id: existingFirst?.id || crypto.randomUUID(),
        label: "First payment",
        amount: existingFirst?.amount || "",
      });

      // Milestone allocations from grant milestones
      milestones.forEach((milestone, index) => {
        const existingMilestone = existingAllocations?.find(
          (a) => a.milestoneUID === milestone.uid
        );
        allocations.push({
          id: existingMilestone?.id || crypto.randomUUID(),
          milestoneUID: milestone.uid,
          label: milestone.title || `Milestone ${index + 1}`,
          amount: existingMilestone?.amount || "",
        });
      });

      // Final payment allocation - find existing by label
      const existingFinal = existingAllocations?.find((a) => a.label === "Final payment");
      allocations.push({
        id: existingFinal?.id || crypto.randomUUID(),
        label: "Final payment",
        amount: existingFinal?.amount || "",
      });

      return allocations;
    },
    [milestones]
  );

  // Save mutation
  const saveConfigMutation = useSavePayoutConfig({
    onSuccess: () => {
      toast.success("Payout configuration saved successfully");
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to save configuration: ${error.message}`);
    },
  });

  // Initialize form from existing config
  useEffect(() => {
    if (isOpen && currentConfig) {
      setPayoutAddress(currentConfig.payoutAddress || "");

      // Determine token type from token address first (needed for decimals)
      let detectedTokenType: TokenType = "usdc";
      if (currentConfig.tokenAddress) {
        const usdcAddresses = Object.values(TOKEN_ADDRESSES.usdc) as string[];
        if (usdcAddresses.includes(currentConfig.tokenAddress)) {
          detectedTokenType = "usdc";
        } else {
          detectedTokenType = "custom";
          setCustomTokenAddress(currentConfig.tokenAddress);
        }
      }
      setTokenType(detectedTokenType);

      if (currentConfig.chainId) {
        setSelectedNetwork(currentConfig.chainId as SupportedChainId);
      }

      // Convert totalGrantAmount from smallest units to human-readable
      const decimals = TOKEN_DECIMALS[detectedTokenType];
      if (currentConfig.totalGrantAmount) {
        try {
          const humanReadable = formatUnits(BigInt(currentConfig.totalGrantAmount), decimals);
          setTotalGrantAmount(humanReadable);
        } catch {
          // If conversion fails, use the raw value (might already be human-readable from old data)
          setTotalGrantAmount(currentConfig.totalGrantAmount);
        }
      } else {
        setTotalGrantAmount("");
      }

      // Convert allocation amounts from smallest units to human-readable
      if (currentConfig.milestoneAllocations && currentConfig.milestoneAllocations.length > 0) {
        const convertedAllocations = currentConfig.milestoneAllocations.map((alloc) => {
          if (!alloc.amount) return alloc;
          try {
            const humanReadable = formatUnits(BigInt(alloc.amount), decimals);
            return { ...alloc, amount: humanReadable };
          } catch {
            // If conversion fails, use the raw value
            return alloc;
          }
        });
        setMilestoneAllocations(convertedAllocations);
      } else {
        setMilestoneAllocations(generateAllocationsFromMilestones(null));
      }
    } else if (isOpen && !currentConfig && !isLoadingConfig && !isLoadingMilestones) {
      // No existing config, generate fresh allocations
      setMilestoneAllocations(generateAllocationsFromMilestones(null));
    }
  }, [
    isOpen,
    currentConfig,
    isLoadingConfig,
    isLoadingMilestones,
    generateAllocationsFromMilestones,
  ]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPayoutAddress("");
      setTotalGrantAmount("");
      setSelectedNetwork(10);
      setTokenType("usdc");
      setCustomTokenAddress("");
      setMilestoneAllocations([]);
      setAddressError(null);
      setAmountError(null);
      setTokenAddressError(null);
      setAllocationErrors({});
    }
  }, [isOpen]);

  // Calculate allocation sum
  const allocationSum = useMemo(() => {
    return milestoneAllocations.reduce((sum, alloc) => {
      const amount = parseFloat(alloc.amount) || 0;
      return sum + amount;
    }, 0);
  }, [milestoneAllocations]);

  const totalAmount = parseFloat(totalGrantAmount) || 0;

  // Validation functions
  const validateAddress = useCallback((address: string): boolean => {
    if (!address) {
      setAddressError(null);
      return true; // Optional field
    }
    if (!isAddress(address)) {
      setAddressError("Invalid Ethereum address");
      return false;
    }
    setAddressError(null);
    return true;
  }, []);

  const validateAmount = useCallback((amount: string): boolean => {
    if (!amount) {
      setAmountError(null);
      return true; // Optional field
    }
    const num = parseFloat(amount);
    if (isNaN(num) || num < 0) {
      setAmountError("Amount must be a non-negative number");
      return false;
    }
    setAmountError(null);
    return true;
  }, []);

  const validateTokenAddress = useCallback(
    (address: string): boolean => {
      if (tokenType !== "custom") {
        setTokenAddressError(null);
        return true;
      }
      if (!address) {
        setTokenAddressError("Token address is required for custom token");
        return false;
      }
      if (!isAddress(address)) {
        setTokenAddressError("Invalid token address");
        return false;
      }
      setTokenAddressError(null);
      return true;
    },
    [tokenType]
  );

  const validateAllocations = useCallback((): boolean => {
    if (milestoneAllocations.length === 0) {
      setAllocationErrors({});
      return true;
    }

    const errors: Record<string, string> = {};
    let hasErrors = false;

    for (const alloc of milestoneAllocations) {
      const amount = parseFloat(alloc.amount) || 0;
      // Allow 0 amounts (user wants to skip this payment), but not negative
      if (amount < 0) {
        errors[alloc.id] = "Amount cannot be negative";
        hasErrors = true;
      }
    }

    // Check sum matches total if total is set
    if (totalAmount > 0 && Math.abs(allocationSum - totalAmount) > 0.01) {
      errors["_sum"] =
        `Allocations must sum to ${totalAmount.toLocaleString()} (current: ${allocationSum.toLocaleString()})`;
      hasErrors = true;
    }

    setAllocationErrors(errors);
    return !hasErrors;
  }, [milestoneAllocations, totalAmount, allocationSum]);

  // Handle updating allocation amount
  const handleUpdateAllocationAmount = (id: string, amount: string) => {
    setMilestoneAllocations((prev) =>
      prev.map((alloc) => (alloc.id === id ? { ...alloc, amount } : alloc))
    );
    // Clear error for this allocation
    setAllocationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[id];
      delete newErrors["_sum"];
      return newErrors;
    });
  };

  // Handle form submission
  const handleSave = async () => {
    // Validate all fields
    const isAddressValid = validateAddress(payoutAddress);
    const isAmountValid = validateAmount(totalGrantAmount);
    const isTokenAddressValid = validateTokenAddress(customTokenAddress);
    const areAllocationsValid = validateAllocations();

    if (!isAddressValid || !isAmountValid || !isTokenAddressValid || !areAllocationsValid) {
      return;
    }

    // Convert totalGrantAmount from human-readable to smallest units
    let totalGrantAmountInSmallestUnit: string | null = null;
    if (totalGrantAmount) {
      try {
        totalGrantAmountInSmallestUnit = parseUnits(
          totalGrantAmount,
          selectedTokenDecimals
        ).toString();
      } catch {
        toast.error("Invalid total grant amount format");
        return;
      }
    }

    // Convert milestone allocation amounts from human-readable to smallest units
    let convertedAllocations: MilestoneAllocation[] | null = null;
    if (milestoneAllocations.length > 0) {
      try {
        convertedAllocations = milestoneAllocations.map((alloc) => {
          if (!alloc.amount || alloc.amount === "0" || alloc.amount === "") {
            return { ...alloc, amount: "0" };
          }
          const amountInSmallestUnit = parseUnits(alloc.amount, selectedTokenDecimals).toString();
          return { ...alloc, amount: amountInSmallestUnit };
        });
      } catch {
        toast.error("Invalid allocation amount format");
        return;
      }
    }

    const configItem: PayoutConfigItem = {
      grantUID,
      projectUID,
      payoutAddress: payoutAddress || null,
      totalGrantAmount: totalGrantAmountInSmallestUnit,
      tokenAddress: selectedTokenAddress || null,
      chainId: selectedNetwork,
      milestoneAllocations: convertedAllocations,
    };

    await saveConfigMutation.mutateAsync({
      communityUID,
      configs: [configItem],
    });
  };

  const hasAllocationsError = Object.keys(allocationErrors).length > 0;
  const isSaving = saveConfigMutation.isPending;

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
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-white dark:bg-zinc-800 p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <Dialog.Title
                      as="h3"
                      className="text-xl font-semibold text-gray-900 dark:text-white"
                    >
                      Configure Payout
                    </Dialog.Title>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {projectName.length > 50 ? `${projectName.slice(0, 50)}...` : projectName} -{" "}
                      {grantName}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    aria-label="Close payout configuration"
                    className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {isLoadingConfig || isLoadingMilestones ? (
                  <div className="flex items-center justify-center py-12">
                    <Spinner className="w-8 h-8" />
                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                      Loading configuration...
                    </span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Payout Address */}
                    <div>
                      <label
                        htmlFor="payout-address"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                      >
                        Payout Address
                      </label>
                      <input
                        id="payout-address"
                        type="text"
                        value={payoutAddress}
                        onChange={(e) => {
                          setPayoutAddress(e.target.value);
                          setAddressError(null);
                        }}
                        onBlur={() => validateAddress(payoutAddress)}
                        placeholder="0x..."
                        className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-zinc-700 text-gray-900 dark:text-white font-mono text-sm ${
                          addressError
                            ? "border-red-500 dark:border-red-500"
                            : "border-gray-300 dark:border-zinc-600"
                        }`}
                      />
                      {addressError && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {addressError}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        The wallet address that will receive the payout
                      </p>
                    </div>

                    {/* Network & Token Selection */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="config-network"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                        >
                          Network
                        </label>
                        <select
                          id="config-network"
                          value={selectedNetwork}
                          onChange={(e) =>
                            setSelectedNetwork(Number(e.target.value) as SupportedChainId)
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                        >
                          {getSupportedNetworks().map((network) => (
                            <option key={network.id} value={network.id}>
                              {network.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor="config-token"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                        >
                          Token
                        </label>
                        <select
                          id="config-token"
                          value={tokenType}
                          onChange={(e) => setTokenType(e.target.value as TokenType)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                        >
                          <option value="usdc">USDC</option>
                          <option value="native">
                            {getNativeTokenSymbol(selectedNetwork)} (Native)
                          </option>
                          <option value="custom">Custom Token</option>
                        </select>
                      </div>
                    </div>

                    {/* Custom Token Address */}
                    {tokenType === "custom" && (
                      <div>
                        <label
                          htmlFor="custom-token-address"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                        >
                          Custom Token Address
                        </label>
                        <input
                          id="custom-token-address"
                          type="text"
                          value={customTokenAddress}
                          onChange={(e) => {
                            setCustomTokenAddress(e.target.value);
                            setTokenAddressError(null);
                          }}
                          onBlur={() => validateTokenAddress(customTokenAddress)}
                          placeholder="0x..."
                          className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-zinc-700 text-gray-900 dark:text-white font-mono text-sm ${
                            tokenAddressError
                              ? "border-red-500 dark:border-red-500"
                              : "border-gray-300 dark:border-zinc-600"
                          }`}
                        />
                        {tokenAddressError && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                            {tokenAddressError}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Total Grant Amount */}
                    <div>
                      <label
                        htmlFor="total-grant-amount"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                      >
                        Total Grant Amount
                      </label>
                      <div className="relative">
                        <input
                          id="total-grant-amount"
                          type="text"
                          value={totalGrantAmount}
                          onChange={(e) => {
                            setTotalGrantAmount(sanitizeNumericInput(e.target.value));
                            setAmountError(null);
                          }}
                          onBlur={() => validateAmount(totalGrantAmount)}
                          placeholder="0"
                          className={`w-full px-3 py-2 pr-16 border rounded-md bg-white dark:bg-zinc-700 text-gray-900 dark:text-white text-lg font-semibold ${
                            amountError
                              ? "border-red-500 dark:border-red-500"
                              : "border-gray-300 dark:border-zinc-600"
                          }`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                          {selectedTokenSymbol}
                        </span>
                      </div>
                      {amountError && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{amountError}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        The total approved amount for this grant
                      </p>
                    </div>

                    {/* Milestone Allocations */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Payment Allocations
                        </span>
                        <div className="group relative">
                          <InformationCircleIcon className="h-4 w-4 text-gray-400 cursor-help" />
                          <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                            <p>
                              Allocate the total grant amount across payments. The sum must equal
                              the total grant amount. Set amount to 0 for payments you want to skip.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {milestoneAllocations.map((alloc) => {
                          const isFirstPayment = alloc.label === "First payment";
                          const isFinalPayment = alloc.label === "Final payment";
                          const isMilestone = !isFirstPayment && !isFinalPayment;

                          return (
                            <div
                              key={alloc.id}
                              className={`flex items-center gap-3 p-3 rounded-lg ${
                                allocationErrors[alloc.id]
                                  ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                                  : isFirstPayment || isFinalPayment
                                    ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                                    : "bg-gray-50 dark:bg-zinc-700/50"
                              }`}
                            >
                              <div className="flex-1">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {alloc.label}
                                </span>
                                {isMilestone && alloc.milestoneUID && (
                                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                    (linked to milestone)
                                  </span>
                                )}
                              </div>
                              <div className="w-36 flex items-center gap-2">
                                <input
                                  type="text"
                                  value={alloc.amount}
                                  onChange={(e) =>
                                    handleUpdateAllocationAmount(
                                      alloc.id,
                                      sanitizeNumericInput(e.target.value)
                                    )
                                  }
                                  placeholder="0"
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-gray-900 dark:text-white text-sm text-right"
                                />
                                <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                  {selectedTokenSymbol}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {/* Allocation sum indicator */}
                        {milestoneAllocations.length > 0 && (
                          <div
                            className={`flex justify-between items-center px-3 py-2 rounded-lg ${
                              totalAmount > 0 && Math.abs(allocationSum - totalAmount) < 0.01
                                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                                : totalAmount > 0
                                  ? "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300"
                                  : "bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-400"
                            }`}
                          >
                            <span className="text-sm font-medium">Total Allocated</span>
                            <span className="text-sm font-semibold">
                              {allocationSum.toLocaleString(undefined, {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 18,
                              })}{" "}
                              {selectedTokenSymbol}
                              {totalAmount > 0 && (
                                <span className="ml-2">
                                  {Math.abs(allocationSum - totalAmount) < 0.01 ? (
                                    <CheckCircleIcon className="inline h-4 w-4" />
                                  ) : (
                                    `/ ${totalAmount.toLocaleString()} ${selectedTokenSymbol}`
                                  )}
                                </span>
                              )}
                            </span>
                          </div>
                        )}

                        {/* Validation errors */}
                        {allocationErrors["_sum"] && (
                          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                            <ExclamationTriangleIcon className="h-4 w-4" />
                            {allocationErrors["_sum"]}
                          </div>
                        )}
                      </div>

                      {milestones.length === 0 && (
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          This grant has no milestones defined. Only First and Final payment
                          allocations are available.
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-zinc-600">
                      <Button variant="secondary" onClick={onClose} disabled={isSaving}>
                        Cancel
                      </Button>
                      <Button onClick={handleSave} disabled={isSaving || hasAllocationsError}>
                        {isSaving ? (
                          <>
                            <Spinner className="w-4 h-4 mr-2" />
                            Saving...
                          </>
                        ) : (
                          "Save Configuration"
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
