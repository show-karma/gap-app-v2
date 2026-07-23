export type SimplifiedGrant = {
  grant: string;
  project: string;
  description: string;
  createdOn: string;
  categories: string[];
  regions: string[];
  grantChainId: number;
  uid: string;
  projectUid: string;
  projectSlug: string;
  projectChainId?: number;
  programId: string;
  payoutAddress?: string;
  /** Chain-specific payout addresses keyed by chain ID (e.g., { "10": "0x...", "42161": "0x..." }) */
  chainPayoutAddress?: Record<string, string>;
  payoutAmount?: string;
};
