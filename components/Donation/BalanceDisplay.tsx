"use client"

interface BalanceError {
  message: string
  chainIds: number[]
  canRetry: boolean
}

interface BalanceDisplayProps {
  selectedToken?: {
    symbol: string
    chainId: number
  }
  balanceByTokenKey: Record<string, string>
  isFetchingBalances?: boolean
  balanceError?: BalanceError | null
  isSlowFetch?: boolean
  onRetry?: () => void
  canRetry?: boolean
}

export function BalanceDisplay({
  selectedToken,
  balanceByTokenKey,
  isFetchingBalances = false,
  balanceError = null,
  isSlowFetch = false,
  onRetry,
  canRetry = false,
}: BalanceDisplayProps) {
  if (!selectedToken) return null

  const balanceKey = `${selectedToken.symbol}-${selectedToken.chainId}`
  const tokenBalance = balanceByTokenKey[balanceKey]

  // Show error state if balance fetch failed for this specific chain
  if (balanceError?.chainIds.includes(selectedToken.chainId)) {
    return (
      <div className="mt-1 text-right text-xs">
        <div className="flex items-center justify-end gap-1">
          <span className="text-red-600 dark:text-red-400">Balance unavailable</span>
          {canRetry && onRetry && (
            <button
              onClick={onRetry}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
            >
              Retry
            </button>
          )}
        </div>
        <div className="mt-0.5 text-gray-500 dark:text-gray-400">
          You can still proceed with the donation
        </div>
      </div>
    )
  }

  // Show loading state
  if (isFetchingBalances && !tokenBalance) {
    return (
      <div className="mt-1 text-right text-xs">
        <div className="flex items-center justify-end gap-1.5">
          <svg
            className="h-3 w-3 animate-spin text-blue-600 dark:text-blue-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-gray-500 dark:text-gray-400">Loading balance...</span>
        </div>
        {isSlowFetch && (
          <div className="mt-0.5 text-amber-600 dark:text-amber-400">
            Taking longer than expected...
          </div>
        )}
      </div>
    )
  }

  // Show balance if available
  if (tokenBalance) {
    return (
      <div className="mt-1 text-right text-xs text-gray-500 dark:text-gray-400">
        {parseFloat(tokenBalance).toFixed(4)} available
      </div>
    )
  }

  // Show fallback message if no balance info and not loading
  if (!isFetchingBalances && !tokenBalance) {
    return (
      <div className="mt-1 text-right text-xs text-gray-400 dark:text-gray-500">
        Balance unavailable
      </div>
    )
  }

  return null
}
