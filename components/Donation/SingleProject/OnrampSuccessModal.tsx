"use client";

import { Check, ExternalLink, X } from "lucide-react";
import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import type { StripeOnrampSessionData } from "@/hooks/donation/types";
import { DonationStatus } from "@/hooks/donation/types";
import { useDonationPolling } from "@/hooks/donation/useDonationPolling";
import { getExplorerUrl, NETWORK_CHAIN_IDS } from "@/utilities/network";

interface OnrampSuccessModalProps {
  sessionData: StripeOnrampSessionData;
  network: string;
  donationUid: string | null;
  chainId: number;
  pollingToken?: string | null;
  onClose: () => void;
}

type StepState = "completed" | "active" | "pending" | "failed";

function StepIcon({ state }: { state: StepState }) {
  if (state === "completed") {
    return (
      <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white">
        <Check className="h-4 w-4" strokeWidth={3} />
      </div>
    );
  }
  if (state === "failed") {
    return (
      <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white">
        <X className="h-4 w-4" strokeWidth={3} />
      </div>
    );
  }
  if (state === "active") {
    return (
      <div className="relative flex h-8 w-8 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-blue/30" />
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-brand-blue bg-white dark:bg-zinc-900">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-blue" />
        </span>
      </div>
    );
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900">
      <span className="h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-zinc-600" />
    </div>
  );
}

function ProgressStepper({
  step1,
  step2,
  step3,
}: {
  step1: StepState;
  step2: StepState;
  step3: StepState;
}) {
  const steps = [
    { state: step1, label: "Payment" },
    { state: step2, label: "Delivering" },
    { state: step3, label: "Done" },
  ];

  return (
    <div className="flex items-center w-full px-4">
      {steps.map((step, i) => (
        <React.Fragment key={step.label}>
          <div className="flex flex-col items-center gap-1.5">
            <StepIcon state={step.state} />
            <span
              className={`text-xs font-medium ${
                step.state === "completed"
                  ? "text-green-600 dark:text-green-400"
                  : step.state === "active"
                    ? "text-brand-blue"
                    : step.state === "failed"
                      ? "text-red-500"
                      : "text-gray-400 dark:text-zinc-500"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="flex-1 h-0.5 mx-1">
              <div
                className={`h-full transition-all duration-700 ease-out ${
                  steps[i + 1].state !== "pending"
                    ? "bg-brand-blue"
                    : "bg-gray-200 dark:bg-zinc-700"
                }`}
              />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export const OnrampSuccessModal = React.memo<OnrampSuccessModalProps>(
  ({ sessionData, network, donationUid, chainId, pollingToken, onClose }) => {
    const txDetails = sessionData.transaction_details;

    const {
      donation,
      isPolling,
      status: polledStatus,
      error: pollingError,
    } = useDonationPolling({
      donationUid,
      chainId,
      pollingToken: pollingToken ?? undefined,
    });

    // Polled backend status takes precedence when available.
    // Stripe's fulfillment_complete is only used as fallback before first poll response.
    const resolvedStatus = useMemo(() => {
      if (polledStatus) {
        if (polledStatus === DonationStatus.COMPLETED) return "completed" as const;
        if (polledStatus === DonationStatus.FAILED) return "failed" as const;
        return "delivering" as const;
      }
      if (sessionData.status === "fulfillment_complete") return "completed" as const;
      return "delivering" as const;
    }, [polledStatus, sessionData.status]);

    const resolvedChainId = useMemo(() => {
      const networkKey = txDetails?.destination_network?.toLowerCase() || network.toLowerCase();
      return NETWORK_CHAIN_IDS[networkKey] || NETWORK_CHAIN_IDS["base"];
    }, [txDetails?.destination_network, network]);

    const explorerUrl = useMemo(() => {
      const txHash = donation?.transactionHash || txDetails?.transaction_id;
      if (!txHash) return null;
      return getExplorerUrl(resolvedChainId, txHash);
    }, [resolvedChainId, donation?.transactionHash, txDetails?.transaction_id]);

    const formattedFiatAmount = useMemo(() => {
      const sourceAmount = txDetails?.source_amount;
      if (!sourceAmount) return null;
      const amount = parseFloat(sourceAmount);
      if (Number.isNaN(amount)) return null;
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: txDetails?.source_currency?.toUpperCase() || "USD",
      }).format(amount);
    }, [txDetails?.source_amount, txDetails?.source_currency]);

    const cryptoAmount = useMemo(() => {
      const destAmount = donation?.amount || txDetails?.destination_amount;
      if (!destAmount) return null;
      const amount = parseFloat(destAmount);
      if (Number.isNaN(amount)) return null;
      const currency =
        donation?.tokenSymbol || txDetails?.destination_currency?.toUpperCase() || "USDC";
      return `${amount.toFixed(amount % 1 === 0 ? 2 : 6)} ${currency}`;
    }, [
      donation?.amount,
      donation?.tokenSymbol,
      txDetails?.destination_amount,
      txDetails?.destination_currency,
    ]);

    const networkName = txDetails?.destination_network || network;

    const step1: StepState = "completed";
    const step2: StepState =
      resolvedStatus === "failed"
        ? "failed"
        : resolvedStatus === "completed"
          ? "completed"
          : "active";
    const step3: StepState = resolvedStatus === "completed" ? "completed" : "pending";

    const title =
      resolvedStatus === "completed"
        ? "Donation Complete"
        : resolvedStatus === "failed"
          ? "Donation Failed"
          : "Payment Successful";

    const subtitle =
      resolvedStatus === "completed"
        ? "Your donation has been delivered"
        : resolvedStatus === "failed"
          ? "Something went wrong delivering your donation"
          : "Crypto is being delivered to the project";

    const statusLabel =
      resolvedStatus === "completed"
        ? "Completed"
        : resolvedStatus === "failed"
          ? "Failed"
          : "Delivering";
    const statusColors =
      resolvedStatus === "completed"
        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
        : resolvedStatus === "failed"
          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    const statusDot =
      resolvedStatus === "completed"
        ? "bg-green-500"
        : resolvedStatus === "failed"
          ? "bg-red-500"
          : "bg-yellow-500";

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onramp-success-title"
      >
        <div className="relative w-full max-w-md mx-4 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl overflow-hidden">
          <div className="absolute top-3 right-3 z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-6 pt-10 space-y-6">
            <div className="text-center">
              {formattedFiatAmount && (
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formattedFiatAmount}
                </h2>
              )}
              <p
                id="onramp-success-title"
                className="text-sm text-gray-500 dark:text-zinc-400 mt-1"
              >
                {title} &mdash; {subtitle}
              </p>
            </div>

            <ProgressStepper step1={step1} step2={step2} step3={step3} />

            <div className="rounded-lg bg-gray-50 dark:bg-zinc-800 p-4 space-y-3">
              {cryptoAmount && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-zinc-400">Crypto Amount</span>
                  <span className="font-medium text-gray-900 dark:text-white">{cryptoAmount}</span>
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-zinc-400">Network</span>
                <span className="font-medium text-gray-900 dark:text-white capitalize">
                  {networkName}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-zinc-400">Status</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
                  {statusLabel}
                </span>
              </div>

              {explorerUrl && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-zinc-400">Transaction</span>
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-brand-blue hover:underline"
                  >
                    View
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>

            {isPolling && (
              <p className="text-center text-xs text-gray-400 dark:text-zinc-500">
                Checking status...
              </p>
            )}

            {pollingError && !isPolling && (
              <p className="text-center text-xs text-red-500 dark:text-red-400">
                Unable to check donation status. Please check back later.
              </p>
            )}

            <Button onClick={onClose} className="w-full bg-brand-blue hover:bg-blue-600">
              Done & Close
            </Button>
          </div>
        </div>
      </div>
    );
  }
);

OnrampSuccessModal.displayName = "OnrampSuccessModal";
