"use client";
import { DonationPayment } from "@/store/donationCart";
import { SUPPORTED_NETWORKS } from "@/constants/supportedTokens";
import { useMemo } from "react";

interface DonationStepsPreviewProps {
  payments: DonationPayment[];
  onProceed: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface TransactionStep {
  type: "network_switch" | "approvals" | "donation";
  chainId: number;
  chainName: string;
  details: string[];
  estimatedTime: string;
}

export function DonationStepsPreview({ payments, onProceed, onCancel, isLoading }: DonationStepsPreviewProps) {
  const steps = useMemo(() => {
    const stepsList: TransactionStep[] = [];
    const chainMap = new Map<number, { approvals: string[], donations: number }>();

    // Group payments by chain
    payments.forEach(payment => {
      if (!chainMap.has(payment.chainId)) {
        chainMap.set(payment.chainId, { approvals: [], donations: 0 });
      }

      const chainData = chainMap.get(payment.chainId)!;

      // Add approval if token is not native
      if (!payment.token.isNative) {
        const approvalKey = `${payment.token.symbol} approval`;
        if (!chainData.approvals.includes(approvalKey)) {
          chainData.approvals.push(approvalKey);
        }
      }

      chainData.donations += 1;
    });

    // Convert to steps
    chainMap.forEach((data, chainId) => {
      const network = SUPPORTED_NETWORKS[chainId];
      const chainName = network?.chainName || `Chain ${chainId}`;

      // Add network switch step (except for first chain)
      if (stepsList.length > 0) {
        stepsList.push({
          type: "network_switch",
          chainId,
          chainName,
          details: [`Switch to ${chainName}`],
          estimatedTime: "5-10s"
        });
      }

      // Add approvals step if needed
      if (data.approvals.length > 0) {
        stepsList.push({
          type: "approvals",
          chainId,
          chainName,
          details: data.approvals.map(approval => `Approve ${approval.replace(' approval', '')}`),
          estimatedTime: data.approvals.length === 1 ? "10-15s" : `${10 + data.approvals.length * 5}-${15 + data.approvals.length * 10}s`
        });
      }

      // Add donation step
      stepsList.push({
        type: "donation",
        chainId,
        chainName,
        details: [`Execute ${data.donations} donation${data.donations > 1 ? 's' : ''}`],
        estimatedTime: "15-30s"
      });
    });

    return stepsList;
  }, [payments]);

  const totalEstimatedTime = useMemo(() => {
    const totalSeconds = steps.reduce((acc, step) => {
      const [min, max] = step.estimatedTime.split('-').map(t => parseInt(t.replace('s', '')));
      return acc + ((min + max) / 2);
    }, 0);

    if (totalSeconds < 60) {
      return `${Math.round(totalSeconds)}s`;
    } else {
      const minutes = Math.round(totalSeconds / 60);
      return `${minutes}m`;
    }
  }, [steps]);

  const uniqueChains = useMemo(() => {
    const chains = new Set(payments.map(p => p.chainId));
    return Array.from(chains).map(chainId => ({
      chainId,
      name: SUPPORTED_NETWORKS[chainId]?.chainName || `Chain ${chainId}`
    }));
  }, [payments]);

  const getStepIcon = (type: TransactionStep['type']) => {
    switch (type) {
      case "network_switch":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-200">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </div>
        );
      case "approvals":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-200">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4" />
              <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3" />
              <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3" />
            </svg>
          </div>
        );
      case "donation":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-200">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
              <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
              <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-zinc-950">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Transaction Steps Overview
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Review the steps required for your multi-chain donation
              </p>
            </div>
            <button
              onClick={onCancel}
              className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{uniqueChains.length}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Network{uniqueChains.length > 1 ? 's' : ''}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{steps.length}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Transaction{steps.length > 1 ? 's' : ''}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">~{totalEstimatedTime}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Estimated time</div>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="max-h-96 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  {getStepIcon(step.type)}
                  {index < steps.length - 1 && (
                    <div className="mt-2 h-8 w-px bg-gray-200 dark:bg-gray-700" />
                  )}
                </div>
                <div className="flex-1 pb-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {step.type === "network_switch" && "Switch Network"}
                      {step.type === "approvals" && "Token Approvals"}
                      {step.type === "donation" && "Execute Donations"}
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {step.estimatedTime}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    {step.chainName}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {step.details.map((detail, detailIndex) => (
                      <li key={detailIndex} className="text-xs text-gray-600 dark:text-gray-400">
                        • {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          <div className="mb-4 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 h-4 w-4 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-200 flex items-center justify-center text-xs">
                💡
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-200">
                <p className="font-medium">What to expect:</p>
                <ul className="mt-1 space-y-1">
                  <li>• Your wallet will prompt you to switch networks automatically</li>
                  <li>• Each transaction requires your approval in the wallet</li>
                  <li>• You can cancel at any step if needed</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Review Changes
            </button>
            <button
              onClick={onProceed}
              disabled={isLoading}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Processing..." : "Start Donations"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}