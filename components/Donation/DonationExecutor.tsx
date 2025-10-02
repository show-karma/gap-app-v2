"use client";
import { TransactionStatus } from "./TransactionStatus";
import { ValidationErrors } from "./ValidationErrors";
import type { SupportedToken } from "@/constants/supportedTokens";

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

interface DonationExecutorProps {
  transfers: TransferResult[];
  items: CartItem[];
  selectedTokens: Record<string, SupportedToken>;
  validationErrors: string[];
  missingPayouts: string[];
  isExecuting: boolean;
  isSwitching: boolean;
  isFetchingPayouts: boolean;
  isFetchingCrossChainBalances: boolean;
  isConnected: boolean;
  address?: string;
  canProceed: boolean;
  isCurrentNetworkSupported: boolean;
  executionState: {
    phase: string;
    approvalProgress?: number;
  };
  executeButtonLabel: string;
  onExecute: () => void;
}

export function DonationExecutor({
  transfers,
  items,
  selectedTokens,
  validationErrors,
  missingPayouts,
  isExecuting,
  isSwitching,
  isFetchingPayouts,
  isFetchingCrossChainBalances,
  isConnected,
  address,
  canProceed,
  isCurrentNetworkSupported,
  executeButtonLabel,
  onExecute,
}: DonationExecutorProps) {
  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-sm dark:border-gray-800 dark:bg-zinc-950/70 backdrop-blur-sm">
        <div className="flex flex-col gap-4">
          <button
            type="button"
            disabled={
              !canProceed ||
              !isCurrentNetworkSupported ||
              isSwitching ||
              isExecuting ||
              isFetchingPayouts ||
              isFetchingCrossChainBalances ||
              !isConnected ||
              !address
            }
            className={`inline-flex h-14 items-center justify-center rounded-full px-8 text-sm font-semibold tracking-wide transition-all duration-200 ${
              canProceed &&
              isCurrentNetworkSupported &&
              !isSwitching &&
              !isExecuting &&
              !isFetchingPayouts &&
              !isFetchingCrossChainBalances &&
              isConnected &&
              address
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl transform hover:scale-[1.02]"
                : "bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400 cursor-not-allowed"
            }`}
            onClick={onExecute}
          >
            {isExecuting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                {executeButtonLabel}
              </div>
            )}
          </button>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              You&apos;ll approve each token once per network and then confirm the batch
              transfer. Multi-chain donations are processed securely across networks.
            </p>
          </div>
        </div>
      </div>

      <ValidationErrors
        validationErrors={validationErrors}
        missingPayouts={missingPayouts}
        items={items}
      />

      <TransactionStatus
        transfers={transfers}
        items={items}
        selectedTokens={selectedTokens}
      />
    </>
  );
}
