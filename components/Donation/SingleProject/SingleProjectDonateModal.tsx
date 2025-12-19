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
import { PaymentMethod } from "@/types/donations";
import { TokenSelector } from "../TokenSelector";
import { PaymentMethodSelector } from "./PaymentMethodSelector";
import type { SingleProjectDonateModalProps } from "./types";

export const SingleProjectDonateModal = React.memo<SingleProjectDonateModalProps>(
  ({ isOpen, onClose, project }) => {
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
    } = useSingleProjectDonation(project, onClose);

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

    // Filter tokens to only show those with balance > 0
    const tokensWithBalance = useMemo(() => {
      return SUPPORTED_TOKENS.filter((token) => {
        const key = `${token.symbol}-${token.chainId}`;
        const balance = balanceByTokenKey[key];
        return balance && parseFloat(balance) > 0;
      });
    }, [balanceByTokenKey]);

    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-w-md rounded-lg"
          onInteractOutside={handleInteractOutside}
          onEscapeKeyDown={isExecuting ? (e) => e.preventDefault() : undefined}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Support this project
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {project.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <PaymentMethodSelector selected={paymentMethod} onSelect={handlePaymentMethodChange} />

            {paymentMethod === PaymentMethod.CRYPTO && (
              <div className="space-y-2">
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select Token
                </span>
                {tokensWithBalance.length > 0 ? (
                  <TokenSelector
                    selectedToken={selectedToken ?? undefined}
                    tokenOptions={tokensWithBalance}
                    balanceByTokenKey={balanceByTokenKey}
                    onTokenSelect={setSelectedToken}
                  />
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                    No tokens with balance found. Please fund your wallet first.
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
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={handleAmountChange}
                step="0.01"
                min="0"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            <Button
              onClick={handleProceed}
              disabled={!canProceed || isExecuting || tokensWithBalance.length === 0}
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

            <p className="text-center text-xs text-gray-500 dark:text-gray-400">
              100% of your donation goes directly to the project
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
);

SingleProjectDonateModal.displayName = "SingleProjectDonateModal";
