import { DonationType } from '@/types/donations';

export enum DonationStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface DonationApiResponse {
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
  metadata?: Record<string, any>;
}

export interface OnrampRequest {
  projectId: string;
  payoutAddress: string;
  fiatAmount: number;
  fiatCurrency: string;
  targetToken: string;
  network: number;
  userEmail?: string;
  redirectUrl: string;
}

export interface OnrampResponse {
  url: string;
  sessionId: string;
}
