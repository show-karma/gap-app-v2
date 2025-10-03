"use client";

interface PayoutInfo {
  address?: string;
  isLoading: boolean;
  isMissing: boolean;
}

interface PayoutAddressDisplayProps {
  payoutInfo?: PayoutInfo;
  formatAddress: (address?: string) => string;
}

export function PayoutAddressDisplay({
  payoutInfo,
  formatAddress,
}: PayoutAddressDisplayProps) {
  if (!payoutInfo) return null;

  if (payoutInfo.isLoading) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-xs text-blue-600 dark:bg-blue-900/40 dark:text-blue-200">
        Loading
      </span>
    );
  }

  if (payoutInfo.isMissing) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-600 dark:bg-red-900/40 dark:text-red-200">
        Missing payout
      </span>
    );
  }

  if (payoutInfo.address) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
        {formatAddress(payoutInfo.address)}
      </span>
    );
  }

  return null;
}
