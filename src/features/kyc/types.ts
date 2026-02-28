/**
 * KYC verification status enum
 */
export enum KycVerificationStatus {
  NOT_STARTED = "NOT_STARTED",
  PENDING = "PENDING",
  OUTREACH = "OUTREACH",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
  EXPIRED = "EXPIRED",
}

/**
 * KYC verification type enum
 */
export enum KycVerificationType {
  KYC = "KYC",
  KYB = "KYB",
}

/**
 * KYC provider type enum
 */
export enum KycProviderType {
  TREOVA = "TREOVA",
}

/**
 * KYC status response from the API
 */
export interface KycStatusResponse {
  projectUID: string;
  communityUID: string;
  status: KycVerificationStatus;
  verificationType?: KycVerificationType;
  verifiedAt?: string;
  expiresAt?: string;
  isExpired: boolean;
}

/**
 * KYC provider configuration response
 */
export interface KycConfigResponse {
  communityUID: string;
  providerType: KycProviderType;
  providerName: string;
  kycFormUrl: string;
  kybFormUrl: string;
  validityMonths: number;
  isEnabled: boolean;
}

/**
 * KYC form URL request
 */
export interface KycFormUrlRequest {
  projectUID: string;
  verificationType: KycVerificationType;
  walletAddress?: string;
}

/**
 * KYC form URL response
 */
export interface KycFormUrlResponse {
  formUrl: string;
  applicationReference: string;
}
