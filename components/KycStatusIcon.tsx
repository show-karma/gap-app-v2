"use client";

import {
  getEffectiveKycStatus,
  getKycBadgeLabel,
  KYC_BADGE_BASE,
  kycBadgeColors,
  kycStatusConfig,
} from "@/components/kyc-status-badge.helpers";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { type KycStatusResponse, KycVerificationStatus } from "@/types/kyc";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";

interface KycStatusIconProps {
  status: KycStatusResponse | null;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

/**
 * Shared tooltip content component to reduce duplication
 */
interface KycTooltipContentProps {
  status: KycStatusResponse | null;
  showDates?: boolean;
}

export function KycTooltipContent({ status, showDates = true }: KycTooltipContentProps) {
  const effectiveStatus = getEffectiveKycStatus(status);
  const config = kycStatusConfig[effectiveStatus];

  return (
    <div className="space-y-1 text-xs">
      <p className="font-medium">{config.label}</p>
      <p className="text-gray-400">{config.description}</p>
      {/* NOT_APPLICABLE is type-agnostic — the exemption covers both KYC and KYB */}
      {status?.verificationType && effectiveStatus !== KycVerificationStatus.NOT_APPLICABLE && (
        <p>
          Type: <span className="font-medium">{status.verificationType}</span>
        </p>
      )}
      {showDates && status?.verifiedAt && (
        <p>
          Verified: <span className="font-medium">{formatDate(status.verifiedAt)}</span>
        </p>
      )}
      {showDates && status?.expiresAt && (
        <p>
          {status.isExpired ? "Expired" : "Expires"}:{" "}
          <span className="font-medium">{formatDate(status.expiresAt)}</span>
        </p>
      )}
    </div>
  );
}

export function KycStatusIcon({
  status,
  size = "md",
  showTooltip = true,
  className,
}: KycStatusIconProps) {
  const effectiveStatus = getEffectiveKycStatus(status);
  const config = kycStatusConfig[effectiveStatus];
  const Icon = config.icon;

  const iconElement = (
    <Icon className={cn(sizeClasses[size], config.color, className)} aria-label={config.label} />
  );

  if (!showTooltip) {
    return iconElement;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help">{iconElement}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <KycTooltipContent status={status} showDates />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Compact badge version of KYC status for table cells
 */
export function KycStatusBadge({
  status,
  className,
  showValidityInLabel = true,
}: {
  status: KycStatusResponse | null;
  className?: string;
  showValidityInLabel?: boolean;
}) {
  const effectiveStatus = getEffectiveKycStatus(status);
  const badgeLabel = getKycBadgeLabel(status, effectiveStatus, showValidityInLabel);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              KYC_BADGE_BASE,
              "cursor-help",
              kycBadgeColors[effectiveStatus],
              className
            )}
          >
            <KycStatusIcon status={status} size="sm" showTooltip={false} />
            <span>{badgeLabel}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm">
          <KycTooltipContent status={status} showDates={!showValidityInLabel} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
