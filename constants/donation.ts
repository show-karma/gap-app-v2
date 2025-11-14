/**
 * Donation Feature Constants
 *
 * Centralized configuration for all donation-related functionality.
 * These constants control behavior like pagination, limits, timeouts, and retry logic.
 */

/**
 * Pagination and Display Constants
 */
export const DONATION_CONSTANTS = {
  /** Number of projects displayed per page in browsing view */
  PROJECTS_PER_PAGE: 12,

  /** Maximum number of projects allowed in the donation cart */
  MAX_CART_SIZE: 50,

  /** Warning threshold: show warning when cart size approaches limit */
  CART_SIZE_WARNING_THRESHOLD: 40,

  /** Maximum number of donations that can be processed in a single batch */
  MAX_BATCH_SIZE: 20,
} as const

/**
 * Performance and Caching Constants
 */
export const BALANCE_CONSTANTS = {
  /** Time-to-live for cached balance data (5 minutes) */
  CACHE_TTL_MS: 5 * 60 * 1000,

  /** Timeout for fetching balances from RPC (10 seconds) */
  FETCH_TIMEOUT_MS: 10_000,

  /** Show "slow fetch" warning after this threshold (5 seconds) */
  SLOW_FETCH_WARNING_THRESHOLD_MS: 5_000,
} as const

/**
 * Network Switching and Retry Logic
 */
export const NETWORK_CONSTANTS = {
  /** Maximum number of retry attempts for network switching */
  SWITCH_MAX_RETRIES: 3,

  /** Exponential backoff delays for retries (in milliseconds) */
  RETRY_DELAYS_MS: [1_000, 2_000, 4_000] as const,

  /** Maximum attempts to wait for wallet client to sync to new chain */
  WALLET_SYNC_MAX_ATTEMPTS: 10,

  /** Delay between wallet sync attempts (1 second) */
  WALLET_SYNC_DELAY_MS: 1_000,
} as const

/**
 * User Experience Constants
 */
export const UX_CONSTANTS = {
  /** Duration for success toast notifications (3 seconds) */
  SUCCESS_TOAST_DURATION_MS: 3_000,

  /** Duration for error toast notifications (5 seconds) */
  ERROR_TOAST_DURATION_MS: 5_000,

  /** Duration for loading toast notifications (2 seconds) */
  LOADING_TOAST_DURATION_MS: 2_000,

  /** Estimated time per network switch (in seconds) */
  ESTIMATED_NETWORK_SWITCH_TIME_SECONDS: 30,

  /** Estimated time per token approval (in seconds) */
  ESTIMATED_APPROVAL_TIME_SECONDS: 20,

  /** Estimated time per donation transaction (in seconds) */
  ESTIMATED_DONATION_TIME_SECONDS: 15,
} as const

/**
 * Transaction Confirmation Constants
 */
export const TRANSACTION_CONSTANTS = {
  /** Number of block confirmations required before considering a transaction final */
  REQUIRED_CONFIRMATIONS: 3,
} as const

/**
 * Validation Constants
 */
export const VALIDATION_CONSTANTS = {
  /** Minimum donation amount (to prevent dust transactions) */
  MIN_DONATION_AMOUNT: 0.000001,

  /** Maximum donation amount (sanity check, can be adjusted) */
  MAX_DONATION_AMOUNT: 1_000_000_000,

  /** Number of decimal places to display for token amounts */
  DISPLAY_DECIMALS: 4,

  /** Number of decimal places for balance checks */
  BALANCE_CHECK_DECIMALS: 6,
} as const

/**
 * Helper Functions
 */

/**
 * Get the total estimated time for a donation flow
 */
export function estimateDonationTime(
  networkSwitchCount: number,
  approvalCount: number,
  donationCount: number
): number {
  return (
    networkSwitchCount * UX_CONSTANTS.ESTIMATED_NETWORK_SWITCH_TIME_SECONDS +
    approvalCount * UX_CONSTANTS.ESTIMATED_APPROVAL_TIME_SECONDS +
    donationCount * UX_CONSTANTS.ESTIMATED_DONATION_TIME_SECONDS
  )
}

/**
 * Format time in seconds to human-readable string
 */
export function formatEstimatedTime(seconds: number): string {
  if (seconds < 60) {
    return `~${seconds} seconds`
  }

  const minutes = Math.ceil(seconds / 60)
  return `~${minutes} minute${minutes > 1 ? "s" : ""}`
}

/**
 * Check if cart size is approaching the limit
 */
export function isCartSizeWarning(cartSize: number): boolean {
  return cartSize >= DONATION_CONSTANTS.CART_SIZE_WARNING_THRESHOLD
}

/**
 * Check if cart is at maximum capacity
 */
export function isCartFull(cartSize: number): boolean {
  return cartSize >= DONATION_CONSTANTS.MAX_CART_SIZE
}

/**
 * Get the retry delay for a given attempt number
 */
export function getRetryDelay(attemptNumber: number): number {
  const delays = NETWORK_CONSTANTS.RETRY_DELAYS_MS

  if (attemptNumber >= delays.length) {
    return delays[delays.length - 1]
  }

  return delays[attemptNumber]
}

/**
 * Check if balance cache is still valid
 */
export function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < BALANCE_CONSTANTS.CACHE_TTL_MS
}
