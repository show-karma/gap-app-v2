export enum KycVerificationStatus {
  NOT_STARTED = "NOT_STARTED",
  PENDING = "PENDING",
  OUTREACH = "OUTREACH",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
  EXPIRED = "EXPIRED",
}

export enum KycVerificationType {
  KYC = "KYC",
  KYB = "KYB",
}

export enum KycProviderType {
  TREOVA = "TREOVA",
  FILECOIN = "FILECOIN",
}

export interface KycStatusResponse {
  projectUID: string;
  communityUID: string;
  status: KycVerificationStatus;
  verificationType?: KycVerificationType;
  verifiedAt?: string;
  expiresAt?: string;
  isExpired: boolean;
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
