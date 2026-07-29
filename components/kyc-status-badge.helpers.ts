import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  MinusCircleIcon,
  NoSymbolIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";
import { type KycStatusResponse, KycVerificationStatus } from "@/types/kyc";
import { formatDate } from "@/utilities/formatDate";

export const kycStatusConfig: Record<
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
    label: "Not Applicable",
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
  const config = kycStatusConfig[effectiveStatus];
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
