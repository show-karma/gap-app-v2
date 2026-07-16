import { AlertCircle, CheckCircle, Clock, MinusCircle, XCircle } from "lucide-react";
import { KycVerificationStatus } from "@/types/kyc";

/**
 * KYC status badge styles using plain Tailwind class strings (no tailwind-variants).
 */
export const kycStatusStyles: Record<KycVerificationStatus, string> = {
  [KycVerificationStatus.NOT_STARTED]:
    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  [KycVerificationStatus.PENDING]:
    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  [KycVerificationStatus.OUTREACH]:
    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  [KycVerificationStatus.VERIFIED]:
    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  [KycVerificationStatus.REJECTED]:
    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  [KycVerificationStatus.EXPIRED]:
    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

/**
 * Icon styles per status.
 */
export const kycIconStyles: Record<KycVerificationStatus, string> = {
  [KycVerificationStatus.NOT_STARTED]: "h-3.5 w-3.5 text-gray-400",
  [KycVerificationStatus.PENDING]: "h-3.5 w-3.5 text-yellow-500",
  [KycVerificationStatus.OUTREACH]: "h-3.5 w-3.5 text-orange-500",
  [KycVerificationStatus.VERIFIED]: "h-3.5 w-3.5 text-green-500",
  [KycVerificationStatus.REJECTED]: "h-3.5 w-3.5 text-red-500",
  [KycVerificationStatus.EXPIRED]: "h-3.5 w-3.5 text-amber-500",
};

/**
 * Icon component mapping per status.
 */
export const kycStatusIcons: Record<KycVerificationStatus, typeof CheckCircle> = {
  [KycVerificationStatus.NOT_STARTED]: MinusCircle,
  [KycVerificationStatus.PENDING]: Clock,
  [KycVerificationStatus.OUTREACH]: AlertCircle,
  [KycVerificationStatus.VERIFIED]: CheckCircle,
  [KycVerificationStatus.REJECTED]: XCircle,
  [KycVerificationStatus.EXPIRED]: AlertCircle,
};

/**
 * Short labels for status badges.
 */
export const kycStatusLabels: Record<KycVerificationStatus, string> = {
  [KycVerificationStatus.NOT_STARTED]: "Not Started",
  [KycVerificationStatus.PENDING]: "Pending",
  [KycVerificationStatus.OUTREACH]: "Info Needed",
  [KycVerificationStatus.VERIFIED]: "Verified",
  [KycVerificationStatus.REJECTED]: "Rejected",
  [KycVerificationStatus.EXPIRED]: "Expired",
};

/**
 * Detailed descriptions for tooltips and cards.
 */
export const kycStatusDescriptions: Record<KycVerificationStatus, string> = {
  [KycVerificationStatus.NOT_STARTED]:
    "Identity verification is required for this program. You will receive a verification link from the program administrator.",
  [KycVerificationStatus.PENDING]:
    "Your verification is being reviewed. This usually takes 1-2 business days.",
  [KycVerificationStatus.OUTREACH]:
    "Additional information is required to complete your verification. Please check your email for instructions.",
  [KycVerificationStatus.VERIFIED]: "Your identity has been verified successfully.",
  [KycVerificationStatus.REJECTED]:
    "Your verification was not approved. Please contact the program administrator for more information.",
  [KycVerificationStatus.EXPIRED]:
    "Your verification has expired. Please contact the program administrator to receive a new verification link.",
};

/**
 * Get the effective status, accounting for expiration.
 * Only shows EXPIRED if the status was VERIFIED — a PENDING status cannot expire.
 */
export function getEffectiveStatus(
  status: KycVerificationStatus | undefined,
  isExpired: boolean | undefined
): KycVerificationStatus {
  if (isExpired && status === KycVerificationStatus.VERIFIED) {
    return KycVerificationStatus.EXPIRED;
  }
  return status ?? KycVerificationStatus.NOT_STARTED;
}
