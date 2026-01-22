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
  country?: string; // ISO 3166-1 alpha-2 code (required for Coinbase)
  redirectUrl?: string; // URL to redirect user after completing onramp
}

export interface OnrampSessionResponse {
  sessionToken: string;
  sessionId: string;
  donationUid: string;
  expiresAt: string;
  onrampUrl?: string; // Direct URL for Coinbase Quote-based flow
}
