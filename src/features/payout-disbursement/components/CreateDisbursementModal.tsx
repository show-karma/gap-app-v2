"use client";

import { Dialog, Transition } from "@headlessui/react";
import { CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { erc20Abi, formatUnits, parseUnits } from "viem";
import { useAccount, useChainId, useWalletClient } from "wagmi";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import { NETWORKS, type SupportedChainId, TOKEN_ADDRESSES } from "@/config/tokens";
import { useWallet } from "@/hooks/useWallet";
import {
  getSafeTokenBalance,
  isSafeDeployed,
  isSafeOwner,
  signAndProposeDisbursement,
} from "@/utilities/safe";
import { useCreateDisbursements, useRecordSafeTransaction } from "../hooks/use-payout-disbursement";
import type { GrantDisbursementInfo, GrantDisbursementRequest } from "../types/payout-disbursement";

export interface CreateDisbursementModalProps {
  isOpen: boolean;
  onClose: () => void;
  grants: GrantDisbursementInfo[];
  communityUID: string;
  safeAddress?: string;
  onSuccess?: () => void;
}

type Step = "review" | "preflight" | "signing" | "complete";

interface PreflightChecks {
  isCorrectNetwork: boolean | null;
  isDeployed: boolean | null;
  isOwner: boolean | null;
  hasSufficientBalance: boolean | null;
  safeBalance: string;
  isChecking: boolean;
  error: string | null;
}

const SUPPORTED_NETWORKS = [
  { id: 42220 as SupportedChainId, name: "Celo" },
  { id: 42161 as SupportedChainId, name: "Arbitrum" },
  { id: 10 as SupportedChainId, name: "Optimism" },
];

export function CreateDisbursementModal({
  isOpen,
  onClose,
  grants,
  communityUID,
  safeAddress: initialSafeAddress,
  onSuccess,
}: CreateDisbursementModalProps) {
  const { address: userAddress, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const walletChainId = useChainId();
  const { switchChainAsync, isPending: isSwitchingNetwork } = useWallet();

  // Form state
  const [selectedNetwork, setSelectedNetwork] = useState<SupportedChainId>(10);
  const [selectedToken, setSelectedToken] = useState<"usdc">("usdc");
  const [safeAddress, setSafeAddress] = useState(initialSafeAddress || "");
  const [step, setStep] = useState<Step>("review");

  // Pre-flight checks state
  const [preflightChecks, setPreflightChecks] = useState<PreflightChecks>({
    isCorrectNetwork: null,
    isDeployed: null,
    isOwner: null,
    hasSufficientBalance: null,
    safeBalance: "0",
    isChecking: false,
    error: null,
  });

  // Transaction state
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionResult, setTransactionResult] = useState<{
    txHash: string;
    safeUrl: string;
    executed?: boolean;
  } | null>(null);
  const [transactionError, setTransactionError] = useState<string | null>(null);

  // Mutations
  const createDisbursementsMutation = useCreateDisbursements({
    onError: (error) => {
      toast.error(`Failed to create disbursement records: ${error.message}`);
    },
  });

  const recordSafeTransactionMutation = useRecordSafeTransaction();

  // Calculate totals
  const totalAmount = useMemo(() => {
    return grants.reduce((sum, grant) => {
      const amount = parseFloat(grant.approvedAmount) || 0;
      return sum + amount;
    }, 0);
  }, [grants]);

  const validGrants = useMemo(() => {
    return grants.filter((g) => g.payoutAddress && parseFloat(g.approvedAmount) > 0);
  }, [grants]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("review");
      setSafeAddress(initialSafeAddress || "");
      setPreflightChecks({
        isCorrectNetwork: null,
        isDeployed: null,
        isOwner: null,
        hasSufficientBalance: null,
        safeBalance: "0",
        isChecking: false,
        error: null,
      });
      setTransactionResult(null);
      setTransactionError(null);
    }
  }, [isOpen, initialSafeAddress]);

  // Run preflight checks
  const runPreflightChecks = useCallback(async () => {
    if (!safeAddress || !userAddress || !isConnected) {
      return;
    }

    setPreflightChecks((prev) => ({ ...prev, isChecking: true, error: null }));

    try {
      // Check wallet network
      const isCorrectNetwork = walletChainId === selectedNetwork;

      if (!isCorrectNetwork) {
        setPreflightChecks({
          isCorrectNetwork: false,
          isDeployed: null,
          isOwner: null,
          hasSufficientBalance: null,
          safeBalance: "0",
          isChecking: false,
          error: `Please switch your wallet to ${SUPPORTED_NETWORKS.find((n) => n.id === selectedNetwork)?.name}.`,
        });
        return;
      }

      // Check Safe deployment
      const isDeployed = await isSafeDeployed(safeAddress, selectedNetwork);

      if (!isDeployed) {
        setPreflightChecks({
          isCorrectNetwork: true,
          isDeployed: false,
          isOwner: null,
          hasSufficientBalance: null,
          safeBalance: "0",
          isChecking: false,
          error: `Safe not deployed on ${SUPPORTED_NETWORKS.find((n) => n.id === selectedNetwork)?.name}.`,
        });
        return;
      }

      // Check ownership
      const isOwner = await isSafeOwner(safeAddress, userAddress, selectedNetwork);

      // Check balance
      const balanceInfo = await getSafeTokenBalance(safeAddress, selectedToken, selectedNetwork);
      const hasSufficientBalance = parseFloat(balanceInfo.balanceFormatted) >= totalAmount;

      setPreflightChecks({
        isCorrectNetwork: true,
        isDeployed: true,
        isOwner,
        hasSufficientBalance,
        safeBalance: balanceInfo.balanceFormatted,
        isChecking: false,
        error: null,
      });
    } catch (error) {
      console.error("Preflight check failed:", error);
      setPreflightChecks((prev) => ({
        ...prev,
        isChecking: false,
        error: "Failed to verify Safe. Please check the address and network.",
      }));
    }
  }, [
    safeAddress,
    userAddress,
    isConnected,
    walletChainId,
    selectedNetwork,
    selectedToken,
    totalAmount,
  ]);

  // Handle network change
  const handleNetworkChange = async (network: SupportedChainId) => {
    setSelectedNetwork(network);

    if (isConnected && walletChainId !== network) {
      try {
        await switchChainAsync({ chainId: network });
      } catch (error) {
        console.error("Failed to switch network:", error);
        toast.error("Failed to switch network. Please switch manually.");
      }
    }
  };

  // Handle proceeding to preflight
  const handleProceedToPreflight = () => {
    setStep("preflight");
    runPreflightChecks();
  };

  // Handle disbursement execution
  const handleExecuteDisbursement = async () => {
    if (!walletClient || !safeAddress || !userAddress || validGrants.length === 0) {
      return;
    }

    setStep("signing");
    setIsProcessing(true);
    setTransactionError(null);

    try {
      // 1. Create disbursement records in backend
      const grantRequests: GrantDisbursementRequest[] = validGrants.map((grant) => ({
        grantUID: grant.grantUID,
        projectUID: "", // Will be populated by the backend from the grant
        amount: grant.approvedAmount,
        payoutAddress: grant.payoutAddress,
      }));

      const disbursements = await createDisbursementsMutation.mutateAsync({
        grants: grantRequests,
        communityUID,
        chainID: selectedNetwork,
        safeAddress,
        token: selectedToken.toUpperCase(),
        tokenAddress: TOKEN_ADDRESSES[selectedToken][selectedNetwork],
      });

      // 2. Create Safe transaction
      const recipients = validGrants.map((grant) => ({
        address: grant.payoutAddress,
        amount: grant.approvedAmount,
      }));

      const result = await signAndProposeDisbursement(
        safeAddress,
        recipients,
        selectedToken,
        selectedNetwork,
        walletClient
      );

      // 3. Update disbursement records with Safe transaction hash
      for (const disbursement of disbursements) {
        await recordSafeTransactionMutation.mutateAsync({
          disbursementId: disbursement.id,
          request: {
            safeTransactionHash: result.txHash,
          },
        });
      }

      setTransactionResult({
        txHash: result.txHash,
        safeUrl: result.safeUrl,
        executed: result.executed,
      });
      setStep("complete");
      toast.success(
        result.executed
          ? "Disbursement executed successfully!"
          : "Disbursement transaction created!"
      );
      onSuccess?.();
    } catch (error) {
      console.error("Disbursement failed:", error);
      setTransactionError(error instanceof Error ? error.message : "Transaction failed");
      setStep("preflight");
    } finally {
      setIsProcessing(false);
    }
  };

  const canProceed =
    validGrants.length > 0 &&
    isConnected &&
    preflightChecks.isCorrectNetwork === true &&
    preflightChecks.isDeployed === true &&
    preflightChecks.isOwner === true &&
    preflightChecks.hasSufficientBalance === true &&
    !preflightChecks.isChecking;

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
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-semibold text-gray-900 dark:text-white"
                  >
                    {step === "complete" ? "Disbursement Complete" : "Create Disbursement"}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Step: Review */}
                {step === "review" && (
                  <div className="space-y-6">
                    {/* Network & Token Selection */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="disbursement-network"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                        >
                          Network
                        </label>
                        <select
                          id="disbursement-network"
                          value={selectedNetwork}
                          onChange={(e) =>
                            handleNetworkChange(Number(e.target.value) as SupportedChainId)
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                        >
                          {SUPPORTED_NETWORKS.map((network) => (
                            <option key={network.id} value={network.id}>
                              {network.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor="disbursement-token"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                        >
                          Token
                        </label>
                        <select
                          id="disbursement-token"
                          value={selectedToken}
                          onChange={(e) => setSelectedToken(e.target.value as "usdc")}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                        >
                          <option value="usdc">USDC</option>
                        </select>
                      </div>
                    </div>

                    {/* Safe Address Input */}
                    <div>
                      <label
                        htmlFor="disbursement-safe-address"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                      >
                        Safe Address
                      </label>
                      <input
                        id="disbursement-safe-address"
                        type="text"
                        value={safeAddress}
                        onChange={(e) => setSafeAddress(e.target.value)}
                        placeholder="0x..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-gray-900 dark:text-white font-mono text-sm"
                      />
                    </div>

                    {/* Grants List */}
                    <div>
                      <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Grants to Disburse ({validGrants.length})
                      </p>
                      <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-zinc-600 rounded-md divide-y divide-gray-200 dark:divide-zinc-600">
                        {grants.map((grant) => {
                          const isValid =
                            grant.payoutAddress && parseFloat(grant.approvedAmount) > 0;
                          return (
                            <div
                              key={grant.grantUID}
                              className={`p-3 ${!isValid ? "bg-red-50 dark:bg-red-900/20" : ""}`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {grant.projectName}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {grant.grantName}
                                  </div>
                                  <div className="text-xs font-mono text-gray-400 dark:text-gray-500 mt-1">
                                    {grant.payoutAddress || "No payout address"}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-gray-900 dark:text-white">
                                    {grant.approvedAmount || "0"} {selectedToken.toUpperCase()}
                                  </div>
                                  {!isValid && (
                                    <div className="text-xs text-red-600 dark:text-red-400">
                                      Missing data
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 dark:text-gray-300">Total Disbursement</span>
                        <span className="text-xl font-bold text-gray-900 dark:text-white">
                          {totalAmount.toLocaleString()} {selectedToken.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                      <Button variant="secondary" onClick={onClose}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleProceedToPreflight}
                        disabled={validGrants.length === 0 || !isConnected || !safeAddress}
                      >
                        Continue
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step: Preflight Checks */}
                {step === "preflight" && (
                  <div className="space-y-6">
                    {transactionError && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <div className="flex">
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
                          <div className="text-sm text-red-700 dark:text-red-400">
                            {transactionError}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Pre-flight Checks
                      </h4>

                      {preflightChecks.isChecking ? (
                        <div className="flex items-center justify-center py-8">
                          <Spinner className="w-6 h-6 mr-3" />
                          <span className="text-gray-600 dark:text-gray-400">
                            Verifying Safe access...
                          </span>
                        </div>
                      ) : (
                        <>
                          <CheckItem
                            label="Wallet Network"
                            status={preflightChecks.isCorrectNetwork}
                            description={
                              preflightChecks.isCorrectNetwork === true
                                ? "Connected to correct network"
                                : "Switch to correct network"
                            }
                          />
                          <CheckItem
                            label="Safe Deployed"
                            status={preflightChecks.isDeployed}
                            description={
                              preflightChecks.isDeployed === true
                                ? "Safe found on network"
                                : "Safe not found"
                            }
                          />
                          <CheckItem
                            label="Safe Ownership"
                            status={preflightChecks.isOwner}
                            description={
                              preflightChecks.isOwner === true
                                ? "You are a Safe owner"
                                : "You are not a Safe owner"
                            }
                          />
                          <CheckItem
                            label="Sufficient Balance"
                            status={preflightChecks.hasSufficientBalance}
                            description={`${parseFloat(preflightChecks.safeBalance).toLocaleString()} USDC available (${totalAmount.toLocaleString()} needed)`}
                          />
                        </>
                      )}
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button variant="secondary" onClick={() => setStep("review")}>
                        Back
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={runPreflightChecks}
                        disabled={preflightChecks.isChecking}
                      >
                        Refresh
                      </Button>
                      <Button onClick={handleExecuteDisbursement} disabled={!canProceed}>
                        Sign & Submit
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step: Signing */}
                {step === "signing" && (
                  <div className="py-12 text-center">
                    <Spinner className="w-12 h-12 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Processing Disbursement
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400">
                      Please confirm the transaction in your wallet...
                    </p>
                  </div>
                )}

                {/* Step: Complete */}
                {step === "complete" && transactionResult && (
                  <div className="py-8 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                      <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      {transactionResult.executed
                        ? "Disbursement Executed!"
                        : "Transaction Created!"}
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {transactionResult.executed
                        ? "Funds have been transferred successfully."
                        : "Transaction is ready for signing by other Safe owners."}
                    </p>
                    <div className="bg-gray-50 dark:bg-zinc-700/50 rounded-lg px-4 py-3 mb-6">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Transaction Hash
                      </p>
                      <code className="text-xs font-mono text-gray-800 dark:text-gray-200 break-all">
                        {transactionResult.txHash}
                      </code>
                    </div>
                    <div className="flex justify-center gap-3">
                      <Button
                        variant="secondary"
                        onClick={() => window.open(transactionResult.safeUrl, "_blank")}
                      >
                        View in Safe
                      </Button>
                      <Button onClick={onClose}>Close</Button>
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

// Helper component for check items
function CheckItem({
  label,
  status,
  description,
}: {
  label: string;
  status: boolean | null;
  description: string;
}) {
  return (
    <div
      className={`flex items-center p-3 rounded-lg border ${
        status === true
          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
          : status === false
            ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
            : "bg-gray-50 dark:bg-zinc-700/50 border-gray-200 dark:border-zinc-600"
      }`}
    >
      <span className="text-lg mr-3">
        {status === true ? "\u2705" : status === false ? "\u274C" : "\u23F3"}
      </span>
      <div className="flex-1">
        <div className="font-medium text-gray-900 dark:text-white">{label}</div>
        <div className="text-sm text-gray-600 dark:text-gray-400">{description}</div>
      </div>
    </div>
  );
}
