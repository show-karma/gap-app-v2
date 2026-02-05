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
  country?: string; // ISO 3166-1 alpha-2 code
  redirectUrl?: string; // URL to redirect user after completing onramp
}

export interface OnrampSessionResponse {
  sessionToken: string;
  sessionId: string;
  donationUid: string;
  expiresAt: string;
  onrampUrl?: string;
}

/**
 * Stripe onramp session status values.
 * Matches the OnrampSessionStatus type from @stripe/crypto.
 * @see https://docs.stripe.com/crypto/onramp
 */
export type StripeOnrampStatus =
  | "initialized"
  | "rejected"
  | "requires_payment"
  | "fulfillment_processing"
  | "fulfillment_complete"
  | "error";

export interface StripeOnrampSessionData {
  id: string;
  status: StripeOnrampStatus;
  transaction_details?: {
    destination_currency?: string;
    destination_amount?: string;
    destination_network?: string;
    source_currency?: string;
    source_amount?: string;
    transaction_id?: string;
    wallet_address?: string;
    wallet_addresses?: Record<string, string>;
  };
}
