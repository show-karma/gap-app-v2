"use client";

import { Dialog, Transition } from "@headlessui/react";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  Check,
  CheckCircle2,
  CircleX,
  Clock,
  FileSearch,
  ListChecks,
  Settings,
  Shield,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { erc20Abi, formatUnits, parseUnits } from "viem";
import { useAccount, useChainId, useWalletClient } from "wagmi";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import {
  NETWORKS,
  NATIVE_TOKENS,
  type SupportedChainId,
  TOKEN_ADDRESSES,
  getNativeTokenSymbol,
  hasUSDC,
  getAvailableNetworks,
} from "@/config/tokens";
import { envVars } from "@/utilities/enviromentVars";
import { isAddress } from "viem";
import { useWallet } from "@/hooks/useWallet";
import {
  getSafeTokenBalance,
  isSafeDeployed,
  signAndProposeDisbursement,
} from "@/utilities/safe";
import {
  useBatchTotalDisbursed,
  useCreateDisbursements,
  useRecordSafeTransaction,
} from "../hooks/use-payout-disbursement";
import type {
  GrantDisbursementInfo,
  GrantDisbursementRequest,
  MilestoneBreakdown,
} from "../types/payout-disbursement";

export interface CreateDisbursementModalProps {
  isOpen: boolean;
  onClose: () => void;
  grants: GrantDisbursementInfo[];
  communityUID: string;
  safeAddress?: string;
  onSuccess?: () => void;
}

type Step = "setup" | "project-review" | "summary" | "preflight" | "signing" | "complete";

interface PreflightChecks {
  isCorrectNetwork: boolean | null;
  isDeployed: boolean | null;
  hasSufficientBalance: boolean | null;
  safeBalance: string;
  isChecking: boolean;
  error: string | null;
}

/** State for milestone breakdown amounts per grant */
type MilestoneBreakdownState = Record<string, MilestoneBreakdown>;

/** Validation errors for milestone breakdowns per grant */
type MilestoneValidationErrors = Record<string, string>;

/** State for editable disbursement amounts per grant */
type DisbursementAmountsState = Record<string, string>;

/** Validation errors for disbursement amounts per grant */
type DisbursementValidationErrors = Record<string, string>;

/** Token type selection */
type TokenType = "usdc" | "native" | "custom";

/** Get available networks based on environment (include testnets in staging) */
const getSupportedNetworks = () => getAvailableNetworks(envVars.isDev);

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
  const [tokenType, setTokenType] = useState<TokenType>("usdc");
  const [customTokenAddress, setCustomTokenAddress] = useState("");
  const [safeAddress, setSafeAddress] = useState(initialSafeAddress || "");
  const [step, setStep] = useState<Step>("setup");

  // Computed token values
  const selectedTokenSymbol = useMemo(() => {
    if (tokenType === "usdc") return "USDC";
    if (tokenType === "native") return getNativeTokenSymbol(selectedNetwork);
    return "TOKEN"; // Custom token
  }, [tokenType, selectedNetwork]);

  const selectedTokenAddress = useMemo(() => {
    if (tokenType === "usdc") {
      return TOKEN_ADDRESSES.usdc[selectedNetwork as keyof typeof TOKEN_ADDRESSES.usdc] || "";
    }
    if (tokenType === "native") return ""; // Native token has no address
    return customTokenAddress;
  }, [tokenType, selectedNetwork, customTokenAddress]);

  const selectedTokenDecimals = useMemo(() => {
    if (tokenType === "usdc") return 6;
    if (tokenType === "native") return NATIVE_TOKENS[selectedNetwork]?.decimals || 18;
    return 18; // Default for custom tokens
  }, [tokenType, selectedNetwork]);

  /**
   * Get the effective payout address for a grant based on selected network.
   * Returns chain-specific address if available, otherwise falls back to default.
   */
  const getEffectivePayoutAddress = useCallback(
    (grant: GrantDisbursementInfo): { address: string; isChainSpecific: boolean } => {
      const chainSpecificAddress = grant.chainPayoutAddress?.[String(selectedNetwork)];
      if (chainSpecificAddress && isAddress(chainSpecificAddress)) {
        return { address: chainSpecificAddress, isChainSpecific: true };
      }
      return { address: grant.payoutAddress, isChainSpecific: false };
    },
    [selectedNetwork]
  );

  /** Get network name for display */
  const selectedNetworkName = useMemo(() => {
    return NETWORKS[selectedNetwork]?.name || `Chain ${selectedNetwork}`;
  }, [selectedNetwork]);

  // Project review state - tracks which project is currently being reviewed (one at a time)
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0);

  // Milestone breakdown state
  const [milestoneBreakdowns, setMilestoneBreakdowns] = useState<MilestoneBreakdownState>({});
  const [expandedGrants, setExpandedGrants] = useState<Set<string>>(new Set());
  const [milestoneValidationErrors, setMilestoneValidationErrors] =
    useState<MilestoneValidationErrors>({});

  // Disbursement amounts state (editable amounts per grant)
  const [disbursementAmounts, setDisbursementAmounts] = useState<DisbursementAmountsState>({});
  const [disbursementValidationErrors, setDisbursementValidationErrors] =
    useState<DisbursementValidationErrors>({});

  // Pre-flight checks state
  const [preflightChecks, setPreflightChecks] = useState<PreflightChecks>({
    isCorrectNetwork: null,
    isDeployed: null,
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

  // Extract grant UIDs for batch fetching already disbursed amounts
  const grantUIDs = useMemo(() => grants.map((g) => g.grantUID), [grants]);

  // Calculate total disbursed from totalsByToken (converting from raw to human-readable)
  const getDisbursedFromTokenTotals = useCallback(
    (grant: GrantDisbursementInfo): number => {
      if (!grant.totalsByToken || grant.totalsByToken.length === 0) {
        return 0;
      }
      // Sum all tokens' totals, converting from raw units to human-readable
      return grant.totalsByToken.reduce((sum, tokenTotal) => {
        const rawAmount = BigInt(tokenTotal.totalAmount || "0");
        const decimals = tokenTotal.tokenDecimals || 6;
        const humanReadable = parseFloat(formatUnits(rawAmount, decimals));
        return sum + humanReadable;
      }, 0);
    },
    []
  );

  // Create a map of grant UID to human-readable disbursed totals from passed-in data
  const disbursedTotalsFromProps = useMemo(() => {
    const map: Record<string, number> = {};
    for (const grant of grants) {
      map[grant.grantUID] = getDisbursedFromTokenTotals(grant);
    }
    return map;
  }, [grants, getDisbursedFromTokenTotals]);

  // Fetch already disbursed amounts for all grants (fallback if totalsByToken not provided)
  const { isLoading: isDisbursedLoading } = useBatchTotalDisbursed(
    grantUIDs,
    { enabled: isOpen && grantUIDs.length > 0 && grants.some((g) => !g.totalsByToken) }
  );

  // Calculate remaining amount for a grant (approved - already disbursed)
  const getRemainingAmount = useCallback(
    (grantUID: string, approvedAmount: string): number => {
      const approved = parseFloat(approvedAmount) || 0;
      // Prefer the pre-calculated human-readable totals from props
      const alreadyDisbursed = disbursedTotalsFromProps[grantUID] ?? 0;
      return Math.max(0, approved - alreadyDisbursed);
    },
    [disbursedTotalsFromProps]
  );

  // Get the effective disbursement amount for a grant (user-entered or remaining)
  const getEffectiveDisbursementAmount = useCallback(
    (grantUID: string, approvedAmount: string): number => {
      const userAmount = disbursementAmounts[grantUID];
      if (userAmount !== undefined && userAmount !== "") {
        return parseFloat(userAmount) || 0;
      }
      // Default to remaining amount
      return getRemainingAmount(grantUID, approvedAmount);
    },
    [disbursementAmounts, getRemainingAmount]
  );

  // Calculate totals using effective disbursement amounts
  const totalAmount = useMemo(() => {
    return grants.reduce((sum, grant) => {
      const amount = getEffectiveDisbursementAmount(grant.grantUID, grant.approvedAmount);
      return sum + amount;
    }, 0);
  }, [grants, getEffectiveDisbursementAmount]);

  // Grants eligible for review (have payout address) - used for UI navigation
  const grantsToReview = useMemo(() => {
    return grants.filter((g) => {
      const { address: effectiveAddress } = getEffectivePayoutAddress(g);
      const hasPayoutAddress = !!effectiveAddress && isAddress(effectiveAddress);
      const remainingAmount = getRemainingAmount(g.grantUID, g.approvedAmount);
      return hasPayoutAddress && remainingAmount > 0;
    });
  }, [grants, getEffectivePayoutAddress, getRemainingAmount]);

  // Valid grants for final submission (have payout address AND positive disbursement amount)
  const validGrants = useMemo(() => {
    return grantsToReview.filter((g) => {
      const disbursementAmount = getEffectiveDisbursementAmount(g.grantUID, g.approvedAmount);
      return disbursementAmount > 0;
    });
  }, [grantsToReview, getEffectiveDisbursementAmount]);

  // Check if grant has milestones
  const grantsWithMilestones = useMemo(() => {
    return grants.filter((g) => g.milestones && g.milestones.length > 0);
  }, [grants]);

  // Current project being reviewed (for project-review step)
  // Uses grantsToReview so UI stays stable even when user enters 0
  const currentProject = useMemo(() => {
    return grantsToReview[currentProjectIndex] || null;
  }, [grantsToReview, currentProjectIndex]);

  // Validate disbursement amount for a single grant
  const validateDisbursementAmount = useCallback(
    (grantUID: string, approvedAmount: string): boolean => {
      const remainingAmount = getRemainingAmount(grantUID, approvedAmount);
      const disbursementAmount = getEffectiveDisbursementAmount(grantUID, approvedAmount);

      // Check if amount is greater than 0
      if (disbursementAmount <= 0) {
        setDisbursementValidationErrors((prev) => ({
          ...prev,
          [grantUID]: "Amount must be greater than 0",
        }));
        return false;
      }

      // Check if amount exceeds remaining amount
      const tolerance = 0.01;
      if (disbursementAmount > remainingAmount + tolerance) {
        setDisbursementValidationErrors((prev) => ({
          ...prev,
          [grantUID]: `You are trying to disburse more than the total grant amount (${remainingAmount.toLocaleString()} ${selectedTokenSymbol} available)`,
        }));
        return false;
      }

      // Clear any existing error
      setDisbursementValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[grantUID];
        return newErrors;
      });
      return true;
    },
    [getRemainingAmount, getEffectiveDisbursementAmount, selectedTokenSymbol]
  );

  // Validate all disbursement amounts
  const validateAllDisbursementAmounts = useCallback((): boolean => {
    let allValid = true;
    for (const grant of validGrants) {
      if (!validateDisbursementAmount(grant.grantUID, grant.approvedAmount)) {
        allValid = false;
      }
    }
    return allValid;
  }, [validGrants, validateDisbursementAmount]);

  // Handle disbursement amount change
  const handleDisbursementAmountChange = (grantUID: string, amount: string) => {
    setDisbursementAmounts((prev) => ({
      ...prev,
      [grantUID]: amount,
    }));

    // Clear validation error when user types
    setDisbursementValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[grantUID];
      return newErrors;
    });
  };

  // Validate milestone breakdown for a grant
  const validateMilestoneBreakdown = useCallback(
    (grantUID: string, approvedAmount: string): boolean => {
      const grant = grants.find((g) => g.grantUID === grantUID);
      if (!grant || !grant.milestones || grant.milestones.length === 0) {
        return true; // No milestones to validate
      }

      const breakdown = milestoneBreakdowns[grantUID];
      if (!breakdown || Object.keys(breakdown).length === 0) {
        return true; // No breakdown entered, which is valid (optional)
      }

      // Calculate sum of milestone amounts
      const sum = Object.values(breakdown).reduce((acc, val) => {
        const amount = parseFloat(val) || 0;
        return acc + amount;
      }, 0);

      // The milestone sum should equal the disbursement amount, not the approved amount
      const disbursementAmount = getEffectiveDisbursementAmount(grantUID, approvedAmount);

      // Check if sum equals disbursement amount (with small tolerance for floating point)
      const tolerance = 0.01;
      if (Math.abs(sum - disbursementAmount) > tolerance) {
        setMilestoneValidationErrors((prev) => ({
          ...prev,
          [grantUID]: `Milestone amounts sum (${sum.toLocaleString()}) must equal disbursement amount (${disbursementAmount.toLocaleString()})`,
        }));
        return false;
      }

      // Clear any existing error
      setMilestoneValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[grantUID];
        return newErrors;
      });
      return true;
    },
    [grants, milestoneBreakdowns, getEffectiveDisbursementAmount]
  );

  // Validate all milestone breakdowns
  const validateAllMilestoneBreakdowns = useCallback((): boolean => {
    let allValid = true;
    for (const grant of grantsWithMilestones) {
      if (!validateMilestoneBreakdown(grant.grantUID, grant.approvedAmount)) {
        allValid = false;
      }
    }
    return allValid;
  }, [grantsWithMilestones, validateMilestoneBreakdown]);

  // Handle milestone amount change
  const handleMilestoneAmountChange = (grantUID: string, milestoneUID: string, amount: string) => {
    setMilestoneBreakdowns((prev) => ({
      ...prev,
      [grantUID]: {
        ...prev[grantUID],
        [milestoneUID]: amount,
      },
    }));

    // Clear validation error when user types
    setMilestoneValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[grantUID];
      return newErrors;
    });
  };

  // Toggle expanded state for a grant
  const toggleGrantExpanded = (grantUID: string) => {
    setExpandedGrants((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(grantUID)) {
        newSet.delete(grantUID);
      } else {
        newSet.add(grantUID);
      }
      return newSet;
    });
  };

  // Calculate milestone sum for a grant
  const getMilestoneSum = (grantUID: string): number => {
    const breakdown = milestoneBreakdowns[grantUID];
    if (!breakdown) return 0;
    return Object.values(breakdown).reduce((acc, val) => {
      const amount = parseFloat(val) || 0;
      return acc + amount;
    }, 0);
  };

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("setup");
      setSafeAddress(initialSafeAddress || "");
      setCurrentProjectIndex(0);
      setCustomTokenAddress("");
      setPreflightChecks({
        isCorrectNetwork: null,
        isDeployed: null,
        hasSufficientBalance: null,
        safeBalance: "0",
        isChecking: false,
        error: null,
      });
      setTransactionResult(null);
      setTransactionError(null);
      setMilestoneBreakdowns({});
      setExpandedGrants(new Set());
      setMilestoneValidationErrors({});
      setDisbursementAmounts({});
      setDisbursementValidationErrors({});
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
          hasSufficientBalance: null,
          safeBalance: "0",
          isChecking: false,
          error: `Please switch your wallet to ${getSupportedNetworks().find((n) => n.id === selectedNetwork)?.name}.`,
        });
        return;
      }

      // Check Safe deployment
      const isDeployed = await isSafeDeployed(safeAddress, selectedNetwork);

      if (!isDeployed) {
        setPreflightChecks({
          isCorrectNetwork: true,
          isDeployed: false,
          hasSufficientBalance: null,
          safeBalance: "0",
          isChecking: false,
          error: `Safe not deployed on ${getSupportedNetworks().find((n) => n.id === selectedNetwork)?.name}.`,
        });
        return;
      }

      // Check balance
      const balanceInfo = await getSafeTokenBalance(
        safeAddress,
        tokenType === "native" ? null : selectedTokenAddress,
        selectedNetwork
      );
      const hasSufficientBalance = parseFloat(balanceInfo.balanceFormatted) >= totalAmount;

      setPreflightChecks({
        isCorrectNetwork: true,
        isDeployed: true,
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
    tokenType,
    selectedTokenAddress,
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

  // Handle proceeding from setup to project review
  const handleProceedToProjectReview = () => {
    if (validGrants.length === 0) {
      toast.error("No valid grants to disburse");
      return;
    }
    setCurrentProjectIndex(0);
    setStep("project-review");
  };

  // Validate current project before moving to next
  const validateCurrentProject = (): boolean => {
    if (!currentProject) return false;

    // Validate disbursement amount
    if (!validateDisbursementAmount(currentProject.grantUID, currentProject.approvedAmount)) {
      return false;
    }

    // Validate milestone breakdown if present
    if (!validateMilestoneBreakdown(currentProject.grantUID, currentProject.approvedAmount)) {
      return false;
    }

    return true;
  };

  // Handle Save & Next Project
  const handleNextProject = () => {
    if (!validateCurrentProject()) {
      return;
    }

    if (currentProjectIndex < grantsToReview.length - 1) {
      setCurrentProjectIndex((prev) => prev + 1);
    } else {
      // Last project - go to summary
      setStep("summary");
    }
  };

  // Handle Back in project review
  const handlePreviousProject = () => {
    if (currentProjectIndex > 0) {
      setCurrentProjectIndex((prev) => prev - 1);
    } else {
      // First project - go back to setup
      setStep("setup");
    }
  };

  // Handle proceeding to preflight from summary
  const handleProceedToPreflight = () => {
    // Final validation of all amounts and breakdowns
    if (!validateAllDisbursementAmounts()) {
      toast.error("Please fix disbursement amount errors");
      return;
    }
    if (!validateAllMilestoneBreakdowns()) {
      toast.error("Please fix milestone amount errors");
      return;
    }

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
      const grantRequests: GrantDisbursementRequest[] = validGrants.map((grant) => {
        const breakdown = milestoneBreakdowns[grant.grantUID];
        // Only include milestone breakdown if it has values
        const hasBreakdown = breakdown && Object.keys(breakdown).length > 0;
        // Use effective disbursement amount (user-entered or remaining)
        const effectiveAmount = getEffectiveDisbursementAmount(
          grant.grantUID,
          grant.approvedAmount
        );
        // Convert to smallest unit format for backend (e.g., 0.001 USDC -> 1000 with 6 decimals)
        const amountInSmallestUnit = parseUnits(
          effectiveAmount.toString(),
          selectedTokenDecimals
        ).toString();
        // Use chain-specific payout address if available
        const { address: effectivePayoutAddress } = getEffectivePayoutAddress(grant);

        // Convert milestone breakdown to smallest unit if present
        const convertedBreakdown = hasBreakdown
          ? Object.fromEntries(
              Object.entries(breakdown).map(([milestoneUID, amount]) => [
                milestoneUID,
                parseUnits(amount, selectedTokenDecimals).toString(),
              ])
            )
          : undefined;

        return {
          grantUID: grant.grantUID,
          projectUID: grant.projectUID,
          amount: amountInSmallestUnit,
          payoutAddress: effectivePayoutAddress,
          ...(convertedBreakdown && { milestoneBreakdown: convertedBreakdown }),
        };
      });

      const disbursements = await createDisbursementsMutation.mutateAsync({
        grants: grantRequests,
        communityUID,
        chainID: selectedNetwork,
        safeAddress,
        token: selectedTokenSymbol,
        tokenAddress: selectedTokenAddress || "", // Empty for native tokens
        tokenDecimals: selectedTokenDecimals,
      });

      // 2. Create Safe transaction
      const recipients = validGrants.map((grant) => ({
        address: getEffectivePayoutAddress(grant).address,
        amount: getEffectiveDisbursementAmount(grant.grantUID, grant.approvedAmount).toString(),
      }));

      const result = await signAndProposeDisbursement(
        safeAddress,
        recipients,
        tokenType === "native" ? null : selectedTokenAddress,
        selectedNetwork,
        walletClient,
        selectedTokenDecimals
      );

      // 3. Update disbursement records with Safe transaction hash
      // Use safeTxHash (the Safe transaction hash) for URL generation, not the execution tx hash
      const safeTxHashToStore = result.safeTxHash || result.txHash;
      for (const disbursement of disbursements) {
        await recordSafeTransactionMutation.mutateAsync({
          disbursementId: disbursement.id,
          request: {
            safeTransactionHash: safeTxHashToStore,
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
          : "Transaction to disburse created!"
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

  const hasMilestoneErrors = Object.keys(milestoneValidationErrors).length > 0;
  const hasDisbursementErrors = Object.keys(disbursementValidationErrors).length > 0;

  const canProceed =
    validGrants.length > 0 &&
    isConnected &&
    preflightChecks.isCorrectNetwork === true &&
    preflightChecks.isDeployed === true &&
    preflightChecks.hasSufficientBalance === true &&
    !preflightChecks.isChecking;

  // Get step number for indicator
  const getStepNumber = (): number => {
    switch (step) {
      case "setup":
        return 1;
      case "project-review":
        return 2;
      case "summary":
        return 3;
      case "preflight":
      case "signing":
      case "complete":
        return 4;
      default:
        return 1;
    }
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
                    {step === "complete"
                      ? "Disbursement Complete"
                      : step === "project-review" && currentProject
                        ? `Review ${currentProject.projectName}`
                        : step === "summary"
                          ? "Review Summary"
                          : "Create Disbursement"}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Step Indicator */}
                {step !== "complete" && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between text-sm">
                      <StepIndicator
                        number={1}
                        label="Setup"
                        active={step === "setup"}
                        completed={getStepNumber() > 1}
                      />
                      <div className="flex-1 h-0.5 bg-gray-200 dark:bg-zinc-600 mx-2" />
                      <StepIndicator
                        number={2}
                        label={`Review (${currentProjectIndex + 1}/${grantsToReview.length || 1})`}
                        active={step === "project-review"}
                        completed={getStepNumber() > 2}
                      />
                      <div className="flex-1 h-0.5 bg-gray-200 dark:bg-zinc-600 mx-2" />
                      <StepIndicator
                        number={3}
                        label="Summary"
                        active={step === "summary"}
                        completed={getStepNumber() > 3}
                      />
                      <div className="flex-1 h-0.5 bg-gray-200 dark:bg-zinc-600 mx-2" />
                      <StepIndicator
                        number={4}
                        label="Confirm"
                        active={step === "preflight" || step === "signing"}
                        completed={false}
                      />
                    </div>
                  </div>
                )}

                {/* Step 1: Setup */}
                {step === "setup" && (
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
                          {getSupportedNetworks().map((network) => (
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
                          value={tokenType}
                          onChange={(e) => setTokenType(e.target.value as TokenType)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                        >
                          {hasUSDC(selectedNetwork) && <option value="usdc">USDC</option>}
                          <option value="native">
                            {getNativeTokenSymbol(selectedNetwork)} (Native)
                          </option>
                          <option value="custom">Custom Token</option>
                        </select>
                      </div>
                    </div>

                    {/* Custom Token Address Input */}
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
                          onChange={(e) => setCustomTokenAddress(e.target.value)}
                          placeholder="0x..."
                          className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-gray-900 dark:text-white font-mono text-sm"
                        />
                        {customTokenAddress && !isAddress(customTokenAddress) && (
                          <p className="mt-1 text-sm text-red-500">Invalid token address</p>
                        )}
                      </div>
                    )}

                    {/* Safe Address Input */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <label
                          htmlFor="disbursement-safe-address"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          Safe Address
                        </label>
                        <div className="group relative">
                          <InformationCircleIcon className="h-4 w-4 text-gray-400 cursor-help" />
                          <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-72 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                            <p className="font-semibold mb-1">What is a Safe?</p>
                            <p className="mb-2">
                              A Gnosis Safe is a multi-signature wallet that requires multiple
                              approvals before transactions execute.
                            </p>
                            <p className="font-semibold mb-1">How it works:</p>
                            <ul className="list-disc list-inside space-y-1">
                              <li>Enter your Safe wallet address</li>
                              <li>This creates a transaction proposal</li>
                              <li>Safe owners approve in app.safe.global</li>
                              <li>Funds transfer after threshold is reached</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      <input
                        id="disbursement-safe-address"
                        type="text"
                        value={safeAddress}
                        onChange={(e) => setSafeAddress(e.target.value)}
                        placeholder="0x..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-gray-900 dark:text-white font-mono text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        The multi-sig wallet address that holds the funds to disburse
                      </p>
                    </div>

                    {/* Grants Overview */}
                    <div className="bg-gray-50 dark:bg-zinc-700/50 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 dark:text-gray-300">
                          Projects to Review
                        </span>
                        <span className="text-lg font-semibold text-gray-900 dark:text-white">
                          {validGrants.length} project{validGrants.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {grants.length !== validGrants.length && (
                        <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                          {grants.length - validGrants.length} grant(s) excluded due to missing
                          payout address or zero remaining amount
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                      <Button variant="secondary" onClick={onClose}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleProceedToProjectReview}
                        disabled={
                          validGrants.length === 0 ||
                          !isConnected ||
                          !safeAddress ||
                          (tokenType === "custom" && !isAddress(customTokenAddress))
                        }
                      >
                        Continue
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 2: Project Review (One at a time) */}
                {step === "project-review" && currentProject && (
                  <ProjectReviewStep
                    project={currentProject}
                    projectIndex={currentProjectIndex}
                    totalProjects={grantsToReview.length}
                    tokenSymbol={selectedTokenSymbol}
                    tokenDecimals={selectedTokenDecimals}
                    selectedNetwork={selectedNetwork}
                    selectedNetworkName={selectedNetworkName}
                    alreadyDisbursed={(disbursedTotalsFromProps[currentProject.grantUID] ?? 0).toString()}
                    isLoadingDisbursed={isDisbursedLoading}
                    disbursementAmount={
                      disbursementAmounts[currentProject.grantUID] ??
                      getRemainingAmount(
                        currentProject.grantUID,
                        currentProject.approvedAmount
                      ).toString()
                    }
                    onDisbursementAmountChange={(amount) =>
                      handleDisbursementAmountChange(currentProject.grantUID, amount)
                    }
                    disbursementError={disbursementValidationErrors[currentProject.grantUID]}
                    milestoneBreakdown={milestoneBreakdowns[currentProject.grantUID] || {}}
                    onMilestoneAmountChange={(milestoneUID, amount) =>
                      handleMilestoneAmountChange(currentProject.grantUID, milestoneUID, amount)
                    }
                    milestoneSum={getMilestoneSum(currentProject.grantUID)}
                    milestoneError={milestoneValidationErrors[currentProject.grantUID]}
                    isExpanded={expandedGrants.has(currentProject.grantUID)}
                    onToggleExpand={() => toggleGrantExpanded(currentProject.grantUID)}
                    onBack={handlePreviousProject}
                    onNext={handleNextProject}
                    isLastProject={currentProjectIndex === grantsToReview.length - 1}
                  />
                )}

                {/* Step 3: Summary */}
                {step === "summary" && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Review Disbursement Details
                      </h4>

                      {/* Transaction Configuration */}
                      <div className="bg-gray-50 dark:bg-zinc-700/50 rounded-lg p-4 mb-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Network</span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {getSupportedNetworks().find((n) => n.id === selectedNetwork)?.name}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Token</span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {selectedTokenSymbol}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-500 dark:text-gray-400">Safe Address</span>
                            <p className="font-mono text-sm text-gray-900 dark:text-white break-all">
                              {safeAddress}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Projects Table */}
                      {isDisbursedLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Spinner className="w-6 h-6 mr-3" />
                          <span className="text-gray-600 dark:text-gray-400">
                            Loading disbursement history...
                          </span>
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-gray-200 dark:border-zinc-600 rounded-md">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-zinc-700/50">
                              <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                                  Project Name
                                </th>
                                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                                  Payout Address
                                </th>
                                <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                                  Amount to Disburse
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-zinc-600">
                              {validGrants.map((grant) => {
                                const { address: payoutAddress } = getEffectivePayoutAddress(grant);
                                const effectiveAmount = getEffectiveDisbursementAmount(
                                  grant.grantUID,
                                  grant.approvedAmount
                                );

                                return (
                                  <tr key={grant.grantUID}>
                                    <td className="px-4 py-3 text-gray-900 dark:text-white">
                                      {grant.projectName}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                                      {payoutAddress.slice(0, 6)}...{payoutAddress.slice(-4)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                                      {effectiveAmount.toLocaleString()} {selectedTokenSymbol}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Total disbursement */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                          Total disbursement
                        </span>
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                          {totalAmount.toLocaleString()} {selectedTokenSymbol}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {validGrants.length} project{validGrants.length !== 1 ? "s" : ""}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between gap-3">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setCurrentProjectIndex(grantsToReview.length - 1);
                          setStep("project-review");
                        }}
                      >
                        Back
                      </Button>
                      <Button onClick={handleProceedToPreflight}>Proceed to Confirmation</Button>
                    </div>
                  </div>
                )}

                {/* Step 4: Preflight Checks */}
                {step === "preflight" && (
                  <div className="space-y-6">
                    {transactionError && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <div className="flex items-start">
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-500 dark:text-red-400 mr-2 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-red-700 dark:text-red-300">
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
                            label="Sufficient Balance"
                            status={preflightChecks.hasSufficientBalance}
                            description={`${parseFloat(preflightChecks.safeBalance).toLocaleString()} ${selectedTokenSymbol} available (${totalAmount.toLocaleString()} needed)`}
                          />
                        </>
                      )}
                    </div>

                    <div className="flex justify-between">
                      <Button
                        variant="secondary"
                        onClick={runPreflightChecks}
                        disabled={preflightChecks.isChecking}
                      >
                        Re-validate
                      </Button>
                      <div className="flex gap-3">
                        <Button variant="secondary" onClick={() => setStep("summary")}>
                          Back
                        </Button>
                        <Button onClick={handleExecuteDisbursement} disabled={!canProceed}>
                          Create Transaction
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step: Creating/Proposing */}
                {step === "signing" && (
                  <div className="py-12 text-center">
                    <Spinner className="w-12 h-12 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Proposing Transaction
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400">
                      Submitting transaction to Safe...
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
                        : (
                          <>
                            Transaction to disburse {totalAmount.toLocaleString()} {selectedTokenSymbol} to {validGrants.length} project{validGrants.length !== 1 ? "s" : ""} has been created.
                            <br />
                            The signers can go{" "}
                            <a
                              href={transactionResult.safeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                            >
                              here
                            </a>{" "}
                            and sign the transaction.
                          </>
                        )}
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
  // Get status-specific styling to match standard app patterns
  const getStatusStyles = () => {
    if (status === true) {
      return {
        container: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
        label: "text-green-800 dark:text-green-200",
        description: "text-green-700 dark:text-green-300",
      };
    }
    if (status === false) {
      return {
        container: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
        label: "text-red-800 dark:text-red-200",
        description: "text-red-700 dark:text-red-300",
      };
    }
    return {
      container: "bg-gray-50 dark:bg-zinc-700/50 border-gray-200 dark:border-zinc-600",
      label: "text-gray-900 dark:text-white",
      description: "text-gray-600 dark:text-gray-400",
    };
  };

  const styles = getStatusStyles();

  const getStatusIcon = () => {
    if (status === true) {
      return <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />;
    }
    if (status === false) {
      return <CircleX className="w-5 h-5 text-red-600 dark:text-red-400" />;
    }
    return <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />;
  };

  return (
    <div className={`flex items-center p-3 rounded-lg border ${styles.container}`}>
      <span className="mr-3">{getStatusIcon()}</span>
      <div className="flex-1">
        <div className={`font-medium ${styles.label}`}>{label}</div>
        <div className={`text-sm ${styles.description}`}>{description}</div>
      </div>
    </div>
  );
}

// Step indicator component
function StepIndicator({
  number,
  label,
  active,
  completed,
}: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  // Get the appropriate icon based on step number
  const getStepIcon = () => {
    if (completed) {
      return <Check className="w-4 h-4" strokeWidth={3} />;
    }
    switch (number) {
      case 1: // Setup
        return <Settings className="w-4 h-4" />;
      case 2: // Review
        return <FileSearch className="w-4 h-4" />;
      case 3: // Summary
        return <ListChecks className="w-4 h-4" />;
      case 4: // Confirm
        return <Shield className="w-4 h-4" />;
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          completed
            ? "bg-green-500 text-white"
            : active
              ? "bg-blue-500 text-white"
              : "bg-gray-200 dark:bg-zinc-600 text-gray-600 dark:text-gray-400"
        }`}
      >
        {getStepIcon()}
      </div>
      <span
        className={`mt-1 text-xs ${
          active || completed
            ? "text-gray-900 dark:text-white font-medium"
            : "text-gray-500 dark:text-gray-400"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

// Project Review Step Component - Shows ONE project at a time
function ProjectReviewStep({
  project,
  projectIndex,
  totalProjects,
  tokenSymbol,
  tokenDecimals,
  selectedNetwork,
  selectedNetworkName,
  alreadyDisbursed,
  isLoadingDisbursed,
  disbursementAmount,
  onDisbursementAmountChange,
  disbursementError,
  milestoneBreakdown,
  onMilestoneAmountChange,
  milestoneSum,
  milestoneError,
  isExpanded,
  onToggleExpand,
  onBack,
  onNext,
  isLastProject,
}: {
  project: GrantDisbursementInfo;
  projectIndex: number;
  totalProjects: number;
  tokenSymbol: string;
  tokenDecimals: number;
  selectedNetwork: number;
  selectedNetworkName: string;
  alreadyDisbursed: string;
  isLoadingDisbursed: boolean;
  disbursementAmount: string;
  onDisbursementAmountChange: (amount: string) => void;
  disbursementError?: string;
  milestoneBreakdown: MilestoneBreakdown;
  onMilestoneAmountChange: (milestoneUID: string, amount: string) => void;
  milestoneSum: number;
  milestoneError?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onBack: () => void;
  onNext: () => void;
  isLastProject: boolean;
}) {
  const hasMilestones = project.milestones && project.milestones.length > 0;
  const approvedAmount = parseFloat(project.approvedAmount) || 0;
  // alreadyDisbursed is now passed in human-readable format from the parent
  const disbursedAmount = parseFloat(alreadyDisbursed) || 0;
  const remainingAmount = Math.max(0, approvedAmount - disbursedAmount);

  // Get effective payout address (chain-specific or default)
  const chainSpecificAddress = project.chainPayoutAddress?.[String(selectedNetwork)];
  const effectivePayoutAddress =
    chainSpecificAddress && isAddress(chainSpecificAddress)
      ? chainSpecificAddress
      : project.payoutAddress;
  const isChainSpecificAddress =
    chainSpecificAddress && isAddress(chainSpecificAddress) && chainSpecificAddress !== project.payoutAddress;
  const currentDisbursementAmount = parseFloat(disbursementAmount) || 0;

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="bg-gray-50 dark:bg-zinc-700/50 rounded-lg p-4">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-semibold text-lg text-gray-900 dark:text-white">
              {project.projectName}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">{project.grantName}</p>
          </div>
          <div className="text-right">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Project {projectIndex + 1} of {totalProjects}
            </span>
          </div>
        </div>
      </div>

      {/* Payout Address (read-only display) */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Payout Address
          </label>
          {isChainSpecificAddress && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              {selectedNetworkName} specific
            </span>
          )}
        </div>
        <div className="px-3 py-2 bg-gray-100 dark:bg-zinc-700 rounded-md font-mono text-sm text-gray-900 dark:text-white break-all">
          {effectivePayoutAddress}
        </div>
        {isChainSpecificAddress && project.payoutAddress && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Default address: {project.payoutAddress.slice(0, 6)}...{project.payoutAddress.slice(-4)}
          </p>
        )}
      </div>

      {/* Amount Details Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Total Grant
          </label>
          <div className="px-3 py-2 bg-gray-100 dark:bg-zinc-700 rounded-md text-gray-900 dark:text-white font-semibold">
            {approvedAmount.toLocaleString()} {tokenSymbol}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Total Disbursed to Date
          </label>
          <div className="px-3 py-2 bg-gray-100 dark:bg-zinc-700 rounded-md text-gray-900 dark:text-white font-semibold">
            {isLoadingDisbursed ? (
              <Spinner className="w-4 h-4" />
            ) : (
              <>
                {disbursedAmount.toLocaleString()} {tokenSymbol}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Remaining Amount Info */}
      {remainingAmount > 0 && remainingAmount !== approvedAmount && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Remaining to disburse:{" "}
            <strong>
              {remainingAmount.toLocaleString()} {tokenSymbol}
            </strong>
          </p>
        </div>
      )}

      {/* Amount to Disburse Input */}
      <div>
        <label
          htmlFor={`disbursement-amount-${project.grantUID}`}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Amount to Disburse
        </label>
        <div className="relative">
          <input
            id={`disbursement-amount-${project.grantUID}`}
            type="text"
            value={disbursementAmount}
            onChange={(e) => onDisbursementAmountChange(e.target.value)}
            placeholder="0"
            className={`w-full px-3 py-2 pr-16 border rounded-md bg-white dark:bg-zinc-700 text-gray-900 dark:text-white text-lg font-semibold ${
              disbursementError
                ? "border-red-500 dark:border-red-500"
                : "border-gray-300 dark:border-zinc-600"
            }`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
            {tokenSymbol}
          </span>
        </div>
        {disbursementError && (
          <div className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <ExclamationTriangleIcon className="h-4 w-4" />
            {disbursementError}
          </div>
        )}
        {remainingAmount > 0 && currentDisbursementAmount !== remainingAmount && (
          <button
            type="button"
            onClick={() => onDisbursementAmountChange(remainingAmount.toString())}
            className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Set to remaining amount ({remainingAmount.toLocaleString()})
          </button>
        )}
      </div>

      {/* Milestone Breakdown (Optional) */}
      {hasMilestones && (
        <div>
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex items-center justify-between w-full px-3 py-2 bg-gray-50 dark:bg-zinc-700/50 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-700"
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Milestone Breakdown (Optional)
            </span>
            {isExpanded ? (
              <ChevronUpIcon className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-gray-500" />
            )}
          </button>

          {isExpanded && (
            <div className="mt-3 space-y-3 pl-3 border-l-2 border-gray-200 dark:border-zinc-600">
              {project.milestones?.map((milestone) => (
                <div key={milestone.uid} className="flex items-center gap-3">
                  <div className="flex-1 text-sm text-gray-600 dark:text-gray-400 truncate">
                    {milestone.title}
                  </div>
                  <div className="w-32">
                    <input
                      type="text"
                      value={milestoneBreakdown[milestone.uid] || ""}
                      onChange={(e) => onMilestoneAmountChange(milestone.uid, e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-right"
                    />
                  </div>
                </div>
              ))}

              {/* Milestone sum indicator */}
              {milestoneSum > 0 && (
                <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-zinc-600">
                  <span
                    className={`text-sm font-medium ${
                      Math.abs(milestoneSum - currentDisbursementAmount) < 0.01
                        ? "text-green-600 dark:text-green-400"
                        : "text-orange-600 dark:text-orange-400"
                    }`}
                  >
                    Sum: {milestoneSum.toLocaleString()} /{" "}
                    {currentDisbursementAmount.toLocaleString()}
                  </span>
                </div>
              )}

              {milestoneError && (
                <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  {milestoneError}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Navigation Actions */}
      <div className="flex justify-between gap-3 pt-4 border-t border-gray-200 dark:border-zinc-600">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext}>
          {isLastProject ? "Review Summary" : "Save & Next Project"}
        </Button>
      </div>
    </div>
  );
}
