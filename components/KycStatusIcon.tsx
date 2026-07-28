"use client";

import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  MinusCircleIcon,
  NoSymbolIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";
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

const statusConfig: Record<
  KycVerificationStatus,
  { icon: typeof CheckCircleIcon; color: string; label: string; description: string }
> = {
  [KycVerificationStatus.NOT_STARTED]: {
    icon: MinusCircleIcon,
    color: "text-gray-400",
    label: "Not Started",
    description: "KYC verification has not been initiated",
  },
  [KycVerificationStatus.PENDING]: {
    icon: ClockIcon,
    color: "text-yellow-500",
    label: "Pending",
    description: "KYC verification is in progress",
  },
  [KycVerificationStatus.OUTREACH]: {
    icon: ExclamationCircleIcon,
    color: "text-orange-500",
    label: "Outreach",
    description: "Additional information requested",
  },
  [KycVerificationStatus.VERIFIED]: {
    icon: CheckCircleIcon,
    color: "text-green-500",
    label: "Verified",
    description: "KYC verification completed successfully",
  },
  [KycVerificationStatus.REJECTED]: {
    icon: XCircleIcon,
    color: "text-red-500",
    label: "Rejected",
    description: "KYC verification was rejected",
  },
  [KycVerificationStatus.EXPIRED]: {
    icon: ExclamationCircleIcon,
    color: "text-amber-500",
    label: "Expired",
    description: "KYC verification has expired",
  },
  [KycVerificationStatus.NOT_APPLICABLE]: {
    icon: NoSymbolIcon,
    color: "text-gray-400 dark:text-gray-600",
    label: "Not applicable",
    description: "KYC/KYB is not required for this application",
  },
};

/**
 * Shared helper to get the effective status accounting for expiration
 */
export function getEffectiveKycStatus(status: KycStatusResponse | null): KycVerificationStatus {
  return status?.isExpired
    ? KycVerificationStatus.EXPIRED
    : (status?.status ?? KycVerificationStatus.NOT_STARTED);
}

/**
 * Shared tooltip content component to reduce duplication
 */
interface KycTooltipContentProps {
  status: KycStatusResponse | null;
  showDates?: boolean;
}

export function KycTooltipContent({ status, showDates = true }: KycTooltipContentProps) {
  const effectiveStatus = getEffectiveKycStatus(status);
  const config = statusConfig[effectiveStatus];

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
  const config = statusConfig[effectiveStatus];
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
 * Base pill classes shared between the read-only badge and the
 * admin-interactive badge (KycStatusBadgeWithActions).
 */
export const KYC_BADGE_BASE =
  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium";

export const kycBadgeColors: Record<KycVerificationStatus, string> = {
  [KycVerificationStatus.NOT_STARTED]:
    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  [KycVerificationStatus.PENDING]:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  [KycVerificationStatus.OUTREACH]:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  [KycVerificationStatus.VERIFIED]:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  [KycVerificationStatus.REJECTED]: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  [KycVerificationStatus.EXPIRED]:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  // The only outline chip — reads "out of scope" rather than "waiting"
  [KycVerificationStatus.NOT_APPLICABLE]:
    "bg-transparent text-gray-500 ring-1 ring-inset ring-gray-300 dark:bg-transparent dark:text-gray-500 dark:ring-zinc-700",
};

/**
 * Format the badge label - shows only status (the "KYC/KYB:" label is shown separately)
 */
export function getKycBadgeLabel(
  status: KycStatusResponse | null,
  effectiveStatus: KycVerificationStatus,
  showValidityInLabel: boolean
): string {
  const config = statusConfig[effectiveStatus];
  const verificationType = status?.verificationType ?? "KYC/KYB";
  const statusLabel = config.label.toLowerCase();

  // For VERIFIED status, include validity date
  if (
    effectiveStatus === KycVerificationStatus.VERIFIED &&
    status?.expiresAt &&
    showValidityInLabel
  ) {
    const expiresDate = formatDate(status.expiresAt);
    return `${verificationType} ${statusLabel} (valid until ${expiresDate})`;
  }

  // For NOT_STARTED and NOT_APPLICABLE, show only the label (type-agnostic)
  if (
    effectiveStatus === KycVerificationStatus.NOT_STARTED ||
    effectiveStatus === KycVerificationStatus.NOT_APPLICABLE
  ) {
    return config.label;
  }

  // For all other statuses, include verification type
  return `${verificationType} ${statusLabel}`;
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
