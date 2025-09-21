"use client";
import Link from "next/link";
import { useDonationCart } from "@/store";
import { ProfilePicture } from "./Utilities/ProfilePicture";
import { PAGES } from "@/utilities/pages";
import { useParams, useRouter } from "next/navigation";
import { useNetworkSwitching } from "@/hooks/useNetworkSwitching";
import { useTokenBalances, useMultiChainTokenBalances } from "@/hooks/useTokenBalances";
import { useAccount } from "wagmi";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getTokensByChain,
  SUPPORTED_NETWORKS,
  SupportedToken,
} from "@/constants/supportedTokens";
import toast from "react-hot-toast";
import { useDonationTransfer } from "@/hooks/useDonationTransfer";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import type { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { DonationApprovalStatus } from "@/components/DonationApprovalStatus";
import { DonationStepsPreview } from "@/components/DonationStepsPreview";

const parseChainId = (value: string): number | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.startsWith("0x")) {
    return Number.parseInt(trimmed, 16);
  }
  const asNumber = Number(trimmed);
  return Number.isNaN(asNumber) ? null : asNumber;
};

export default function DonationCheckout() {
  const { 
    items, 
    amounts, 
    selectedTokens,
    setAmount, 
    setSelectedToken,
    remove, 
    clear, 
    updatePayments,
    payments,
  } = useDonationCart();
  const router = useRouter();
  const params = useParams();
  const communityId = params?.communityId as string | undefined;
  const {
    currentChainId,
    currentNetwork,
    isCurrentNetworkSupported,
    switchToNetwork,
    isSwitching,
    getSupportedNetworks,
    getFreshWalletClient,
    waitForWalletClientRefresh
  } = useNetworkSwitching();
  const { tokenBalances } = useTokenBalances(currentChainId);

  // Get unique chain IDs from cart items
  const cartChainIds = useMemo(() => {
    const chainIds = new Set<number>();
    Object.values(selectedTokens).forEach(token => {
      if (token) chainIds.add(token.chainId);
    });
    return Array.from(chainIds);
  }, [selectedTokens]);

  const { getAllTokensAcrossChains } = useMultiChainTokenBalances(cartChainIds);
  const {
    transfers,
    isExecuting,
    executeDonations,
    validatePayments,
    executionState,
    approvalInfo,
    checkApprovals,
  } = useDonationTransfer();
  const { address, isConnected } = useAccount();

  const [payoutAddresses, setPayoutAddresses] = useState<Record<string, string>>({});
  const [missingPayouts, setMissingPayouts] = useState<string[]>([]);
  const [isFetchingPayouts, setIsFetchingPayouts] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showStepsPreview, setShowStepsPreview] = useState(false);

  const totalItems = items.length;
  const hasAmounts = Object.values(amounts).some(amount => amount && parseFloat(amount) > 0);
  const hasSelectedTokens = Object.keys(selectedTokens).length > 0;
  const canProceed = hasAmounts && hasSelectedTokens;

  // Update payments when amounts or tokens change
  useEffect(() => {
    updatePayments();
  }, [amounts, selectedTokens, updatePayments]);

  const [balanceCache, setBalanceCache] = useState<Record<string, string>>({});
  const [isFetchingCrossChainBalances, setIsFetchingCrossChainBalances] = useState(false);

  // Update balance cache with current network balances
  useEffect(() => {
    if (!tokenBalances.length) return;
    setBalanceCache((prev) => {
      const next = { ...prev };
      tokenBalances.forEach(({ token, formattedBalance }) => {
        next[`${token.symbol}-${token.chainId}`] = formattedBalance;
      });
      return next;
    });
  }, [tokenBalances]);

  // Fetch cross-chain balances when cart tokens are from multiple chains
  useEffect(() => {
    if (!address || !isConnected || cartChainIds.length === 0) return;

    const fetchCrossChainBalances = async () => {
      setIsFetchingCrossChainBalances(true);
      try {
        const crossChainBalances = await getAllTokensAcrossChains();

        setBalanceCache((prev) => {
          const next = { ...prev };
          crossChainBalances.forEach(({ token, formattedBalance }) => {
            next[`${token.symbol}-${token.chainId}`] = formattedBalance;
          });
          return next;
        });
      } catch (error) {
        console.error("Failed to fetch cross-chain balances:", error);
      } finally {
        setIsFetchingCrossChainBalances(false);
      }
    };

    fetchCrossChainBalances();
  }, [address, isConnected, cartChainIds, getAllTokensAcrossChains]);

  const balanceByTokenKey = useMemo(() => balanceCache, [balanceCache]);

  // Get tokens from current network with positive balances, or from all cart chains if current network has none
  const allAvailableTokens = useMemo(() => {
    const currentNetworkTokens = getTokensByChain(currentChainId);
    const tokensWithBalance: SupportedToken[] = [];

    // First, try to get tokens with balance from the current network
    currentNetworkTokens.forEach(token => {
      const balanceKey = `${token.symbol}-${token.chainId}`;
      const balance = balanceByTokenKey[balanceKey];
      if (balance && parseFloat(balance) > 0) {
        tokensWithBalance.push(token);
      }
    });

    // If no tokens with balance on current network, show all tokens from cart chains
    if (tokensWithBalance.length === 0 && cartChainIds.length > 0) {
      cartChainIds.forEach(chainId => {
        const chainTokens = getTokensByChain(chainId);
        chainTokens.forEach(token => {
          const balanceKey = `${token.symbol}-${token.chainId}`;
          const balance = balanceByTokenKey[balanceKey];
          // Include tokens even with zero balance for better UX when switching networks
          tokensWithBalance.push(token);
        });
      });
    }

    return tokensWithBalance;
  }, [balanceByTokenKey, currentChainId, cartChainIds]);

  // Keep the waitForChain function for backward compatibility but mark as deprecated
  const waitForChain = useCallback(async (target: number, timeout = 30000) => {
    console.log("waitForChain is deprecated, using improved network switching logic");
    // The new switchToNetwork already handles verification, so just return true
    return true;
  }, []);

  const formatAddress = useCallback((address?: string) => {
    if (!address) return "Not configured";
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  }, []);

  const payoutStatusByProject = useMemo(
    () =>
      items.reduce(
        (acc, item) => {
          const address = payoutAddresses[item.uid];
          const isLoading = isFetchingPayouts && !address;
          const hasFailed = !isFetchingPayouts && !address;
          acc[item.uid] = {
            address,
            isLoading,
            isMissing: hasFailed,
          };
          return acc;
        },
        {} as Record<string, { address?: string; isLoading: boolean; isMissing: boolean }>
      ),
    [items, payoutAddresses, isFetchingPayouts]
  );

  const totalsByToken = useMemo(() => {
    const totals = payments.reduce(
      (acc, payment) => {
        const key = `${payment.token.symbol}-${payment.token.chainId}`;
        const amount = parseFloat(payment.amount || "0");
        if (!acc[key]) {
          acc[key] = { token: payment.token, total: 0 };
        }
        acc[key].total += amount;
        return acc;
      },
      {} as Record<string, { token: SupportedToken; total: number }>
    );

    return Object.values(totals).sort(
      (a, b) => a.token.chainId - b.token.chainId
    );
  }, [payments]);

  const resolvePayoutAddress = useCallback(
    (project: IProjectResponse): string | undefined => {
      const payout = project.payoutAddress as
        | string
        | Record<string, string>
        | undefined;

      if (typeof payout === "string" && payout) {
        return payout;
      }

      if (payout && typeof payout === "object") {
        if (communityId && payout[communityId]) {
          return payout[communityId];
        }

        const firstEntry = Object.values(payout).find(
          (value) => typeof value === "string" && value
        );
        if (typeof firstEntry === "string") {
          return firstEntry;
        }
      }

      const grantPayout = project.grants?.find(
        (grant) => grant.details?.data?.payoutAddress
      )?.details?.data?.payoutAddress;
      if (grantPayout) {
        return grantPayout;
      }

      if (project.recipient) {
        return project.recipient as string;
      }

      return undefined;
    },
    [communityId]
  );

  useEffect(() => {
    if (!items.length) {
      setPayoutAddresses({});
      setMissingPayouts([]);
      return;
    }

    let ignore = false;

    const fetchPayoutAddresses = async () => {
      setIsFetchingPayouts(true);
      try {
        const results = await Promise.all(
          items.map(async (item) => {
            const { data } = await gapIndexerApi.projectBySlug(
              item.slug || item.uid
            );
            const address = resolvePayoutAddress(data);
            return { projectId: item.uid, address };
          })
        );

        if (ignore) return;

        const addressMap: Record<string, string> = {};
        const missing: string[] = [];

        results.forEach(({ projectId, address }) => {
          if (address) {
            addressMap[projectId] = address;
          } else {
            missing.push(projectId);
          }
        });

        setPayoutAddresses(addressMap);
        setMissingPayouts(missing);
      } catch (error) {
        if (!ignore) {
          console.error("Failed to load payout addresses", error);
          toast.error("Unable to load payout addresses. Please try again.");
        }
      } finally {
        if (!ignore) {
          setIsFetchingPayouts(false);
        }
      }
    };

    fetchPayoutAddresses();

    return () => {
      ignore = true;
    };
  }, [items, resolvePayoutAddress]);

  const handleTokenSelect = useCallback(
    (projectId: string, token: SupportedToken) => {
      setSelectedToken(projectId, token);

      if (token.chainId !== currentChainId) {
        switchToNetwork(token.chainId);
      }
    },
    [setSelectedToken, currentChainId, switchToNetwork]
  );


  const executeButtonLabel = useMemo(() => {
    if (isSwitching) {
      return "Switching Network...";
    }
    if (isFetchingPayouts) {
      return "Loading payout addresses...";
    }
    if (isFetchingCrossChainBalances) {
      return "Loading cross-chain balances...";
    }
    if (isExecuting) {
      switch (executionState.phase) {
        case "checking":
          return "Checking token approvals...";
        case "approving":
          const progress = executionState.approvalProgress || 0;
          return `Approving tokens... (${Math.round(progress)}%)`;
        case "donating":
          return "Submitting donations...";
        default:
          return "Processing...";
      }
    }
    if (!canProceed) {
      return "Select tokens and amounts";
    }

    return "Review & Send Donations";
  }, [
    isSwitching,
    isFetchingPayouts,
    isFetchingCrossChainBalances,
    isExecuting,
    canProceed,
    executionState.phase,
    executionState.approvalProgress,
  ]);

  const handleExecuteDonations = useCallback(async () => {
    if (!isConnected || !address) {
      toast.error("Connect your wallet to review balances and execute donations.");
      return;
    }

    if (!payments.length) {
      toast.error("Select at least one project and amount to donate.");
      return;
    }

    // Show steps preview first
    setShowStepsPreview(true);
  }, [isConnected, address, payments.length]);

  const handleProceedWithDonations = useCallback(async () => {
    setShowStepsPreview(false);

    const missingAddresses = payments.filter(
      (payment) => !payoutAddresses[payment.projectId]
    );

    if (missingAddresses.length > 0) {
      toast.error("Some projects are missing payout addresses.");
      setMissingPayouts((prev) => Array.from(new Set([...prev, ...missingAddresses.map((p) => p.projectId)])));
      return;
    }

    const targetChainId = payments.find((payment) => payment.chainId)?.chainId;
    if (!targetChainId) {
      toast.error("Unable to determine donation network.");
      return;
    }

    let activeChainId = currentChainId;

    if (activeChainId !== targetChainId) {
      try {
        await switchToNetwork(targetChainId);
        const switched = await waitForChain(targetChainId);
        if (!switched) {
          toast.error("Network switch not detected. Please confirm in your wallet and try again.");
          return;
        }
        activeChainId = targetChainId;
      } catch (error) {
        toast.error("Switch to the required network to continue.");
        return;
      }
    }

    setValidationErrors([]);
    const { valid, errors } = await validatePayments(payments, balanceByTokenKey);
    if (!valid) {
      setValidationErrors(errors);
      toast.error("Insufficient balance for one or more donations.");
      return;
    }

    try {
      const results = await executeDonations(
        payments,
        (projectId) => payoutAddresses[projectId],
        async (payment) => {
          if (payment.chainId && payment.chainId !== activeChainId) {
            console.log(`🔄 Switching from chain ${activeChainId} to chain ${payment.chainId}`);
            try {
              // Use the improved network switching which handles wallet client refresh
              await switchToNetwork(payment.chainId);
              console.log(`✅ Successfully switched to chain ${payment.chainId}`);

              // Critical: Wait for the wallet client to be ready and verified
              let attempts = 0;
              const maxAttempts = 10;

              while (attempts < maxAttempts) {
                const freshWalletClient = await getFreshWalletClient(payment.chainId);

                if (freshWalletClient && freshWalletClient.chain?.id === payment.chainId) {
                  console.log(`✅ Wallet client verified for chain ${payment.chainId} after ${attempts + 1} attempts`);
                  activeChainId = payment.chainId;
                  return; // Success!
                }

                attempts++;
                console.log(`⏳ Waiting for wallet client sync... attempt ${attempts}/${maxAttempts}`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between attempts
              }

              // If we get here, we couldn't verify the wallet client
              throw new Error(`Wallet client failed to sync to chain ${payment.chainId} after ${maxAttempts} attempts. Please ensure your wallet has switched networks.`);

            } catch (error) {
              console.error(`❌ Failed to switch to chain ${payment.chainId}:`, error);
              throw new Error(`Failed to switch to required network (Chain ID: ${payment.chainId}). ${error instanceof Error ? error.message : 'Please try again.'}`);
            }
          }
        }
      );

      const hasFailures = results.some((result) => result.status === "error");
      if (hasFailures) {
        toast.error("Some donations failed. Review the status below.");
      } else {
        const tokensNeedingApproval = approvalInfo.filter(info => info.needsApproval);
        if (tokensNeedingApproval.length > 0) {
          toast.success("Tokens approved successfully! Batch donation submitted.");
        } else {
          toast.success("Batch donation submitted successfully!");
        }
      }
    } catch (error) {
      console.error("Failed to execute donations", error);
      if (error instanceof Error && error.message === "Network switch not detected") {
        toast.error("Network switch not detected. Please confirm the switch in your wallet and try again.");
        return;
      }
      toast.error(error instanceof Error ? error.message : "Failed to execute donations");
    }
  }, [
    payments,
    payoutAddresses,
    currentChainId,
    switchToNetwork,
    validatePayments,
    balanceByTokenKey,
    executeDonations,
    waitForChain,
    getFreshWalletClient,
    approvalInfo,
  ]);

  // Early return after all hooks have been called
  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-6 py-16">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-full p-6">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400 dark:text-gray-500">
            <path d="M3 6h18l-2 13H5L3 6z"/>
            <path d="M8 21h8"/>
          </svg>
        </div>
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Your cart is empty</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Add some projects to your donation cart to get started</p>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Browse Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-blue-950">
      <div className="mx-auto w-full max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-4 -mt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
                  <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
                  <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
                </svg>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <span className="capitalize">{communityId || 'Community'}</span>
                <span>•</span>
                <span>Program Donations</span>
                <span>•</span>
                <span className="font-medium text-gray-900 dark:text-white">{totalItems} {totalItems === 1 ? "project" : "projects"}</span>
              </div>
              <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white ml-2">
                Donation Checkout
              </h1>
            </div>
            <button
              onClick={clear}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 shadow-sm transition hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18l-2 13H5L3 6z"/>
                <path d="M8 21h8"/>
              </svg>
              Clear cart
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(380px,1fr)] lg:items-start">
          <div className="flex flex-col gap-6">

          <DonationApprovalStatus executionState={executionState} />

          <div className="space-y-2">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-3 items-center px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <div className="col-span-4">Project</div>
              <div className="col-span-4">Payment Token</div>
              <div className="col-span-3 text-right">Amount</div>
              <div className="col-span-1"></div>
            </div>

            {items.map((item) => {
              const selectedToken = selectedTokens[item.uid];
              const currentAmount = amounts[item.uid] || "";
              const payoutInfo = payoutStatusByProject[item.uid];
              const networkName = selectedToken
                ? SUPPORTED_NETWORKS[selectedToken.chainId]?.chainName || selectedToken.chainName
                : undefined;
              const balanceKey = selectedToken
                ? `${selectedToken.symbol}-${selectedToken.chainId}`
                : undefined;
              const tokenBalance = balanceKey ? balanceByTokenKey[balanceKey] : undefined;
              const tokenOptions = (() => {
                const base = [...allAvailableTokens];
                if (
                  selectedToken &&
                  !base.some(
                    (token) =>
                      token.symbol === selectedToken.symbol &&
                      token.chainId === selectedToken.chainId
                  )
                ) {
                  base.push(selectedToken);
                }
                return base;
              })();

              return (
                <div
                  key={item.uid}
                  className="group relative overflow-hidden rounded-lg border border-gray-200/60 bg-white/90 p-3 shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-blue-200 hover:shadow-md dark:border-gray-800/60 dark:bg-gray-900/90 dark:hover:border-blue-800"
                >
                  <div className="grid grid-cols-12 gap-3 items-center">
                    {/* Project Info - 4 columns */}
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="relative">
                        <ProfilePicture
                          imageURL={item.imageURL}
                          name={item.title}
                          size="32"
                          className="h-8 w-8 min-h-8 min-w-8 border border-white shadow-sm dark:border-gray-700"
                          alt={item.title}
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border border-white dark:border-gray-900"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={PAGES.PROJECT.OVERVIEW(item.slug || item.uid)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group/link inline-flex items-center gap-1.5"
                        >
                          <h3 className="text-sm font-semibold text-gray-900 transition group-hover/link:text-blue-600 dark:text-gray-100 dark:group-hover/link:text-blue-400 truncate">
                            {item.title}
                          </h3>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 transition group-hover/link:text-blue-500 group-hover/link:translate-x-0.5 dark:text-gray-500 flex-shrink-0">
                            <path d="M7 17L17 7M17 7H7M17 7V17" />
                          </svg>
                        </Link>
                        <div className="flex items-center gap-1 mt-0.5">
                          {payoutInfo?.isLoading ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-xs text-blue-600 dark:bg-blue-900/40 dark:text-blue-200">
                              Loading
                            </span>
                          ) : payoutInfo?.isMissing ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-600 dark:bg-red-900/40 dark:text-red-200">
                              Missing payout
                            </span>
                          ) : (
                            payoutInfo?.address && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                                {formatAddress(payoutInfo.address)}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Token Selection - 4 columns */}
                    <div className="col-span-4">
                      <div className="relative">
                        <select
                          value={selectedToken ? `${selectedToken.symbol}-${selectedToken.chainId}` : ""}
                          onChange={(e) => {
                            const [symbol, chainId] = e.target.value.split("-");
                            const token = tokenOptions.find(
                              (t) => t.symbol === symbol && t.chainId === Number(chainId)
                            );
                            if (token) {
                              handleTokenSelect(item.uid, token);
                            }
                          }}
                          className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        >
                          <option value="">Choose token…</option>
                          {tokenOptions.map((token) => {
                            const key = `${token.symbol}-${token.chainId}`;
                            const balanceValue = balanceByTokenKey[key];
                            const balanceDisplay = balanceValue
                              ? parseFloat(balanceValue).toFixed(4)
                              : "0.0000";
                            return (
                              <option key={key} value={key}>
                                {token.symbol} • {SUPPORTED_NETWORKS[token.chainId]?.chainName || token.chainName} ({balanceDisplay})
                              </option>
                            );
                          })}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                            <path d="M6 9L12 15L18 9"/>
                          </svg>
                        </div>
                      </div>
                      {selectedToken && (
                        <div className="flex items-center gap-1 mt-1">
                          {selectedToken ? (
                            <span className="inline-flex items-center gap-1 rounded bg-gradient-to-r from-blue-50 to-indigo-50 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:from-blue-950/50 dark:to-indigo-950/50 dark:text-blue-300">
                              <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                              {networkName}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>

                    {/* Amount Input - 3 columns */}
                    <div className="col-span-3">
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="0.000001"
                          value={currentAmount}
                          onChange={(e) => setAmount(item.uid, e.target.value)}
                          placeholder="0.00"
                          disabled={!selectedToken}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-right text-sm font-mono font-semibold shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                        {selectedToken && (
                          <div className="absolute inset-y-0 left-2 flex items-center">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              {selectedToken.symbol}
                            </span>
                          </div>
                        )}
                      </div>
                      {selectedToken && tokenBalance && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                          {parseFloat(tokenBalance).toFixed(4)} available
                        </div>
                      )}
                    </div>

                    {/* Remove Button - 1 column */}
                    <div className="col-span-1 flex justify-end">
                      <button
                        onClick={() => remove(item.uid)}
                        className="rounded-full border border-red-200 p-1.5 text-red-600 transition hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-900/20"
                        aria-label={`Remove ${item.title} from cart`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18" />
                          <path d="m8 6-1 14h10L16 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
          {/* Wallet Connection Alert */}
          {(!isConnected || !address) && (
            <div className="rounded-2xl border border-orange-200/60 bg-gradient-to-r from-orange-50 to-amber-50 p-6 shadow-sm dark:border-orange-800/40 dark:from-orange-950/30 dark:to-amber-950/30">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100">Connect Wallet</h3>
                  <p className="mt-1 text-sm text-orange-700 dark:text-orange-200">
                    Connect your wallet to view token balances and submit donations.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Network Support Alert */}
          {!isCurrentNetworkSupported && (
            <div className="rounded-2xl border border-yellow-200/60 bg-gradient-to-r from-yellow-50 to-amber-50 p-6 shadow-sm dark:border-yellow-800/40 dark:from-yellow-950/30 dark:to-amber-950/30">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500 text-white shadow-sm">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">Network Unsupported</h3>
                  <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-200">
                    Switch to a supported network before submitting donations.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Donation Summary */}
          <div className="rounded-2xl border border-gray-200/60 bg-white/90 p-6 shadow-sm backdrop-blur-sm dark:border-gray-800/60 dark:bg-gray-900/90">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Donation Summary</h3>
            </div>
            {totalsByToken.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M8 12h8"/>
                  </svg>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Select tokens and amounts to see your donation totals by network.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {totalsByToken.map(({ token, total }) => (
                  <div
                    key={`${token.symbol}-${token.chainId}`}
                    className="group rounded-xl bg-gradient-to-r from-gray-50 to-blue-50/50 p-4 transition hover:from-blue-50 hover:to-indigo-50 dark:from-gray-800/50 dark:to-blue-950/30 dark:hover:from-blue-950/40 dark:hover:to-indigo-950/40"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-gray-200/50 dark:bg-gray-700 dark:ring-gray-600/50">
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                            {token.symbol.slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{token.symbol}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {SUPPORTED_NETWORKS[token.chainId]?.chainName || token.chainName}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-sm dark:border-gray-800 dark:bg-zinc-950/70 backdrop-blur-sm">
            <div className="flex flex-col gap-4">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 self-start rounded-full border border-gray-200/60 px-4 py-2.5 text-xs font-medium text-gray-600 transition-all duration-200 hover:bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:border-gray-600"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="m15 18-6-6 6-6" />
                </svg>
                Continue exploring
              </button>

              <button
                type="button"
                disabled={
                  !canProceed ||
                  !isCurrentNetworkSupported ||
                  isSwitching ||
                  isExecuting ||
                  isFetchingPayouts ||
                  isFetchingCrossChainBalances ||
                  !isConnected ||
                  !address
                }
                className={`inline-flex h-14 items-center justify-center rounded-full px-8 text-sm font-semibold tracking-wide transition-all duration-200 ${
                  canProceed &&
                  isCurrentNetworkSupported &&
                  !isSwitching &&
                  !isExecuting &&
                  !isFetchingPayouts &&
                  !isFetchingCrossChainBalances &&
                  isConnected &&
                  address
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl transform hover:scale-[1.02]"
                    : "bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400 cursor-not-allowed"
                }`}
                onClick={handleExecuteDonations}
              >
                {isExecuting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {executeButtonLabel}
                  </div>
                )}
              </button>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                  You&apos;ll approve each token once per network and then confirm the batch transfer. Multi-chain donations are processed securely across networks.
                </p>
              </div>
            </div>
          </div>

          {(validationErrors.length > 0 || missingPayouts.length > 0) && (
            <div className="rounded-2xl border border-red-200 bg-red-50/80 p-5 dark:border-red-900/40 dark:bg-red-900/20">
              <h3 className="text-sm font-semibold text-red-700 dark:text-red-200">Action required</h3>
              <div className="mt-3 space-y-2 text-sm text-red-700 dark:text-red-200">
                {missingPayouts.map((projectId) => {
                  const project = items.find((item) => item.uid === projectId);
                  return (
                    <div key={`missing-${projectId}`} className="rounded-xl bg-white/70 px-3 py-2 dark:bg-red-950/20">
                      {project?.title || projectId}: payout address not configured.
                    </div>
                  );
                })}
                {validationErrors.map((error, index) => (
                  <div key={`validation-${index}`} className="rounded-xl bg-white/70 px-3 py-2 dark:bg-red-950/20">
                    {error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {transfers.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white/80 p-5 shadow-sm dark:border-gray-800 dark:bg-zinc-950/70">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Transaction status</h3>
              <div className="mt-3 space-y-3">
                {transfers.map((transfer) => {
                  const project = items.find((item) => item.uid === transfer.projectId);
                  const token = selectedTokens[transfer.projectId];
                  const explorer = token
                    ? `${SUPPORTED_NETWORKS[token.chainId]?.blockExplorer}/tx/${transfer.hash}`
                    : undefined;

                  const statusClasses =
                    transfer.status === "success"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                      : transfer.status === "error"
                      ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200";

                  const statusLabel =
                    transfer.status === "pending"
                      ? "Awaiting confirmation"
                      : transfer.status === "success"
                      ? "Confirmed"
                      : transfer.status === "error"
                      ? transfer.error || "Transaction failed"
                      : "Queued";

                  return (
                    <div key={`${transfer.projectId}-${transfer.hash}`} className="rounded-xl border border-gray-200 bg-white/70 p-4 dark:border-gray-800 dark:bg-zinc-900">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {project?.title || transfer.projectId}
                          </p>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses}`}>
                            {statusLabel}
                          </span>
                        </div>
                        {token && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {token.symbol} on {SUPPORTED_NETWORKS[token.chainId]?.chainName || token.chainName}
                          </p>
                        )}
                        {transfer.hash && explorer && (
                          <a
                            href={explorer}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200"
                          >
                            View transaction
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Steps Preview Modal */}
      {showStepsPreview && (
        <DonationStepsPreview
          payments={payments}
          onProceed={handleProceedWithDonations}
          onCancel={() => setShowStepsPreview(false)}
          isLoading={isExecuting}
        />
      )}
      </div>
    </div>
  );
}
