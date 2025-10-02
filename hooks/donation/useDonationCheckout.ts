import { useState, useCallback, useMemo } from "react";
import { useAccount } from "wagmi";
import toast from "react-hot-toast";
import type { SupportedToken } from "@/constants/supportedTokens";
import { useDonationTransfer } from "@/hooks/useDonationTransfer";
import { getShortErrorMessage, parseDonationError } from "@/utilities/donations/errorMessages";

interface DonationPayment {
  projectId: string;
  amount: string;
  token: SupportedToken;
  chainId: number;
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

      // Show steps preview first
      setShowStepsPreview(true);
    },
    [isConnected, address]
  );

  const handleProceedWithDonations = useCallback(
    async (
      payments: DonationPayment[],
      payoutAddresses: Record<string, string>,
      balanceByTokenKey: Record<string, string>,
      currentChainId: number | null,
      switchToNetwork: (chainId: number) => Promise<void>,
      getFreshWalletClient: (chainId: number) => Promise<any>,
      setMissingPayouts: (cb: (prev: string[]) => string[]) => void
    ) => {
      setShowStepsPreview(false);

      // SECURITY: Critical validation - block if any payout addresses are missing
      // This prevents funds from being sent to undefined/invalid addresses
      const missingAddresses = payments.filter(
        (payment) => !payoutAddresses[payment.projectId]
      );

      if (missingAddresses.length > 0) {
        toast.error("Cannot proceed: Some projects are missing payout addresses. Donation blocked for security.");
        setMissingPayouts((prev) =>
          Array.from(new Set([...prev, ...missingAddresses.map((p) => p.projectId)]))
        );
        return;
      }

      const targetChainId = payments.find((payment) => payment.chainId)?.chainId;
      if (!targetChainId) {
        toast.error("Unable to determine donation network.");
        return;
      }

      let activeChainId = currentChainId;

      if (activeChainId !== targetChainId) {
        try {
          await switchToNetwork(targetChainId);
          activeChainId = targetChainId;
        } catch (error) {
          const errorMsg = getShortErrorMessage(error);
          toast.error(errorMsg || "Switch to the required network to continue.");
          return;
        }
      }

      setValidationErrors([]);
      const { valid, errors } = await validatePayments(payments, balanceByTokenKey);
      if (!valid) {
        setValidationErrors(errors);
        toast.error("Insufficient balance for one or more donations.");
        return;
      }

      try {
        const results = await executeDonations(
          payments,
          (projectId) => payoutAddresses[projectId],
          async (payment) => {
            if (payment.chainId && payment.chainId !== activeChainId) {
              try {
                await switchToNetwork(payment.chainId);

                let attempts = 0;
                const maxAttempts = 10;

                while (attempts < maxAttempts) {
                  const freshWalletClient = await getFreshWalletClient(payment.chainId);

                  if (freshWalletClient && freshWalletClient.chain?.id === payment.chainId) {
                    activeChainId = payment.chainId;
                    return;
                  }

                  attempts++;
                  await new Promise((resolve) => setTimeout(resolve, 1000));
                }

                throw new Error(
                  `Wallet client failed to sync to chain ${payment.chainId} after ${maxAttempts} attempts. Please ensure your wallet has switched networks.`
                );
              } catch (error) {
                throw new Error(
                  `Failed to switch to required network (Chain ID: ${payment.chainId}). ${
                    error instanceof Error ? error.message : "Please try again."
                  }`
                );
              }
            }
          }
        );

        const hasFailures = results.some((result) => result.status === "error");
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
      } catch (error) {
        console.error("Failed to execute donations", error);
        const parsedError = parseDonationError(error);

        // Show user-friendly error message
        toast.error(parsedError.message, {
          duration: 5000,
        });
      }
    },
    [validatePayments, executeDonations, approvalInfo]
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
