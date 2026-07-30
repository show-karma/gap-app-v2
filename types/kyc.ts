export enum KycVerificationStatus {
  NOT_STARTED = "NOT_STARTED",
  PENDING = "PENDING",
  OUTREACH = "OUTREACH",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
  EXPIRED = "EXPIRED",
  NOT_APPLICABLE = "NOT_APPLICABLE",
}

export enum KycVerificationType {
  KYC = "KYC",
  KYB = "KYB",
}

export enum KycProviderType {
  TREOVA = "TREOVA",
}

export type KycStatusSource = "WEBHOOK" | "STAFF_OVERRIDE" | "COMMUNITY_ADMIN";

export interface KycStatusResponse {
  projectUID: string;
  communityUID: string;
  status: KycVerificationStatus;
  verificationType?: KycVerificationType;
  verifiedAt?: string;
  expiresAt?: string;
  isExpired: boolean;
  statusSource?: KycStatusSource;
  statusUpdatedAt?: string;
}

/** The only two statuses the applicability toggle can set. */
export type KycApplicabilityStatus =
  | KycVerificationStatus.NOT_APPLICABLE
  | KycVerificationStatus.NOT_STARTED;

export interface KycApplicabilityRequest {
  applicationReference: string;
  verificationType: KycVerificationType;
  status: KycApplicabilityStatus;
  reason?: string;
}

export interface KycConfigResponse {
  communityUID: string;
  providerType: KycProviderType;
  providerName: string;
  kycFormUrl: string;
  kybFormUrl: string;
  validityMonths: number;
  isEnabled: boolean;
}

export interface KycBatchStatusRequest {
  projectUIDs: string[];
}

export interface KycBatchStatusResponse {
  statuses: Record<string, KycStatusResponse | null>;
}

export interface KycFormUrlRequest {
  projectUID: string;
  verificationType: KycVerificationType;
  walletAddress?: string;
}

export interface KycFormUrlResponse {
  formUrl: string;
  applicationReference: string;
}
