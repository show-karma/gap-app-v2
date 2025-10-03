"use client";
import { DonationExecutionState } from "@/hooks/useDonationTransfer";

interface DonationApprovalStatusProps {
  executionState: DonationExecutionState;
}

export function DonationApprovalStatus({ executionState }: DonationApprovalStatusProps) {
  if (executionState.phase === "completed" || executionState.phase === "error") {
    return null;
  }

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case "checking":
        return "🔍";
      case "approving":
        return "⏳";
      case "donating":
        return "💸";
      default:
        return "⚡";
    }
  };

  const getPhaseTitle = (phase: string) => {
    switch (phase) {
      case "checking":
        return "Checking Token Approvals";
      case "approving":
        return "Approving Tokens";
      case "donating":
        return "Submitting Donations";
      default:
        return "Processing";
    }
  };

  const getPhaseDescription = (phase: string) => {
    switch (phase) {
      case "checking":
        return "Verifying if tokens need approval for Permit2...";
      case "approving":
        return "Approving tokens for batch transfer. Please confirm transactions in your wallet.";
      case "donating":
        return "Submitting batch donation transaction. Please confirm in your wallet.";
      default:
        return "Processing your donation...";
    }
  };

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
      <div className="flex items-start space-x-3">
        <div className="text-2xl">{getPhaseIcon(executionState.phase)}</div>
        <div className="flex-1">
          <h3 className="font-medium text-blue-900 dark:text-blue-100">
            {getPhaseTitle(executionState.phase)}
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            {getPhaseDescription(executionState.phase)}
          </p>

          {executionState.phase === "approving" && executionState.approvals && (
            <div className="mt-3 space-y-2">
              {executionState.approvals.map((approval, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-blue-800 dark:text-blue-200">
                    {approval.tokenSymbol} approval
                  </span>
                  <span className={`font-medium ${
                    approval.status === "confirmed"
                      ? "text-green-600 dark:text-green-400"
                      : approval.status === "failed"
                      ? "text-red-600 dark:text-red-400"
                      : "text-blue-600 dark:text-blue-400"
                  }`}>
                    {approval.status === "confirmed" && "✅ Confirmed"}
                    {approval.status === "failed" && "❌ Failed"}
                    {approval.status === "pending" && "⏳ Pending"}
                  </span>
                </div>
              ))}

              {typeof executionState.approvalProgress === "number" && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400 mb-1">
                    <span>Progress</span>
                    <span>{Math.round(executionState.approvalProgress)}%</span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                    <div
                      className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${executionState.approvalProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}