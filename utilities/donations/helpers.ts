/**
 * Donation Helper Utilities
 *
 * Reusable utility functions for donation-related operations.
 * These functions handle common tasks like formatting, validation, and data transformation.
 */

import { formatUnits, parseUnits } from "viem"
import { VALIDATION_CONSTANTS } from "@/constants/donation"
import type { SupportedToken } from "@/constants/supportedTokens"

/**
 * Payment interface for donation transactions
 */
export interface DonationPayment {
  projectId: string
  amount: string
  token: SupportedToken
  chainId: number
}

/**
 * Generate a unique key for a token balance lookup
 */
export function getTokenBalanceKey(token: SupportedToken): string {
  return `${token.symbol}-${token.chainId}`
}

/**
 * Generate a unique key from symbol and chainId
 */
export function getTokenKey(symbol: string, chainId: number): string {
  return `${symbol}-${chainId}`
}

/**
 * Format donation amount string to bigint for contract interaction
 */
export function formatDonationAmount(amount: string, decimals: number): bigint {
  try {
    if (!amount || amount === "0" || parseFloat(amount) === 0) {
      return BigInt(0)
    }

    return parseUnits(amount, decimals)
  } catch (error) {
    console.error("Error formatting donation amount:", error)
    return BigInt(0)
  }
}

/**
 * Parse bigint amount to human-readable string
 */
export function parseDonationAmount(
  amount: bigint,
  decimals: number,
  displayDecimals: number = VALIDATION_CONSTANTS.DISPLAY_DECIMALS
): string {
  try {
    const formatted = formatUnits(amount, decimals)
    const parsed = parseFloat(formatted)

    return parsed.toFixed(displayDecimals)
  } catch (error) {
    console.error("Error parsing donation amount:", error)
    return "0.0000"
  }
}

/**
 * Validate donation amount
 */
export function validateDonationAmount(amount: string): {
  valid: boolean
  error?: string
} {
  const numAmount = parseFloat(amount)

  if (isNaN(numAmount) || numAmount <= 0) {
    return {
      valid: false,
      error: "Amount must be greater than 0",
    }
  }

  if (numAmount < VALIDATION_CONSTANTS.MIN_DONATION_AMOUNT) {
    return {
      valid: false,
      error: `Minimum donation is ${VALIDATION_CONSTANTS.MIN_DONATION_AMOUNT}`,
    }
  }

  if (numAmount > VALIDATION_CONSTANTS.MAX_DONATION_AMOUNT) {
    return {
      valid: false,
      error: `Maximum donation is ${VALIDATION_CONSTANTS.MAX_DONATION_AMOUNT}`,
    }
  }

  return { valid: true }
}

/**
 * Check if user has sufficient balance for a donation
 */
export function hasSufficientBalance(amount: string, balance: string): boolean {
  try {
    const amountNum = parseFloat(amount)
    const balanceNum = parseFloat(balance)

    if (isNaN(amountNum) || isNaN(balanceNum)) {
      return false
    }

    return balanceNum >= amountNum
  } catch (error) {
    console.error("Error checking balance:", error)
    return false
  }
}

/**
 * Group payments by chain ID for efficient processing
 */
export function groupPaymentsByChain(payments: DonationPayment[]): Map<number, DonationPayment[]> {
  const grouped = new Map<number, DonationPayment[]>()

  payments.forEach((payment) => {
    const chainPayments = grouped.get(payment.chainId) || []
    chainPayments.push(payment)
    grouped.set(payment.chainId, chainPayments)
  })

  return grouped
}

/**
 * Count unique networks in payments
 */
export function countUniqueNetworks(payments: DonationPayment[]): number {
  const uniqueChains = new Set(payments.map((p) => p.chainId))
  return uniqueChains.size
}

/**
 * Get list of unique chain IDs from payments
 */
export function getUniqueChainIds(payments: DonationPayment[]): number[] {
  const uniqueChains = new Set(payments.map((p) => p.chainId))
  return Array.from(uniqueChains)
}

/**
 * Count network switches required for donations
 * (assumes donations are processed in order, chain by chain)
 */
export function countNetworkSwitches(
  payments: DonationPayment[],
  currentChainId: number | null
): number {
  if (payments.length === 0) return 0

  const uniqueChains = getUniqueChainIds(payments)

  // If all donations are on the current network, no switches needed
  if (uniqueChains.length === 1 && uniqueChains[0] === currentChainId) {
    return 0
  }

  // Otherwise, we need to switch to each unique network
  // If current network is not in the list, add 1 for initial switch
  const needsInitialSwitch = currentChainId === null || !uniqueChains.includes(currentChainId)

  return uniqueChains.length - (needsInitialSwitch ? 0 : 1)
}

/**
 * Calculate total donation amount in a specific token
 */
export function calculateTotalByToken(payments: DonationPayment[], tokenKey: string): string {
  let total = 0

  payments.forEach((payment) => {
    const paymentTokenKey = getTokenBalanceKey(payment.token)
    if (paymentTokenKey === tokenKey) {
      total += parseFloat(payment.amount) || 0
    }
  })

  return total.toFixed(VALIDATION_CONSTANTS.DISPLAY_DECIMALS)
}

/**
 * Get summary of donations by network
 */
export interface NetworkDonationSummary {
  chainId: number
  chainName: string
  projectCount: number
  totalAmount: string
  needsSwitch: boolean
}

export function getDonationSummaryByNetwork(
  payments: DonationPayment[],
  currentChainId: number | null
): NetworkDonationSummary[] {
  const grouped = groupPaymentsByChain(payments)
  const summaries: NetworkDonationSummary[] = []

  grouped.forEach((chainPayments, chainId) => {
    const chainName = chainPayments[0]?.token.chainName || `Chain ${chainId}`

    // Calculate total amount (simplified - assumes same token)
    const totalAmount = chainPayments.reduce((sum, payment) => {
      return sum + (parseFloat(payment.amount) || 0)
    }, 0)

    summaries.push({
      chainId,
      chainName,
      projectCount: chainPayments.length,
      totalAmount: totalAmount.toFixed(VALIDATION_CONSTANTS.DISPLAY_DECIMALS),
      needsSwitch: chainId !== currentChainId,
    })
  })

  // Sort by chainId for consistent ordering
  return summaries.sort((a, b) => a.chainId - b.chainId)
}

/**
 * Check if payments require cross-chain donations
 */
export function requiresCrossChainDonations(payments: DonationPayment[]): boolean {
  const uniqueChains = getUniqueChainIds(payments)
  return uniqueChains.length > 1
}

/**
 * Sort payments to minimize network switches
 * Groups payments by chain ID
 */
export function sortPaymentsByChain(payments: DonationPayment[]): DonationPayment[] {
  return [...payments].sort((a, b) => a.chainId - b.chainId)
}

/**
 * Format address for display (truncate middle)
 */
export function formatAddressForDisplay(
  address: string,
  startChars: number = 6,
  endChars: number = 4
): string {
  if (!address || address.length < startChars + endChars) {
    return address || ""
  }

  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
}

/**
 * Check if a value is a valid Ethereum address
 */
export function isValidAddress(address?: string): boolean {
  if (!address) return false
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * Validate all payments have required fields
 */
export function validatePayments(payments: DonationPayment[]): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (payments.length === 0) {
    errors.push("No donations to process")
    return { valid: false, errors }
  }

  payments.forEach((payment, index) => {
    if (!payment.projectId) {
      errors.push(`Payment ${index + 1}: Missing project ID`)
    }

    if (!payment.token) {
      errors.push(`Payment ${index + 1}: Missing token`)
    }

    if (!payment.amount || parseFloat(payment.amount) <= 0) {
      errors.push(`Payment ${index + 1}: Invalid amount`)
    }

    if (!payment.chainId) {
      errors.push(`Payment ${index + 1}: Missing chain ID`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Extract unique tokens from payments
 */
export function getUniqueTokens(payments: DonationPayment[]): SupportedToken[] {
  const tokenMap = new Map<string, SupportedToken>()

  payments.forEach((payment) => {
    const key = getTokenBalanceKey(payment.token)
    if (!tokenMap.has(key)) {
      tokenMap.set(key, payment.token)
    }
  })

  return Array.from(tokenMap.values())
}

/**
 * Check if a token needs approval for ERC20 transfers
 */
export function needsTokenApproval(token: SupportedToken): boolean {
  return !token.isNative
}

/**
 * Count how many tokens need approval from payments
 */
export function countTokensNeedingApproval(payments: DonationPayment[]): number {
  const uniqueTokens = getUniqueTokens(payments)
  return uniqueTokens.filter(needsTokenApproval).length
}
