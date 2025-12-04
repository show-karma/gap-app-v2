"use client";

import React, { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { type Hex, isAddress } from "viem";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getAllSupportedChains,
  SUPPORTED_TOKENS,
  type SupportedToken,
} from "@/constants/supportedTokens";
import type { CreateDonationRequest } from "@/hooks/donation/types";
import { useCreateDonation } from "@/hooks/donation/useCreateDonation";
import { useCrossChainBalances } from "@/hooks/donation/useCrossChainBalances";
import { useDonationTransfer } from "@/hooks/useDonationTransfer";
import { useProjectStore } from "@/store";
import { DonationType, PaymentMethod } from "@/types/donations";
import type { DonationPayment } from "@/utilities/donations/donationExecution";
import { FiatOnrampModal } from "../FiatOnramp/FiatOnrampModal";
import { TokenSelector } from "../TokenSelector";
import { PaymentMethodSelector } from "./PaymentMethodSelector";
import type { SingleProjectDonateModalProps } from "./types";

function resolvePayoutAddress(
  payoutAddress: Hex | string | Record<string, string> | undefined,
  communityContract?: string
): string {
  if (!payoutAddress) return "";

  if (typeof payoutAddress === "string") {
    return isAddress(payoutAddress) ? payoutAddress : "";
  }

  if (typeof payoutAddress === "object") {
    if (communityContract && payoutAddress[communityContract]) {
      const addr = payoutAddress[communityContract];
      return typeof addr === "string" && isAddress(addr) ? addr : "";
    }

    const firstValidAddress = Object.values(payoutAddress).find(
      (addr) => typeof addr === "string" && isAddress(addr)
    );
    return firstValidAddress || "";
  }

  return "";
}

export const SingleProjectDonateModal = React.memo<SingleProjectDonateModalProps>(
  ({ isOpen, onClose, project }) => {
    const { address } = useAccount();
    const currentChainId = useChainId();
    const { switchChainAsync } = useSwitchChain();
    const { executeDonations, isExecuting } = useDonationTransfer();
    const { mutateAsync: createDonation } = useCreateDonation();
    const fullProject = useProjectStore((state) => state.project);

    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CRYPTO);
    const [selectedToken, setSelectedToken] = useState<SupportedToken | null>(null);
    const [amount, setAmount] = useState("");
    const [showOnrampModal, setShowOnrampModal] = useState(false);

    const supportedChains = useMemo(() => getAllSupportedChains(), []);
    const { balanceByTokenKey } = useCrossChainBalances(currentChainId ?? null, supportedChains);

    const communityContract = useMemo(() => {
      if (!fullProject?.grants || fullProject.grants.length === 0) return undefined;
      return fullProject.grants[0]?.community?.uid;
    }, [fullProject?.grants]);

    const resolvedPayoutAddress = useMemo(
      () =>
        resolvePayoutAddress(
          project.payoutAddress as Hex | string | Record<string, string>,
          communityContract
        ),
      [project.payoutAddress, communityContract]
    );

    const handlePaymentMethodChange = useCallback((method: PaymentMethod) => {
      setPaymentMethod(method);
    }, []);

    const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setAmount(e.target.value);
    }, []);

    const isValidAmount = useMemo(() => {
      const numAmount = parseFloat(amount);
      return !isNaN(numAmount) && numAmount > 0;
    }, [amount]);

    const canProceed = useMemo(() => {
      if (paymentMethod === PaymentMethod.CRYPTO) {
        return selectedToken && isValidAmount && address;
      }
      return isValidAmount;
    }, [paymentMethod, selectedToken, isValidAmount, address]);

    const handleProceed = useCallback(async () => {
      if (!canProceed) return;

      if (paymentMethod === PaymentMethod.FIAT) {
        setShowOnrampModal(true);
        onClose();
        return;
      }

      if (!selectedToken || !address) return;

      const payment: DonationPayment = {
        projectId: project.uid,
        amount,
        token: selectedToken,
        chainId: selectedToken.chainId,
      };

      try {
        if (currentChainId !== selectedToken.chainId) {
          await switchChainAsync({ chainId: selectedToken.chainId });
        }

        const results = await executeDonations([payment], () => resolvedPayoutAddress);

        const successfulResult = results.find(
          (r) => r.status === "success" && r.projectId === project.uid
        );

        if (successfulResult) {
          const donationRequest: CreateDonationRequest = {
            uid: `${successfulResult.hash}-${project.uid}`,
            chainID: selectedToken.chainId,
            donorAddress: address,
            projectUID: project.uid,
            payoutAddress: resolvedPayoutAddress,
            amount,
            tokenSymbol: selectedToken.symbol,
            tokenAddress: selectedToken.isNative ? undefined : selectedToken.address,
            transactionHash: successfulResult.hash,
            donationType: DonationType.CRYPTO,
            metadata: {
              tokenDecimals: selectedToken.decimals,
              tokenName: selectedToken.name,
              chainName: selectedToken.chainName,
            },
          };

          try {
            await createDonation(donationRequest);
          } catch (error) {
            console.error("Failed to persist donation to backend:", error);
          }

          toast.success("Donation completed successfully!");
          onClose();
        } else {
          toast.error("Donation failed. Please try again.");
        }
      } catch (error) {
        console.error("Donation execution failed:", error);
        toast.error(error instanceof Error ? error.message : "Donation failed");
      }
    }, [
      canProceed,
      paymentMethod,
      selectedToken,
      address,
      project,
      amount,
      currentChainId,
      switchChainAsync,
      executeDonations,
      createDonation,
      onClose,
    ]);

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

    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-w-md p-0 overflow-hidden"
          onInteractOutside={handleInteractOutside}
          onEscapeKeyDown={isExecuting ? (e) => e.preventDefault() : undefined}
        >
          {/* Header with brand blue */}
          <div className="bg-brand-blue px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-white text-xl font-bold flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span>Support this project</span>
                  <span className="text-sm font-normal text-white/80 truncate max-w-[250px]">
                    {project.title}
                  </span>
                </div>
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-5">
            <PaymentMethodSelector selected={paymentMethod} onSelect={handlePaymentMethodChange} />

            {paymentMethod === PaymentMethod.CRYPTO && (
              <div className="space-y-2">
                <span className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Select Token
                </span>
                <TokenSelector
                  selectedToken={selectedToken ?? undefined}
                  tokenOptions={SUPPORTED_TOKENS}
                  balanceByTokenKey={balanceByTokenKey}
                  onTokenSelect={setSelectedToken}
                />
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="donation-amount"
                className="block text-sm font-semibold text-gray-700 dark:text-gray-300"
              >
                Amount{" "}
                {paymentMethod === PaymentMethod.FIAT
                  ? "(USD)"
                  : selectedToken
                    ? `(${selectedToken.symbol})`
                    : ""}
              </label>
              <div className="relative">
                <input
                  id="donation-amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={handleAmountChange}
                  step="0.01"
                  min="0"
                  className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 text-lg font-medium text-gray-900 placeholder:text-gray-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 transition-all dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:focus:border-blue-400"
                />
                {paymentMethod === PaymentMethod.FIAT && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                    USD
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={handleProceed}
                disabled={!canProceed || isExecuting}
                className="w-full py-3.5 text-base font-semibold bg-brand-blue hover:bg-blue-600 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExecuting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Processing...
                  </span>
                ) : paymentMethod === PaymentMethod.CRYPTO ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Send Donation
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                    Pay with Card
                  </span>
                )}
              </Button>
            </div>

            <p className="text-center text-xs text-gray-500 dark:text-gray-400">
              100% of your donation goes directly to the project
            </p>
          </div>
        </DialogContent>

        {showOnrampModal && (
          <FiatOnrampModal
            isOpen={showOnrampModal}
            onClose={() => setShowOnrampModal(false)}
            project={{
              uid: project.uid,
              title: project.title,
              payoutAddress: resolvedPayoutAddress as Hex,
              chainID: project.chainID || fullProject?.chainID || 42161,
            }}
            donorAddress={address as Hex | undefined}
            fiatAmount={parseFloat(amount)}
          />
        )}
      </Dialog>
    );
  }
);

SingleProjectDonateModal.displayName = "SingleProjectDonateModal";
