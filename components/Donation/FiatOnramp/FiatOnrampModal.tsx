"use client";

import { MoonPayBuyWidget } from "@moonpay/moonpay-react";
import { AlertTriangle, CreditCard } from "lucide-react";
import React, { useCallback, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMoonPaySignature } from "@/hooks/useMoonPaySignature";
import {
  getAllowedMoonPayCurrencies,
  getMoonPayCurrencyCode,
  toMoonPayNetworkName,
} from "@/utilities/moonpay";
import type { FiatOnrampModalProps } from "./types";

export const FiatOnrampModal = React.memo<FiatOnrampModalProps>(
  ({ isOpen, onClose, project, fiatAmount, defaultCrypto = "ETH" }) => {
    const [isProcessing, setIsProcessing] = useState(true);
    const selectedNetwork = toMoonPayNetworkName(project.chainID);
    const currencyCode = getMoonPayCurrencyCode(defaultCrypto, selectedNetwork);
    const getSignature = useMoonPaySignature();

    const handleClose = useCallback(() => {
      if (!isProcessing) {
        onClose();
      }
    }, [onClose, isProcessing]);

    const handleTransactionCreated = useCallback(async () => {
      setIsProcessing(false);
    }, []);

    const handleTransactionCompleted = useCallback(async () => {
      setIsProcessing(false);
    }, []);

    const allowedCurrencies = getAllowedMoonPayCurrencies();

    const truncateAddress = (address: string) =>
      `${address.slice(0, 6)}...${address.slice(-4)}`;

    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent
          className="max-w-4xl h-[85vh] flex flex-col overflow-hidden p-0"
          onInteractOutside={(e) => {
            if (isProcessing) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-r from-purple-50 to-white dark:from-purple-950/20 dark:to-background border-b">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-moonpay-purple">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <DialogTitle className="text-2xl font-semibold">
                Pay with Card
              </DialogTitle>
            </div>
            <DialogDescription className="flex items-center gap-2 text-base">
              <span>Purchase crypto with your debit or credit card</span>
              <span className="mx-1">•</span>
              <span>Powered by</span>
              <span className="font-semibold text-moonpay-purple">
                MoonPay
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="mx-6 mt-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                  Important: Third-Party Donation Address
                </p>
                <p className="text-amber-700 dark:text-amber-300">
                  Your donation will be sent to {project.title}'s wallet:{" "}
                  <code className="bg-amber-100 dark:bg-amber-900 px-1.5 py-0.5 rounded text-xs font-mono">
                    {truncateAddress(project.payoutAddress)}
                  </code>
                </p>
                <p className="text-amber-700 dark:text-amber-300 mt-1">
                  MoonPay may require additional verification steps for
                  donations to third-party wallets. This process helps prevent
                  fraud and ensures your funds reach the intended recipient.
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden px-6 pb-6 mt-4">
            <div className="w-full h-full relative rounded-lg overflow-hidden border border-border">
              <MoonPayBuyWidget
                variant="embedded"
                baseCurrencyCode="usd"
                baseCurrencyAmount={fiatAmount.toString()}
                defaultCurrencyCode={currencyCode}
                walletAddress={project.payoutAddress}
                showOnlyCurrencies={allowedCurrencies}
                onUrlSignatureRequested={getSignature}
                onTransactionCreated={handleTransactionCreated}
                onTransactionCompleted={handleTransactionCompleted}
                visible
                className="w-full h-full"
                style={{
                  width: "100%",
                  height: "100%",
                  minHeight: "500px",
                  border: "none",
                }}
              />
            </div>
          </div>

          {isProcessing && (
            <div className="absolute inset-x-0 bottom-0 bg-blue-50 dark:bg-blue-950/20 border-t border-blue-200 dark:border-blue-800 px-6 py-3">
              <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <span className="animate-pulse">●</span>
                Transaction in progress... Please do not close this window.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }
);

FiatOnrampModal.displayName = "FiatOnrampModal";
