"use client"
import type { SupportedToken } from "@/constants/supportedTokens"
import { TransactionStatusItem } from "./TransactionStatusItem"

interface TransferResult {
  projectId: string
  status: "pending" | "success" | "error"
  hash?: string
  error?: string
}

interface CartItem {
  uid: string
  title: string
}

interface TransactionStatusProps {
  transfers: TransferResult[]
  items: CartItem[]
  selectedTokens: Record<string, SupportedToken>
  onRetry?: () => void
  canRetry?: boolean
}

export function TransactionStatus({
  transfers,
  items,
  selectedTokens,
  onRetry,
  canRetry = false,
}: TransactionStatusProps) {
  if (transfers.length === 0) return null

  const hasFailures = transfers.some((t) => t.status === "error")
  const hasSuccesses = transfers.some((t) => t.status === "success")
  const hasPending = transfers.some((t) => t.status === "pending")

  return (
    <div className="rounded-2xl border-2 border-gray-200 bg-white/80 p-5 shadow-sm dark:border-gray-800 dark:bg-zinc-950/70">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          Transaction Status
        </h3>
        {hasFailures && canRetry && onRetry && (
          <button
            onClick={onRetry}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Retry Failed
          </button>
        )}
      </div>

      {hasFailures && (
        <div className="mb-3 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
          <p className="text-xs text-red-700 dark:text-red-300">
            Some donations failed. Review the errors below and retry if needed.
          </p>
        </div>
      )}

      <div className="mt-3 space-y-3">
        {transfers.map((transfer) => {
          const project = items.find((item) => item.uid === transfer.projectId)
          const token = selectedTokens[transfer.projectId]

          return (
            <TransactionStatusItem
              key={`${transfer.projectId}-${transfer.hash}`}
              transfer={transfer}
              projectTitle={project?.title}
              token={token}
            />
          )
        })}
      </div>
    </div>
  )
}
