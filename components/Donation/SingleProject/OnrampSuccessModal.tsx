"use client";

import { CheckCircle, ExternalLink, Loader2, X } from "lucide-react";
import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import type { StripeOnrampSessionData } from "@/hooks/donation/types";
import { getExplorerUrl, NETWORK_CHAIN_IDS } from "@/utilities/network";

interface OnrampSuccessModalProps {
  sessionData: StripeOnrampSessionData;
  network: string;
  onClose: () => void;
}

export const OnrampSuccessModal = React.memo<OnrampSuccessModalProps>(
  ({ sessionData, network, onClose }) => {
    const txDetails = sessionData.transaction_details;
    const isProcessing = sessionData.status === "fulfillment_processing";
    const isComplete = sessionData.status === "fulfillment_complete";

    const chainId = useMemo(() => {
      const networkKey = txDetails?.destination_network?.toLowerCase() || network.toLowerCase();
      return NETWORK_CHAIN_IDS[networkKey] || 8453;
    }, [txDetails?.destination_network, network]);

    const explorerUrl = useMemo(() => {
      if (!txDetails?.transaction_id) return null;
      return getExplorerUrl(chainId, txDetails.transaction_id);
    }, [chainId, txDetails?.transaction_id]);

    const formattedAmount = useMemo(() => {
      if (!txDetails?.source_amount) return null;
      const amount = parseFloat(txDetails.source_amount);
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: txDetails.source_currency?.toUpperCase() || "USD",
      }).format(amount);
    }, [txDetails?.source_amount, txDetails?.source_currency]);

    const cryptoAmount = useMemo(() => {
      if (!txDetails?.destination_amount) return null;
      const amount = parseFloat(txDetails.destination_amount);
      const currency = txDetails.destination_currency?.toUpperCase() || "USDC";
      return `${amount.toFixed(6)} ${currency}`;
    }, [txDetails?.destination_amount, txDetails?.destination_currency]);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="relative w-full max-w-md mx-4 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-zinc-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isProcessing ? "Payment Successful" : "Donation Complete"}
            </h3>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 inline-flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 p-4">
                {isProcessing ? (
                  <Loader2 className="h-12 w-12 text-green-600 dark:text-green-400 animate-spin" />
                ) : (
                  <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
                )}
              </div>

              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {isProcessing ? "Processing Your Donation" : "Thank You!"}
              </h2>

              <p className="text-gray-600 dark:text-gray-400">
                {isProcessing
                  ? "Your payment was successful. Crypto is being delivered to the project."
                  : "Your donation has been successfully delivered."}
              </p>
            </div>

            <div className="rounded-lg bg-gray-50 dark:bg-zinc-800 p-4 space-y-3">
              {formattedAmount && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Amount Paid</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formattedAmount}
                  </span>
                </div>
              )}

              {cryptoAmount && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Crypto Amount</span>
                  <span className="font-medium text-gray-900 dark:text-white">{cryptoAmount}</span>
                </div>
              )}

              {txDetails?.destination_network && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Network</span>
                  <span className="font-medium text-gray-900 dark:text-white capitalize">
                    {txDetails.destination_network}
                  </span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Status</span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                    isComplete
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  }`}
                >
                  {isProcessing && <Loader2 className="h-3 w-3 animate-spin" />}
                  {isComplete && <CheckCircle className="h-3 w-3" />}
                  {isProcessing ? "Delivering" : "Completed"}
                </span>
              </div>
            </div>

            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-lg border border-gray-200 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
              >
                View Transaction
                <ExternalLink className="h-4 w-4" />
              </a>
            )}

            <Button onClick={onClose} className="w-full bg-brand-blue hover:bg-blue-600">
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }
);

OnrampSuccessModal.displayName = "OnrampSuccessModal";
