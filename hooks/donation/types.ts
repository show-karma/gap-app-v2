import type { DonationType } from "@/types/donations";

export enum DonationStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
}

export interface DonationApiResponse {
  uid: string;
  chainID: number;
  donorAddress: string;
  projectUID: string;
  projectName?: string;
  projectSlug?: string;
  payoutAddress: string;
  amount: string;
  tokenSymbol: string;
  tokenAddress?: string;
  transactionHash: string;
  donationType: DonationType;
  fiatAmount?: number;
  fiatCurrency?: string;
  status: DonationStatus;
  createdAt: string;
}

export interface CreateDonationRequest {
  uid: string;
  chainID: number;
  donorAddress: string;
  projectUID: string;
  payoutAddress: string;
  amount: string;
  tokenSymbol: string;
  tokenAddress?: string;
  transactionHash: string;
  donationType: DonationType;
  fiatAmount?: number;
  fiatCurrency?: string;
  metadata?: Record<string, unknown>;
}

export enum OnrampProvider {
  COINBASE = "coinbase",
  STRIPE = "stripe",
}

export interface OnrampSessionRequest {
  provider: OnrampProvider;
  projectUid: string;
  payoutAddress: string;
  fiatAmount: number;
  fiatCurrency: string;
  network: string;
  targetAsset: string;
  donorAddress?: string;
}

export interface OnrampSessionResponse {
  sessionToken: string;
  sessionId: string;
  donationUid: string;
  expiresAt: string;
}
