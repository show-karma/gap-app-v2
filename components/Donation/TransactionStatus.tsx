"use client";
import { SUPPORTED_NETWORKS, type SupportedToken } from "@/constants/supportedTokens";
import { getDetailedErrorInfo, isRecoverableError } from "@/utilities/donations/errorMessages";

interface TransferResult {
  projectId: string;
  status: "pending" | "success" | "error";
  hash?: string;
  error?: string;
}

interface CartItem {
  uid: string;
  title: string;
}

interface TransactionStatusProps {
  transfers: TransferResult[];
  items: CartItem[];
  selectedTokens: Record<string, SupportedToken>;
  onRetry?: () => void;
  canRetry?: boolean;
}

export function TransactionStatus({
  transfers,
  items,
  selectedTokens,
  onRetry,
  canRetry = false,
}: TransactionStatusProps) {
  if (transfers.length === 0) return null;

  const hasFailures = transfers.some((t) => t.status === "error");
  const hasSuccesses = transfers.some((t) => t.status === "success");
  const hasPending = transfers.some((t) => t.status === "pending");

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
          const project = items.find((item) => item.uid === transfer.projectId);
          const token = selectedTokens[transfer.projectId];
          const explorer = token
            ? `${SUPPORTED_NETWORKS[token.chainId]?.blockExplorer}/tx/${transfer.hash}`
            : undefined;

          const statusClasses =
            transfer.status === "success"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
              : transfer.status === "error"
              ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200"
              : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200";

          const statusLabel =
            transfer.status === "pending"
              ? "Awaiting confirmation"
              : transfer.status === "success"
              ? "Confirmed"
              : "Failed";

          // Parse error for better messaging
          let errorInfo = null;
          if (transfer.status === "error" && transfer.error) {
            errorInfo = getDetailedErrorInfo(transfer.error);
          }

          return (
            <div
              key={`${transfer.projectId}-${transfer.hash}`}
              className="rounded-xl border-2 border-gray-200 bg-white/70 p-4 dark:border-gray-800 dark:bg-zinc-900"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {project?.title || transfer.projectId}
                  </p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses}`}
                  >
                    {statusLabel}
                  </span>
                </div>

                {token && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {token.symbol} on{" "}
                    {SUPPORTED_NETWORKS[token.chainId]?.chainName || token.chainName}
                  </p>
                )}

                {transfer.status === "pending" && (
                  <div className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400"
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
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Processing transaction...
                    </span>
                  </div>
                )}

                {transfer.status === "error" && errorInfo && (
                  <div className="mt-2 rounded-lg bg-red-50 p-2 dark:bg-red-900/20">
                    <p className="text-xs text-red-700 dark:text-red-300">
                      {errorInfo.message}
                    </p>
                    {errorInfo.actionableSteps.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-red-800 dark:text-red-200">
                          What you can do:
                        </p>
                        <ul className="mt-1 space-y-0.5 text-xs text-red-700 dark:text-red-300">
                          {errorInfo.actionableSteps.slice(0, 2).map((step, idx) => (
                            <li key={idx}>• {step}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {transfer.hash && explorer && (
                  <a
                    href={explorer}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200"
                  >
                    View transaction on explorer
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
