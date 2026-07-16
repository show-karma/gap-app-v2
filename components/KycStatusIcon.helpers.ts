import { type KycStatusResponse, KycVerificationStatus } from "@/types/kyc";

/**
 * Shared helper to get the effective status accounting for expiration
 */
export function getEffectiveKycStatus(status: KycStatusResponse | null): KycVerificationStatus {
  return status?.isExpired
    ? KycVerificationStatus.EXPIRED
    : (status?.status ?? KycVerificationStatus.NOT_STARTED);
}
