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
    <div className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6 lg:px-0">
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,2.2fr)_minmax(320px,1fr)] lg:items-start">
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-zinc-950/70 p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">Donation checkout</h1>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Review token selections and payout locations before confirming donations for {totalItems} {totalItems === 1 ? "project" : "projects"}.
                </p>
              </div>
              <button
                onClick={clear}
                className="h-10 rounded-full border border-red-200 px-4 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-900/20"
              >
                Clear cart
              </button>
            </div>
          </div>

          <DonationApprovalStatus executionState={executionState} />

          <div className="space-y-4">
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
                  className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-zinc-950/70 p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <ProfilePicture
                      imageURL={item.imageURL}
                      name={item.title}
                      size="48"
                      className="h-12 w-12 min-h-12 min-w-12 border border-gray-200 dark:border-gray-800"
                      alt={item.title}
                    />
                    <div className="flex-1 min-w-0">
                      <Link
                        href={PAGES.PROJECT.OVERVIEW(item.slug || item.uid)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-2"
                      >
                        <h3 className="truncate text-base font-semibold text-gray-900 transition group-hover:text-blue-600 dark:text-gray-100 dark:group-hover:text-blue-400">
                          {item.title}
                        </h3>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400 group-hover:text-blue-400 dark:text-gray-500">
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        {selectedToken ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-200">
                            {networkName}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                            Select a token
                          </span>
                        )}
                        {payoutInfo?.isLoading ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-blue-600 dark:bg-blue-900/40 dark:text-blue-200">
                            Loading payout address
                          </span>
                        ) : payoutInfo?.isMissing ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-red-600 dark:bg-red-900/40 dark:text-red-200">
                            Payout missing
                          </span>
                        ) : (
                          payoutInfo?.address && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                              {formatAddress(payoutInfo.address)}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => remove(item.uid)}
                      className="rounded-full border border-red-200 p-2 text-red-600 transition hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-900/20"
                      aria-label={`Remove ${item.title} from cart`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18" />
                        <path d="m8 6-1 14h10L16 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                      </svg>
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Token
                      </label>
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
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-zinc-900"
                      >
                        <option value="">Choose a token…</option>
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
                      {selectedToken && (
                        <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                          Balance: {tokenBalance ? parseFloat(tokenBalance).toFixed(4) : "0.0000"} {selectedToken.symbol}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Amount
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.000001"
                        value={currentAmount}
                        onChange={(e) => setAmount(item.uid, e.target.value)}
                        placeholder="0.00"
                        disabled={!selectedToken}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-right text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-zinc-900"
                      />
                      {selectedToken && payoutInfo?.address && (
                        <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                          Destination: {formatAddress(payoutInfo.address)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
          {(!isConnected || !address) && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50/90 p-5 text-sm text-orange-700 dark:border-orange-900/40 dark:bg-orange-900/20 dark:text-orange-200">
              Connect your wallet to view balances and submit donations.
            </div>
          )}

          {!isCurrentNetworkSupported && (
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50/90 p-5 dark:border-yellow-900/50 dark:bg-yellow-900/30">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-8 w-8 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-200 flex items-center justify-center text-sm">
                  !
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-100">Unsupported network</h3>
                  <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-200">
                    Switch to one of the supported networks before submitting your donations.
                  </p>
                </div>
              </div>
            </div>
          )}


          <div className="rounded-2xl border border-gray-200 bg-white/80 p-5 shadow-sm dark:border-gray-800 dark:bg-zinc-950/70">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Donation summary</h3>
            {totalsByToken.length === 0 ? (
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Choose tokens and set amounts to see totals per network.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {totalsByToken.map(({ token, total }) => (
                  <div
                    key={`${token.symbol}-${token.chainId}`}
                    className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold">{token.symbol}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {SUPPORTED_NETWORKS[token.chainId]?.chainName || token.chainName}
                      </span>
                    </div>
                    <span className="font-semibold">{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white/80 p-5 shadow-sm dark:border-gray-800 dark:bg-zinc-950/70">
            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 self-start rounded-full border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-900"
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
              className={`inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-semibold tracking-wide transition-all duration-200 ${
                canProceed &&
                isCurrentNetworkSupported &&
                !isSwitching &&
                !isExecuting &&
                !isFetchingPayouts &&
                !isFetchingCrossChainBalances &&
                isConnected &&
                address
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:from-blue-700 hover:to-indigo-700"
                  : "bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400 cursor-not-allowed"
              }`}
              onClick={handleExecuteDonations}
            >
                {executeButtonLabel}
              </button>

              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                You&apos;ll approve each token once per network and then confirm the batch transfer.
              </p>
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
  );
}
