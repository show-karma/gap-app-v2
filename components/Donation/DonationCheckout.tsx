"use client";
import { useDonationCart } from "@/store";
import { useParams, useRouter } from "next/navigation";
import { useNetworkSwitching } from "@/hooks/useNetworkSwitching";
import { useAccount } from "wagmi";
import { useEffect, useCallback, useMemo } from "react";
import {
  getTokensByChain,
  type SupportedToken,
} from "@/constants/supportedTokens";
import { DonationApprovalStatus } from "@/components/DonationApprovalStatus";
import { DonationStepsPreview } from "@/components/DonationStepsPreview";
import { useDonationCheckout } from "@/hooks/donation/useDonationCheckout";
import { usePayoutAddressManager } from "@/hooks/donation/usePayoutAddressManager";
import { useCrossChainBalances } from "@/hooks/donation/useCrossChainBalances";
import { DonationSummary } from "./DonationSummary";
import { DonationExecutor } from "./DonationExecutor";
import { DonationAlerts } from "./DonationAlerts";
import { CheckoutHeader } from "./CheckoutHeader";
import { EmptyCart } from "./EmptyCart";
import { CartItemList } from "./CartItemList";
import { NetworkSwitchPreview } from "./NetworkSwitchPreview";
import { CompletedDonations } from "./CompletedDonations";

export function DonationCheckout() {
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
  const { address, isConnected } = useAccount();

  // Get unique chain IDs from cart items
  const cartChainIds = useMemo(() => {
    const chainIds = new Set<number>();
    Object.values(selectedTokens).forEach((token) => {
      if (token) chainIds.add(token.chainId);
    });
    return Array.from(chainIds);
  }, [selectedTokens]);

  // Custom hooks for business logic
  const { balanceByTokenKey, isFetchingCrossChainBalances } = useCrossChainBalances(
    currentChainId,
    cartChainIds
  );

  const {
    payoutAddresses,
    missingPayouts,
    isFetchingPayouts,
    payoutStatusByProject,
    formatAddress,
    setMissingPayouts,
  } = usePayoutAddressManager(items, communityId);

  const {
    transfers,
    isExecuting,
    executionState,
    approvalInfo,
    validationErrors,
    showStepsPreview,
    setShowStepsPreview,
    handleExecuteDonations,
    handleProceedWithDonations,
  } = useDonationCheckout();

  const totalItems = items.length;
  const hasAmounts = Object.values(amounts).some(
    (amount) => amount && parseFloat(amount) > 0
  );
  const hasSelectedTokens = Object.keys(selectedTokens).length > 0;

  // SECURITY: Block donations if any payout addresses are missing
  // This prevents donations from being sent to undefined/zero addresses
  const hasAllPayoutAddresses = missingPayouts.length === 0;

  const canProceed = hasAmounts && hasSelectedTokens && hasAllPayoutAddresses && !isFetchingPayouts;

  // Update payments when amounts or tokens change
  useEffect(() => {
    updatePayments();
  }, [amounts, selectedTokens, updatePayments]);

  // Get tokens from current network with positive balances, or from all cart chains if current network has none
  const allAvailableTokens = useMemo(() => {
    const currentNetworkTokens = getTokensByChain(currentChainId);
    const tokensWithBalance: SupportedToken[] = [];

    // First, try to get tokens with balance from the current network
    currentNetworkTokens.forEach((token) => {
      const balanceKey = `${token.symbol}-${token.chainId}`;
      const balance = balanceByTokenKey[balanceKey];
      if (balance && parseFloat(balance) > 0) {
        tokensWithBalance.push(token);
      }
    });

    // If no tokens with balance on current network, show all tokens from cart chains
    if (tokensWithBalance.length === 0 && cartChainIds.length > 0) {
      cartChainIds.forEach((chainId) => {
        const chainTokens = getTokensByChain(chainId);
        chainTokens.forEach((token) => {
          tokensWithBalance.push(token);
        });
      });
    }

    return tokensWithBalance;
  }, [balanceByTokenKey, currentChainId, cartChainIds]);

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

  const onExecute = useCallback(async () => {
    await handleExecuteDonations(payments);
  }, [handleExecuteDonations, payments]);

  const onProceed = useCallback(async () => {
    await handleProceedWithDonations(
      payments,
      payoutAddresses,
      balanceByTokenKey,
      currentChainId,
      switchToNetwork,
      getFreshWalletClient,
      setMissingPayouts
    );
  }, [
    handleProceedWithDonations,
    payments,
    payoutAddresses,
    balanceByTokenKey,
    currentChainId,
    switchToNetwork,
    getFreshWalletClient,
    setMissingPayouts,
  ]);

  // Early return after all hooks have been called
  // If cart is empty, check if we have a completed session to show
  if (!items.length) {
    console.log('Cart is empty. lastCompletedSession:', lastCompletedSession);

    if (lastCompletedSession) {
      console.log('Rendering CompletedDonations with session:', lastCompletedSession);
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
      <div className="mx-auto w-full max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
        <CheckoutHeader
          communityId={communityId}
          totalItems={totalItems}
          onClear={clear}
        />

        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(380px,1fr)] lg:items-start">
          <div className="flex flex-col gap-6">
            <DonationApprovalStatus executionState={executionState} />

            {/* Network Switch Preview - Shows when multiple networks are involved */}
            <NetworkSwitchPreview
              payments={payments}
              currentChainId={currentChainId}
            />

            <CartItemList
              items={items}
              selectedTokens={selectedTokens}
              amounts={amounts}
              payoutStatusByProject={payoutStatusByProject}
              allAvailableTokens={allAvailableTokens}
              balanceByTokenKey={balanceByTokenKey}
              formatAddress={formatAddress}
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

            <div className="rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-sm dark:border-gray-800 dark:bg-zinc-950/70 backdrop-blur-sm">
              <div className="flex flex-col gap-4">
                <button
                  onClick={() => router.back()}
                  className="inline-flex items-center gap-2 self-start rounded-full border border-gray-200/60 px-4 py-2.5 text-xs font-medium text-gray-600 transition-all duration-200 hover:bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:border-gray-600"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                  Continue exploring
                </button>

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
              </div>
            </div>
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
