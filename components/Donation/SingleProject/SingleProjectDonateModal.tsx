"use client";

import { Loader2, Zap } from "lucide-react";
import React, { useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SUPPORTED_TOKENS } from "@/constants/supportedTokens";
import { useSingleProjectDonation } from "@/hooks/donation/useSingleProjectDonation";
import { getPayoutAddressForChain } from "@/src/features/chain-payout-address/hooks/use-chain-payout-address";
import { PaymentMethod } from "@/types/donations";
import { appNetwork } from "@/utilities/network";
import { shortAddress } from "@/utilities/shortAddress";
import { TokenSelector } from "../TokenSelector";
import { PaymentMethodSelector } from "./PaymentMethodSelector";
import type { SingleProjectDonateModalProps } from "./types";

export const SingleProjectDonateModal = React.memo<SingleProjectDonateModalProps>(
  ({ isOpen, onClose, project, initialAmount }) => {
    const {
      paymentMethod,
      selectedToken,
      amount,
      balanceByTokenKey,
      isExecuting,
      canProceed,
      handlePaymentMethodChange,
      handleAmountChange,
      handleProceed,
      setSelectedToken,
    } = useSingleProjectDonation(project, onClose, initialAmount);

    const handleOpenChange = useCallback(
      (open: boolean) => {
        if (!open) {
          onClose();
        }
      },
      [onClose]
    );

    const handleInteractOutside = useCallback(
      (e: Event) => {
        if (isExecuting) {
          e.preventDefault();
        }
      },
      [isExecuting]
    );

    // Memoize configured chain IDs from project's chainPayoutAddress
    const configuredChainIds = useMemo(() => {
      if (!project.chainPayoutAddress) return [];
      return Object.keys(project.chainPayoutAddress).map(Number);
    }, [project.chainPayoutAddress]);

    // Get display names for configured chains
    const configuredChainNames = useMemo(() => {
      return configuredChainIds
        .map((chainId) => {
          const chain = appNetwork.find((c) => c.id === chainId);
          return chain?.name || `Chain ${chainId}`;
        })
        .sort();
    }, [configuredChainIds]);

    // Filter tokens: must have balance AND project must have payout address for that chain
    const tokensWithBalanceAndPayoutSet = useMemo(() => {
      if (configuredChainIds.length === 0) {
        return [];
      }

      return SUPPORTED_TOKENS.filter((token) => {
        const key = `${token.symbol}-${token.chainId}`;
        const balance = balanceByTokenKey[key];
        const hasBalance = balance && parseFloat(balance) > 0;
        const chainConfigured = configuredChainIds.includes(token.chainId);
        return hasBalance && chainConfigured;
      });
    }, [balanceByTokenKey, configuredChainIds]);

    // Get display address for the selected token's chain
    const displayPayoutAddress = useMemo(() => {
      if (!selectedToken || !project.chainPayoutAddress) return "";
      return getPayoutAddressForChain(project.chainPayoutAddress, selectedToken.chainId) || "";
    }, [selectedToken, project.chainPayoutAddress]);

    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-w-md rounded-lg"
          onInteractOutside={handleInteractOutside}
          onEscapeKeyDown={isExecuting ? (e) => e.preventDefault() : undefined}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Support {project.title}
            </DialogTitle>
            {displayPayoutAddress && (
              <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
                Receiving address: {shortAddress(displayPayoutAddress)}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4">
            <PaymentMethodSelector selected={paymentMethod} onSelect={handlePaymentMethodChange} />

            {paymentMethod === PaymentMethod.CRYPTO && (
              <div className="space-y-2">
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select Token
                </span>
                {tokensWithBalanceAndPayoutSet.length > 0 ? (
                  <TokenSelector
                    selectedToken={selectedToken ?? undefined}
                    tokenOptions={tokensWithBalanceAndPayoutSet}
                    balanceByTokenKey={balanceByTokenKey}
                    onTokenSelect={setSelectedToken}
                  />
                ) : configuredChainIds.length > 0 ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400 py-2">
                    <p>You don&apos;t have tokens on the chains this project accepts:</p>
                    <ul className="list-disc list-inside mt-1 ml-2">
                      {configuredChainNames.map((name) => (
                        <li key={name}>{name}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                    This project hasn't set up donation addresses yet.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="donation-amount"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Amount {selectedToken ? `(${selectedToken.symbol})` : ""}
              </label>
              <input
                id="donation-amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={handleAmountChange}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            <Button
              onClick={handleProceed}
              disabled={!canProceed || isExecuting || tokensWithBalanceAndPayoutSet.length === 0}
              className="w-full bg-brand-blue hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExecuting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin h-4 w-4" />
                  Processing...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4" />
                  Send Donation
                </span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
);

SingleProjectDonateModal.displayName = "SingleProjectDonateModal";
