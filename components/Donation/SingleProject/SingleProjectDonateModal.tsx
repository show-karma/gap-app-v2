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
import { useAuth } from "@/hooks/useAuth";
import { getPayoutAddressForChain } from "@/src/features/chain-payout-address/hooks/use-chain-payout-address";
import { PaymentMethod } from "@/types/donations";
import { appNetwork } from "@/utilities/network";
import { shortAddress } from "@/utilities/shortAddress";
import { TokenSelector } from "../TokenSelector";
import { OnrampFlow } from "./OnrampFlow";
import { PaymentMethodSelector } from "./PaymentMethodSelector";
import type { SingleProjectDonateModalProps } from "./types";

export const SingleProjectDonateModal = React.memo<SingleProjectDonateModalProps>(
  ({ isOpen, onClose, project }) => {
    const { login, authenticated, connectWallet } = useAuth();
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
      address,
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

    // Get display address for the selected token's chain (crypto flow)
    const displayPayoutAddress = useMemo(() => {
      if (!selectedToken || !project.chainPayoutAddress) return "";
      return getPayoutAddressForChain(project.chainPayoutAddress, selectedToken.chainId) || "";
    }, [selectedToken, project.chainPayoutAddress]);

    // Get default payout address for fiat flow (prefer Base, then first available)
    const fiatPayoutConfig = useMemo(() => {
      if (!project.chainPayoutAddress) return { address: "", chainId: 8453 };
      // Prefer Base (8453), then first available chain
      const baseAddress = getPayoutAddressForChain(project.chainPayoutAddress, 8453);
      if (baseAddress) return { address: baseAddress, chainId: 8453 };
      const firstChainId = configuredChainIds[0];
      if (firstChainId) {
        const address = getPayoutAddressForChain(project.chainPayoutAddress, firstChainId) || "";
        return { address, chainId: firstChainId };
      }
      return { address: "", chainId: 8453 };
    }, [project.chainPayoutAddress, configuredChainIds]);

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
              <>
                {/* No wallet connected */}
                {!address ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Connect a wallet to view your token balances and make a donation.
                    </p>
                    <Button
                      onClick={connectWallet}
                      className="w-full bg-brand-blue hover:bg-blue-600"
                    >
                      Connect Wallet
                    </Button>
                  </div>
                ) : tokensWithBalanceAndPayoutSet.length > 0 ? (
                  <div className="space-y-2">
                    <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Select Token
                    </span>
                    <TokenSelector
                      selectedToken={selectedToken ?? undefined}
                      tokenOptions={tokensWithBalanceAndPayoutSet}
                      balanceByTokenKey={balanceByTokenKey}
                      onTokenSelect={setSelectedToken}
                    />
                  </div>
                ) : configuredChainIds.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      This project accepts crypto donations only on{" "}
                      {configuredChainNames.length === 1
                        ? configuredChainNames[0]
                        : configuredChainNames.slice(0, -1).join(", ") +
                          " and " +
                          configuredChainNames[configuredChainNames.length - 1]}{" "}
                      {configuredChainNames.length === 1 ? "network" : "networks"}. We couldn&apos;t
                      find any tokens in your wallet account {address ? shortAddress(address) : ""}.
                    </p>
                    <Button onClick={connectWallet} variant="outline" className="w-full">
                      Connect Different Wallet
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                    This project hasn't set up donation addresses yet.
                  </p>
                )}

                {tokensWithBalanceAndPayoutSet.length > 0 && (
                  <>
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
                      disabled={!canProceed || isExecuting}
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
                  </>
                )}
              </>
            )}

            {paymentMethod === PaymentMethod.FIAT && (
              <>
                {!authenticated ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                      You need to login to proceed with card payment.
                    </p>
                    <Button onClick={login} className="w-full bg-brand-blue hover:bg-blue-600">
                      Login to Continue
                    </Button>
                  </div>
                ) : fiatPayoutConfig.address ? (
                  <OnrampFlow
                    projectUid={project.uid}
                    payoutAddress={fiatPayoutConfig.address}
                    chainId={fiatPayoutConfig.chainId}
                  />
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                    This project hasn't set up donation addresses yet.
                  </p>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }
);

SingleProjectDonateModal.displayName = "SingleProjectDonateModal";
