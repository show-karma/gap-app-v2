"use client";

import { formatDate } from "@/utilities/formatDate";
import { getEffectiveStatus, kycStatusDescriptions, kycStatusLabels } from "../lib/status-config";
import type { KycStatusResponse } from "../types";

interface KycTooltipContentProps {
  status: KycStatusResponse | null;
  showLabel?: boolean;
}

/**
 * Shared tooltip content for KYC status display.
 * Used by both KycStatusBadge and KycVerificationCard.
 */
export function KycTooltipContent({ status, showLabel = true }: KycTooltipContentProps) {
  const effectiveStatus = getEffectiveStatus(status?.status, status?.isExpired);

  return (
    <div className="max-w-xs p-1">
      {showLabel && <p className="font-medium">{kycStatusLabels[effectiveStatus]}</p>}
      <p className="text-xs text-gray-400">{kycStatusDescriptions[effectiveStatus]}</p>
      {status?.verificationType && <p className="mt-1 text-xs">Type: {status.verificationType}</p>}
      {status?.verifiedAt && (
        <p className="text-xs text-gray-400">Verified: {formatDate(status.verifiedAt)}</p>
      )}
      {status?.expiresAt && (
        <p className="text-xs text-gray-400">
          {status.isExpired ? "Expired" : "Expires"}: {formatDate(status.expiresAt)}
        </p>
      )}
    </div>
  );
}
