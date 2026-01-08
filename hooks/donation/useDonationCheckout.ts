import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { UX_CONSTANTS } from "@/constants/donation";
import { useDonationTransfer } from "@/hooks/useDonationTransfer";
import { getPayoutAddressForChain } from "@/src/features/chain-payout-address/hooks/use-chain-payout-address";
import type { ChainPayoutAddressMap } from "@/src/features/chain-payout-address/types/chain-payout-address";
import { useDonationCart } from "@/store/donationCart";
import { DonationType } from "@/types/donations";
import {
  createCompletedDonations,
  type DonationPayment,
  ensureCorrectNetwork,
  getTargetChainId,
  waitForWalletSync,
} from "@/utilities/donations/donationExecution";
import { parseDonationError } from "@/utilities/donations/errorMessages";
import type { CreateDonationRequest } from "./types";
import { useCreateDonation } from "./useCreateDonation";

/**
 * Validates that all payments have a payout address configured for their chain
 */
function validateChainPayoutAddresses(
  payments: DonationPayment[],
  chainPayoutAddresses: Record<string, ChainPayoutAddressMap>
): { valid: boolean; missingProjectIds: string[] } {
  const missingProjectIds = payments
    .filter((payment) => {
      const projectAddresses = chainPayoutAddresses[payment.projectId];
      return !getPayoutAddressForChain(projectAddresses, payment.chainId);
    })
    .map((p) => p.projectId);

  return {
    valid: missingProjectIds.length === 0,
    missingProjectIds,
  };
}

/**
 * Creates a payout address resolver function for use with executeDonations
 */
function createPayoutAddressResolver(chainPayoutAddresses: Record<string, ChainPayoutAddressMap>) {
  return (projectId: string, chainId: number): string => {
    const projectAddresses = chainPayoutAddresses[projectId];
    return getPayoutAddressForChain(projectAddresses, chainId) || "";
  };
}

export function useDonationCheckout() {
  const { address, isConnected } = useAccount();
  const {
    transfers,
    isExecuting,
    executeDonations,
    validatePayments,
    executionState,
    approvalInfo,
  } = useDonationTransfer();

  const { mutateAsync: createDonation } = useCreateDonation();

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showStepsPreview, setShowStepsPreview] = useState(false);

  const handleExecuteDonations = useCallback(
    async (payments: DonationPayment[]) => {
      if (!isConnected || !address) {
        toast.error("Connect your wallet to review balances and execute donations.");
        return;
      }

      if (!payments.length) {
        toast.error("Select at least one project and amount to donate.");
        return;
      }

      setShowStepsPreview(true);
    },
    [isConnected, address]
  );

  /**
   * Persists successful donations to the backend
   */
  const persistDonationsToBackend = useCallback(
    async (
      successfulResults: Array<{ hash: string; projectId: string; status: string }>,
      payments: DonationPayment[],
      chainPayoutAddresses: Record<string, ChainPayoutAddressMap>
    ) => {
      if (!address || successfulResults.length === 0) return;

      const payoutResolver = createPayoutAddressResolver(chainPayoutAddresses);

      await Promise.all(
        successfulResults.map(async (result) => {
          const payment = payments.find((p) => p.projectId === result.projectId);
          if (!payment) return;

          const donationRequest: CreateDonationRequest = {
            uid: `${result.hash}-${payment.projectId}`,
            chainID: payment.chainId,
            donorAddress: address,
            projectUID: payment.projectId,
            payoutAddress: payoutResolver(payment.projectId, payment.chainId),
            amount: payment.amount,
            tokenSymbol: payment.token.symbol,
            tokenAddress: payment.token.isNative ? undefined : payment.token.address,
            transactionHash: result.hash,
            donationType: DonationType.CRYPTO,
            metadata: {
              tokenDecimals: payment.token.decimals,
              tokenName: payment.token.name,
              chainName: payment.token.chainName,
            },
          };

          try {
            await createDonation(donationRequest);
          } catch (error) {
            console.error(
              `Failed to persist donation to backend for project ${payment.projectId}:`,
              error
            );
          }
        })
      );
    },
    [address, createDonation]
  );

  /**
   * Handles donation results - creates session record and triggers persistence
   */
  const handleDonationResults = useCallback(
    async (
      results: Array<{ hash: string; projectId: string; status: string }>,
      payments: DonationPayment[],
      chainPayoutAddresses: Record<string, ChainPayoutAddressMap>
    ) => {
      const hasFailures = results.some((r) => r.status === "error");
      const cartState = useDonationCart.getState();

      // Create session record
      const completedDonations = createCompletedDonations(results, payments, cartState.items);
      if (completedDonations.length > 0) {
        cartState.setLastCompletedSession({
          id: `session-${Date.now()}`,
          timestamp: Date.now(),
          donations: completedDonations,
          totalProjects: payments.length,
        });
      }

      // Persist successful donations
      const successfulResults = results.filter((r) => r.status === "success");
      await persistDonationsToBackend(successfulResults, payments, chainPayoutAddresses);

      // Clear cart and show toast
      cartState.clear();

      if (hasFailures) {
        toast.error("Some donations failed. Review the status below.");
      } else {
        const tokensNeedingApproval = approvalInfo.filter((info) => info.needsApproval);
        if (tokensNeedingApproval.length > 0) {
          toast.success("Tokens approved successfully! Batch donation submitted.");
        } else {
          toast.success("Batch donation submitted successfully!");
        }
      }
    },
    [approvalInfo, persistDonationsToBackend]
  );

  /**
   * Executes donations and handles the full flow
   */
  const executeDonationsWithHandling = useCallback(
    async (
      payments: DonationPayment[],
      chainPayoutAddresses: Record<string, ChainPayoutAddressMap>,
      activeChainId: number,
      switchToNetwork: (chainId: number) => Promise<void>,
      getFreshWalletClient: (chainId: number) => Promise<any>
    ) => {
      let currentChainId = activeChainId;
      const payoutResolver = createPayoutAddressResolver(chainPayoutAddresses);

      const results = await executeDonations(payments, payoutResolver, async (payment) => {
        const newChainId = await waitForWalletSync(
          payment,
          currentChainId,
          switchToNetwork,
          getFreshWalletClient
        );
        if (newChainId) {
          currentChainId = newChainId;
        }
      });

      await handleDonationResults(results, payments, chainPayoutAddresses);
    },
    [executeDonations, handleDonationResults]
  );

  const handleProceedWithDonations = useCallback(
    async (
      payments: DonationPayment[],
      chainPayoutAddresses: Record<string, ChainPayoutAddressMap>,
      balanceByTokenKey: Record<string, string>,
      currentChainId: number | null,
      switchToNetwork: (chainId: number) => Promise<void>,
      getFreshWalletClient: (chainId: number) => Promise<any>,
      setMissingPayouts: (cb: (prev: string[]) => string[]) => void
    ) => {
      setShowStepsPreview(false);

      // Step 1: Validate chain payout addresses
      const { valid: hasValidPayouts, missingProjectIds } = validateChainPayoutAddresses(
        payments,
        chainPayoutAddresses
      );

      if (!hasValidPayouts) {
        setMissingPayouts((prev) => Array.from(new Set([...prev, ...missingProjectIds])));
        toast.error("Some projects don't have payout addresses for the selected chains.");
        return;
      }

      // Step 2: Ensure correct network
      const targetChainId = getTargetChainId(payments);
      const activeChainId = await ensureCorrectNetwork(
        currentChainId,
        targetChainId,
        switchToNetwork
      );

      if (!activeChainId) return;

      // Step 3: Validate balances
      setValidationErrors([]);
      const { valid, errors } = await validatePayments(payments, balanceByTokenKey);
      if (!valid) {
        setValidationErrors(errors);
        toast.error("Insufficient balance for one or more donations.");
        return;
      }

      // Step 4: Execute donations
      try {
        await executeDonationsWithHandling(
          payments,
          chainPayoutAddresses,
          activeChainId,
          switchToNetwork,
          getFreshWalletClient
        );
      } catch (error) {
        console.error("Failed to execute donations", error);
        const parsedError = parseDonationError(error);
        toast.error(parsedError.message, {
          duration: UX_CONSTANTS.ERROR_TOAST_DURATION_MS,
        });
      }
    },
    [validatePayments, executeDonationsWithHandling]
  );

  return {
    transfers,
    isExecuting,
    executionState,
    approvalInfo,
    validationErrors,
    showStepsPreview,
    setShowStepsPreview,
    handleExecuteDonations,
    handleProceedWithDonations,
  };
}
