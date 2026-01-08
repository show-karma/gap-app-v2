"use client";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { useAccount } from "wagmi";
import { DonationApprovalStatus } from "@/components/DonationApprovalStatus";
import { DonationStepsPreview } from "@/components/DonationStepsPreview";
import {
  getAllSupportedChains,
  getTokensByChain,
  type SupportedToken,
} from "@/constants/supportedTokens";
import { useCartChainPayoutAddresses } from "@/hooks/donation/useCartChainPayoutAddresses";
import { useCrossChainBalances } from "@/hooks/donation/useCrossChainBalances";
import { useDonationCheckout } from "@/hooks/donation/useDonationCheckout";
import { useAuth } from "@/hooks/useAuth";
import { useNetworkSwitching } from "@/hooks/useNetworkSwitching";
import { useDonationCart } from "@/store";
import { CartItemList } from "./CartItemList";
import { CheckoutHeader } from "./CheckoutHeader";
import { CompletedDonations } from "./CompletedDonations";
import { DonationAlerts } from "./DonationAlerts";
import { DonationExecutor } from "./DonationExecutor";
import { DonationSummary } from "./DonationSummary";
import { EmptyCart } from "./EmptyCart";
import { NetworkSwitchPreview } from "./NetworkSwitchPreview";

export function DonationCheckout() {
  const {
    items,
    amounts,
    selectedTokens,
    setAmount,
    setSelectedToken,
    remove,
    clear,
    payments,
    lastCompletedSession,
    clearLastCompletedSession,
  } = useDonationCart();
  const router = useRouter();
  const params = useParams();
  const communityId = params?.communityId as string | undefined;
  const {
    currentChainId,
    isCurrentNetworkSupported,
    switchToNetwork,
    isSwitching,
    getFreshWalletClient,
  } = useNetworkSwitching();
  const { address } = useAccount();
  const { isConnected } = useAuth();

  // Get unique chain IDs from cart items
  const _cartChainIds = useMemo(() => {
    const chainIds = new Set<number>();
    Object.values(selectedTokens).forEach((token) => {
      if (token) chainIds.add(token.chainId);
    });
    return Array.from(chainIds);
  }, [selectedTokens]);

  // Always fetch balances for all supported chains when authenticated
  // This ensures users can see all available tokens even on unsupported networks
  const chainsToFetch = useMemo(() => {
    return isConnected ? getAllSupportedChains() : [];
  }, [isConnected]);

  // Custom hooks for business logic
  const { balanceByTokenKey, isFetchingCrossChainBalances } = useCrossChainBalances(
    currentChainId,
    chainsToFetch
  );

  const {
    chainPayoutAddresses,
    missingPayouts,
    isFetching: isFetchingPayouts,
    setMissingPayouts,
  } = useCartChainPayoutAddresses(items);

  const {
    transfers,
    isExecuting,
    executionState,
    validationErrors,
    showStepsPreview,
    setShowStepsPreview,
    handleExecuteDonations,
    handleProceedWithDonations,
  } = useDonationCheckout();

  const totalItems = items.length;
  const hasAmounts = Object.values(amounts).some((amount) => amount && parseFloat(amount) > 0);
  const hasSelectedTokens = Object.keys(selectedTokens).length > 0;

  // SECURITY: Block donations if any payout addresses are missing
  // This prevents donations from being sent to undefined/zero addresses
  const hasAllPayoutAddresses = missingPayouts.length === 0;

  const canProceed = hasAmounts && hasSelectedTokens && hasAllPayoutAddresses && !isFetchingPayouts;

  // Get tokens to show in dropdown - only show tokens with positive balances
  const allAvailableTokens = useMemo(() => {
    if (!isConnected) {
      return [];
    }

    // Show only tokens with positive balances across all chains
    const tokensWithBalance: SupportedToken[] = [];
    const allSupportedChainIds = getAllSupportedChains();

    allSupportedChainIds.forEach((chainId) => {
      const chainTokens = getTokensByChain(chainId);
      chainTokens.forEach((token) => {
        const balanceKey = `${token.symbol}-${token.chainId}`;
        const balance = balanceByTokenKey[balanceKey];
        // Only include tokens with positive balance
        if (balance && parseFloat(balance) > 0) {
          tokensWithBalance.push(token);
        }
      });
    });

    return tokensWithBalance;
  }, [balanceByTokenKey, isConnected]);

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
        case "approving": {
          const progress = executionState.approvalProgress || 0;
          return `Approving tokens... (${Math.round(progress)}%)`;
        }
        case "donating":
          return "Submitting donations...";
        default:
          return "Processing...";
      }
    }
    if (!canProceed) {
      return "Select tokens and amounts";
    }
    // If on unsupported network, prompt to switch
    if (!isCurrentNetworkSupported) {
      return "Switch Chain";
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
    isCurrentNetworkSupported,
  ]);

  const onExecute = useCallback(async () => {
    await handleExecuteDonations(payments);
  }, [handleExecuteDonations, payments]);

  const onProceed = useCallback(async () => {
    await handleProceedWithDonations(
      payments,
      chainPayoutAddresses,
      balanceByTokenKey,
      currentChainId,
      switchToNetwork,
      getFreshWalletClient,
      setMissingPayouts
    );
  }, [
    handleProceedWithDonations,
    payments,
    chainPayoutAddresses,
    balanceByTokenKey,
    currentChainId,
    switchToNetwork,
    getFreshWalletClient,
    setMissingPayouts,
  ]);

  // Early return after all hooks have been called
  // If cart is empty, check if we have a completed session to show
  if (!items.length) {
    if (lastCompletedSession) {
      return (
        <CompletedDonations
          session={lastCompletedSession}
          onStartNewDonation={() => {
            clearLastCompletedSession();
            router.back();
          }}
        />
      );
    }
    return <EmptyCart onBrowseProjects={() => router.back()} />;
  }

  return (
    <div className="min-h-screen my-8">
      <div className="w-full pb-4">
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(380px,1fr)] lg:items-start">
          <div className="flex flex-col gap-3">
            <CheckoutHeader communityId={communityId} totalItems={totalItems} onClear={clear} />

            {!canProceed ? (
              <div className="flex items-center p-3 relative bg-[#EFF4FF] dark:bg-[#101828] rounded-lg overflow-hidden">
                <div className="flex items-start gap-3 relative flex-1 grow">
                  <div className="relative w-6 h-6 aspect-[1]">
                    <InformationCircleIcon className="w-6 h-6 text-primary-500" />
                  </div>

                  <div className="flex flex-col items-start justify-center relative flex-1 grow">
                    <p className="text-sm font-semibold text-primary-500">
                      Select tokens and amounts
                    </p>
                    <p className="relative self-stretch font-text-sm-regular font-[number:var(--text-sm-regular-font-weight)] text-primary-500 text-[length:var(--text-sm-regular-font-size)] tracking-[var(--text-sm-regular-letter-spacing)] leading-[var(--text-sm-regular-line-height)] [font-style:var(--text-sm-regular-font-style)]">
                      Approve each token once per network, then confirm your batch transfer.
                      Donations across multiple chains are handled securely.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
            <DonationApprovalStatus executionState={executionState} />

            {/* Network Switch Preview - Shows when multiple networks are involved */}
            <NetworkSwitchPreview payments={payments} currentChainId={currentChainId} />

            <CartItemList
              items={items}
              selectedTokens={selectedTokens}
              amounts={amounts}
              chainPayoutAddresses={chainPayoutAddresses}
              allAvailableTokens={allAvailableTokens}
              balanceByTokenKey={balanceByTokenKey}
              onTokenSelect={handleTokenSelect}
              onAmountChange={setAmount}
              onRemove={remove}
            />
          </div>

          <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
            <DonationAlerts
              isConnected={isConnected}
              address={address}
              isCurrentNetworkSupported={isCurrentNetworkSupported}
            />

            <DonationSummary payments={payments} />

            {canProceed ? (
              <DonationExecutor
                transfers={transfers}
                items={items}
                selectedTokens={selectedTokens}
                validationErrors={validationErrors}
                missingPayouts={missingPayouts}
                isExecuting={isExecuting}
                isSwitching={isSwitching}
                isFetchingPayouts={isFetchingPayouts}
                isFetchingCrossChainBalances={isFetchingCrossChainBalances}
                isConnected={isConnected}
                address={address}
                canProceed={canProceed}
                isCurrentNetworkSupported={isCurrentNetworkSupported}
                executionState={executionState}
                executeButtonLabel={executeButtonLabel}
                onExecute={onExecute}
              />
            ) : null}
          </aside>
        </div>

        {/* Steps Preview Modal */}
        {showStepsPreview && (
          <DonationStepsPreview
            payments={payments}
            onProceed={onProceed}
            onCancel={() => setShowStepsPreview(false)}
            isLoading={isExecuting}
          />
        )}
      </div>
    </div>
  );
}
