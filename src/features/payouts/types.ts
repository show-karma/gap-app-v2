// Payouts-related types

export interface Payout {
  id: string;
  communityId: string;
  projectId?: string;
  amount: string;
  currency: string;
  recipientAddress: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transactionHash?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PayoutBatch {
  id: string;
  communityId: string;
  payouts: Payout[];
  status: 'draft' | 'approved' | 'processing' | 'completed';
  createdAt: string;
  createdBy: string;
}

export interface PayoutCSVRow {
  recipientAddress: string;
  amount: string;
  projectId?: string;
  description?: string;
}