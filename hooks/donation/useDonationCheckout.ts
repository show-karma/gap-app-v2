import { useCallback, useState } from "react"
import toast from "react-hot-toast"
import { useAccount } from "wagmi"
import { UX_CONSTANTS } from "@/constants/donation"
import { useDonationTransfer } from "@/hooks/useDonationTransfer"
import { useDonationCart } from "@/store/donationCart"
import {
  createCompletedDonations,
  type DonationPayment,
  ensureCorrectNetwork,
  getTargetChainId,
  validatePayoutAddresses,
  waitForWalletSync,
} from "@/utilities/donations/donationExecution"
import { parseDonationError } from "@/utilities/donations/errorMessages"

export function useDonationCheckout() {
  const { address, isConnected } = useAccount()
  const {
    transfers,
    isExecuting,
    executeDonations,
    validatePayments,
    executionState,
    approvalInfo,
  } = useDonationTransfer()

  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [showStepsPreview, setShowStepsPreview] = useState(false)

  const handleExecuteDonations = useCallback(
    async (payments: DonationPayment[]) => {
      if (!isConnected || !address) {
        toast.error("Connect your wallet to review balances and execute donations.")
        return
      }

      if (!payments.length) {
        toast.error("Select at least one project and amount to donate.")
        return
      }

      // Show steps preview first
      setShowStepsPreview(true)
    },
    [isConnected, address]
  )

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
      setShowStepsPreview(false)

      // Validate payout addresses
      const { valid: hasValidPayouts, missingAddresses } = validatePayoutAddresses(
        payments,
        payoutAddresses
      )

      if (!hasValidPayouts) {
        setMissingPayouts((prev) =>
          Array.from(new Set([...prev, ...missingAddresses.map((p) => p.projectId)]))
        )
        return
      }

      // Ensure we're on the correct network
      const targetChainId = getTargetChainId(payments)
      let activeChainId = await ensureCorrectNetwork(currentChainId, targetChainId, switchToNetwork)

      if (!activeChainId) return

      // Validate balances
      setValidationErrors([])
      const { valid, errors } = await validatePayments(payments, balanceByTokenKey)
      if (!valid) {
        setValidationErrors(errors)
        toast.error("Insufficient balance for one or more donations.")
        return
      }

      try {
        // Execute donations with network switching handler
        const results = await executeDonations(
          payments,
          (projectId) => payoutAddresses[projectId],
          async (payment) => {
            const newChainId = await waitForWalletSync(
              payment,
              activeChainId,
              switchToNetwork,
              getFreshWalletClient
            )
            if (newChainId) {
              activeChainId = newChainId
            }
          }
        )

        const hasFailures = results.some((result) => result.status === "error")

        // Create completed session record
        const cartState = useDonationCart.getState()
        const completedDonations = createCompletedDonations(results, payments, cartState.items)

        // Save session if we have completed donations
        if (completedDonations.length > 0) {
          const session = {
            id: `session-${Date.now()}`,
            timestamp: Date.now(),
            donations: completedDonations,
            totalProjects: payments.length,
          }
          cartState.setLastCompletedSession(session)
        } else {
          console.warn("No completed donations to save in session")
        }

        // Handle post-execution
        if (hasFailures) {
          toast.error("Some donations failed. Review the status below.")
          cartState.clear()
        } else {
          cartState.clear()

          const tokensNeedingApproval = approvalInfo.filter((info) => info.needsApproval)
          if (tokensNeedingApproval.length > 0) {
            toast.success("Tokens approved successfully! Batch donation submitted.")
          } else {
            toast.success("Batch donation submitted successfully!")
          }
        }
      } catch (error) {
        console.error("Failed to execute donations", error)
        const parsedError = parseDonationError(error)

        toast.error(parsedError.message, {
          duration: UX_CONSTANTS.ERROR_TOAST_DURATION_MS,
        })
      }
    },
    [validatePayments, executeDonations, approvalInfo]
  )

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
  }
}
