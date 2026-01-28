"use client";

import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { type FC, Fragment, useCallback, useEffect, useMemo, useState } from "react";
import type { Address } from "viem";
import { useAccount, useSwitchChain } from "wagmi";
import { errorManager } from "@/components/Utilities/errorManager";
import { Button } from "@/components/ui/button";
import { useKarmaSeeds, useKarmaSeedsStats, usePreviewBuy } from "@/hooks/useKarmaSeeds";
import { useBuyKarmaSeeds } from "@/hooks/useKarmaSeedsContract";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { useProjectStore } from "@/store";
import { useKarmaSeedsModalStore } from "@/store/modals/karmaSeeds";
import { KARMA_SEEDS_CONFIG } from "@/types/karmaSeeds";
import { cn } from "@/utilities/tailwind";

const inputStyle =
  "bg-gray-100 border border-gray-400 rounded-md p-3 dark:bg-zinc-900 w-full text-lg";
const labelStyle = "text-slate-700 text-sm font-bold leading-tight dark:text-slate-200";

const STABLECOINS = ["USDC", "USDT", "cUSD", "USDGLO"];

export const BuySeedsDialog: FC = () => {
  const { isBuyModalOpen: isOpen, closeBuyModal: closeModal } = useKarmaSeedsModalStore();

  const project = useProjectStore((state) => state.project);
  const { address, chain } = useAccount();
  const { switchChain } = useSwitchChain();

  // Auto-switch to Base when dialog opens
  useEffect(() => {
    if (isOpen && chain?.id !== KARMA_SEEDS_CONFIG.chainID) {
      switchChain?.({ chainId: KARMA_SEEDS_CONFIG.chainID });
    }
  }, [isOpen, chain?.id, switchChain]);

  const [amount, setAmount] = useState<string>("");
  const [selectedTokenSymbol, setSelectedTokenSymbol] = useState<string>("ETH");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const { data: karmaSeeds } = useKarmaSeeds(project?.uid);

  const contractAddress = karmaSeeds?.contractAddress as Address | undefined;

  const {
    buyWithEth,
    buyWithStablecoin,
    buyWithToken,
    state: buyState,
    reset: resetBuy,
    isLoading: isBuying,
  } = useBuyKarmaSeeds(contractAddress);

  // Use API for stats instead of direct contract calls
  const { data: stats } = useKarmaSeedsStats(project?.uid, !!karmaSeeds);

  const totalSupply = stats?.totalSupply || "0";
  const maxSupply = stats?.maxSupply || "0";
  const ethPrice = stats?.ethPrice;

  // Get user's token balances on Base
  const { tokensWithBalance, isLoading: balancesLoading } = useTokenBalances(
    KARMA_SEEDS_CONFIG.chainID
  );

  // Find selected token data
  const selectedToken = useMemo(() => {
    return tokensWithBalance.find((t) => t.token.symbol === selectedTokenSymbol);
  }, [tokensWithBalance, selectedTokenSymbol]);

  const currentBalance = selectedToken?.formattedBalance || "0";
  const selectedDecimals = selectedToken?.token.decimals || 18;
  const isNativeToken = selectedToken?.token.isNative || selectedTokenSymbol === "ETH";
  const tokenAddress = selectedToken?.token.address as Address | undefined;

  // Get the payment token for the API (ETH or contract address)
  const paymentToken = useMemo(() => {
    if (isNativeToken) return "ETH";
    return tokenAddress || "";
  }, [isNativeToken, tokenAddress]);

  // Use API for preview calculation instead of direct contract calls
  const { data: previewData } = usePreviewBuy(
    project?.uid,
    paymentToken,
    amount,
    selectedDecimals,
    !!karmaSeeds && !!amount && parseFloat(amount) > 0
  );

  const previewTokens = previewData?.tokensToReceive || "0";

  // Set default token when balances load
  useEffect(() => {
    if (tokensWithBalance.length > 0 && !selectedToken) {
      // Prefer ETH, then USDC, then first available
      const eth = tokensWithBalance.find((t) => t.token.symbol === "ETH");
      const usdc = tokensWithBalance.find((t) => t.token.symbol === "USDC");
      if (eth) {
        setSelectedTokenSymbol("ETH");
      } else if (usdc) {
        setSelectedTokenSymbol("USDC");
      } else {
        setSelectedTokenSymbol(tokensWithBalance[0].token.symbol);
      }
    }
  }, [tokensWithBalance, selectedToken]);

  const handleAmountChange = useCallback((value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, "");
    const parts = sanitized.split(".");
    const formatted = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : sanitized;
    setAmount(formatted);
    setErrorMessage("");
  }, []);

  const handleTokenChange = useCallback((symbol: string) => {
    setSelectedTokenSymbol(symbol);
    setAmount("");
    setErrorMessage("");
  }, []);

  const handleClose = () => {
    if (isBuying) {
      return;
    }
    closeModal();
    resetForm();
  };

  const resetForm = () => {
    setAmount("");
    setSelectedTokenSymbol("ETH");
    setErrorMessage("");
    resetBuy();
  };

  const handleBuy = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setErrorMessage("Please enter a valid amount");
      return;
    }

    if (parseFloat(amount) > parseFloat(currentBalance)) {
      setErrorMessage("Insufficient balance");
      return;
    }

    if (chain?.id !== KARMA_SEEDS_CONFIG.chainID) {
      setErrorMessage("Please switch to Base network");
      return;
    }

    setErrorMessage("");

    try {
      if (isNativeToken) {
        await buyWithEth({ ethAmount: amount });
      } else if (STABLECOINS.includes(selectedTokenSymbol)) {
        await buyWithStablecoin({
          stablecoinAddress: tokenAddress!,
          amount,
          decimals: selectedDecimals,
        });
      } else {
        await buyWithToken({
          tokenAddress: tokenAddress!,
          amount,
          decimals: selectedDecimals,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Transaction failed";
      setErrorMessage(message);
      errorManager("Error buying Karma Seeds", error, {
        project: project?.details?.slug || project?.uid,
        amount,
        token: selectedTokenSymbol,
        address,
      });
    }
  };

  const getStatusContent = () => {
    if (buyState.phase === "approving") {
      return (
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
          <p className="text-lg font-medium text-gray-900 dark:text-zinc-100">
            Approving {selectedTokenSymbol}...
          </p>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Please confirm the approval in your wallet
          </p>
        </div>
      );
    }

    if (buyState.phase === "pending" || buyState.phase === "confirming") {
      return (
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
          <p className="text-lg font-medium text-gray-900 dark:text-zinc-100">
            Buying Karma Seeds...
          </p>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            {buyState.phase === "pending"
              ? "Please confirm the transaction in your wallet"
              : "Waiting for confirmation..."}
          </p>
        </div>
      );
    }

    if (buyState.phase === "success") {
      return (
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <div className="rounded-full h-12 w-12 bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <svg
              className="h-6 w-6 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-lg font-medium text-gray-900 dark:text-zinc-100">
            Purchase Successful!
          </p>
          <p className="text-sm text-gray-500 dark:text-zinc-400 text-center">
            You have successfully purchased Karma Seeds.
          </p>
          <Button onClick={handleClose} className="mt-4">
            Close
          </Button>
        </div>
      );
    }

    return null;
  };

  if (!project || !karmaSeeds) return null;

  const isProcessing = buyState.phase !== "idle" && buyState.phase !== "error";
  const statusContent = getStatusContent();

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle transition-all">
                {statusContent ? (
                  statusContent
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-6">
                      <Dialog.Title
                        as="h3"
                        className="text-xl font-semibold leading-6 text-gray-900 dark:text-zinc-100"
                      >
                        Buy Karma Seeds
                      </Dialog.Title>
                      <button
                        type="button"
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-500"
                        disabled={isProcessing}
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    </div>

                    <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                      <p className="text-sm text-emerald-700 dark:text-emerald-300">
                        Support <strong>{project.details?.title}</strong> by purchasing Karma Seeds.
                        Each seed costs $1 USD equivalent.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <span className={labelStyle}>Payment Token</span>
                        {balancesLoading ? (
                          <div className="flex gap-2 mt-2">
                            <div className="h-10 bg-gray-200 dark:bg-zinc-700 rounded-lg animate-pulse flex-1" />
                          </div>
                        ) : tokensWithBalance.length === 0 ? (
                          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2">
                            No tokens with balance found on Base network
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {tokensWithBalance.map((tokenBalance) => (
                              <button
                                key={`${tokenBalance.token.symbol}-${tokenBalance.token.address}`}
                                type="button"
                                onClick={() => handleTokenChange(tokenBalance.token.symbol)}
                                className={cn(
                                  "py-2 px-3 rounded-lg border-2 transition-colors flex flex-col items-center min-w-[70px]",
                                  selectedTokenSymbol === tokenBalance.token.symbol
                                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30"
                                    : "border-gray-200 dark:border-zinc-600 hover:border-gray-300"
                                )}
                                disabled={isProcessing}
                              >
                                <span className="font-medium text-gray-900 dark:text-zinc-100 text-sm">
                                  {tokenBalance.token.symbol}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-zinc-400">
                                  {parseFloat(tokenBalance.formattedBalance).toFixed(4)}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label htmlFor="seeds-amount" className={labelStyle}>
                            Amount ({selectedTokenSymbol})
                          </label>
                          <span className="text-xs text-gray-500 dark:text-zinc-400">
                            Balance: {parseFloat(currentBalance).toFixed(4)} {selectedTokenSymbol}
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            id="seeds-amount"
                            type="text"
                            value={amount}
                            onChange={(e) => handleAmountChange(e.target.value)}
                            placeholder="0.00"
                            className={cn(inputStyle, errorMessage && "border-red-500")}
                            disabled={isProcessing}
                          />
                          <button
                            type="button"
                            onClick={() => handleAmountChange(currentBalance)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
                            disabled={isProcessing}
                          >
                            MAX
                          </button>
                        </div>
                        {errorMessage && (
                          <p className="text-red-500 text-sm mt-1">{errorMessage}</p>
                        )}
                      </div>

                      <div className="bg-gray-50 dark:bg-zinc-900 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500 dark:text-zinc-400">
                            You will receive
                          </span>
                          <span className="text-lg font-bold text-gray-900 dark:text-zinc-100">
                            {parseFloat(previewTokens).toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}{" "}
                            Seeds
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-2 text-xs text-gray-500 dark:text-zinc-400">
                          <span>Token</span>
                          <span>{karmaSeeds.tokenSymbol}</span>
                        </div>
                        {selectedTokenSymbol === "ETH" && ethPrice && (
                          <div className="flex justify-between items-center mt-1 text-xs text-gray-500 dark:text-zinc-400">
                            <span>ETH Price</span>
                            <span>${parseFloat(ethPrice).toFixed(2)}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-gray-500 dark:text-zinc-400 space-y-1">
                        <div className="flex justify-between">
                          <span>Total Raised</span>
                          <span>${parseFloat(totalSupply).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Max Supply</span>
                          <span>
                            {parseFloat(maxSupply) > 0
                              ? `$${parseFloat(maxSupply).toLocaleString()}`
                              : "Unlimited"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Network</span>
                          <span>Base</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 pt-4">
                        <Button
                          onClick={handleBuy}
                          disabled={
                            !amount ||
                            parseFloat(amount) <= 0 ||
                            isProcessing ||
                            chain?.id !== KARMA_SEEDS_CONFIG.chainID ||
                            tokensWithBalance.length === 0
                          }
                          className="w-full bg-emerald-600 hover:bg-emerald-700"
                        >
                          {chain?.id !== KARMA_SEEDS_CONFIG.chainID
                            ? "Switch to Base Network"
                            : `Buy ${previewTokens !== "0" ? parseFloat(previewTokens).toFixed(2) : ""} Seeds`}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleClose}
                          disabled={isProcessing}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default BuySeedsDialog;
