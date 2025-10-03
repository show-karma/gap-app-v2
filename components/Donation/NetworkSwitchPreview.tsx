"use client";
import { useMemo } from "react";
import { SUPPORTED_NETWORKS, type SupportedToken } from "@/constants/supportedTokens";
import {
  getDonationSummaryByNetwork,
  countNetworkSwitches,
  type DonationPayment,
} from "@/utilities/donations/helpers";
import { estimateDonationTime, formatEstimatedTime } from "@/constants/donation";

interface NetworkSwitchPreviewProps {
  payments: DonationPayment[];
  currentChainId: number | null;
  className?: string;
}

/**
 * NetworkSwitchPreview Component
 *
 * Shows users upfront how many network switches are required for their donation.
 * Displays:
 * - Number of network switches needed
 * - Which networks will be used
 * - Number of donations per network
 * - Estimated total time
 *
 * Accessibility: WCAG 2.2 AA compliant with proper ARIA labels and semantic HTML
 */
export function NetworkSwitchPreview({
  payments,
  currentChainId,
  className = "",
}: NetworkSwitchPreviewProps) {
  const networkSummary = useMemo(() => {
    return getDonationSummaryByNetwork(payments, currentChainId);
  }, [payments, currentChainId]);

  const switchCount = useMemo(() => {
    return countNetworkSwitches(payments, currentChainId);
  }, [payments, currentChainId]);

  const estimatedTime = useMemo(() => {
    const approvalCount = payments.filter((p) => !p.token.isNative).length;
    const donationCount = payments.length;
    const totalSeconds = estimateDonationTime(
      switchCount,
      approvalCount,
      donationCount
    );
    return formatEstimatedTime(totalSeconds);
  }, [switchCount, payments]);

  // Don't show if only one network or no payments
  if (networkSummary.length <= 1 || payments.length === 0) {
    return null;
  }

  return (
    <div
      className={`rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30 ${className}`}
      role="alert"
      aria-live="polite"
      aria-label="Network switch preview"
    >
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50"
          aria-hidden="true"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-amber-600 dark:text-amber-400"
          >
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <circle cx="12" cy="12" r="10" />
          </svg>
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            {switchCount === 1
              ? "This donation requires 1 network switch"
              : `This donation requires ${switchCount} network switches`}
          </h3>

          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
            Your wallet will prompt you to switch networks during the donation
            process.
          </p>

          <div
            className="mt-3 space-y-2"
            role="list"
            aria-label="Network donation summary"
          >
            {networkSummary.map((summary, index) => (
              <div
                key={summary.chainId}
                className="flex items-center justify-between rounded-md bg-white/50 p-2 text-xs dark:bg-black/20"
                role="listitem"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium text-amber-900 dark:text-amber-100">
                    {index + 1}.
                  </span>
                  <span className="font-medium text-amber-900 dark:text-amber-100">
                    {summary.chainName}
                  </span>
                  {summary.needsSwitch && (
                    <span
                      className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/60 dark:text-amber-300"
                      aria-label="Network switch required"
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                      </svg>
                      Switch required
                    </span>
                  )}
                </div>
                <span
                  className="text-amber-700 dark:text-amber-300"
                  aria-label={`${summary.projectCount} ${
                    summary.projectCount === 1 ? "project" : "projects"
                  }`}
                >
                  {summary.projectCount}{" "}
                  {summary.projectCount === 1 ? "project" : "projects"}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-amber-200 pt-3 text-xs dark:border-amber-900/50">
            <span className="font-medium text-amber-900 dark:text-amber-100">
              Estimated time:
            </span>
            <span
              className="font-semibold text-amber-700 dark:text-amber-300"
              aria-label={`Estimated time: ${estimatedTime}`}
            >
              {estimatedTime}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
