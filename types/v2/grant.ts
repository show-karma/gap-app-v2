import type { Community } from "./community";

export type GrantScreen =
  | "milestones-and-updates"
  | "create-milestone"
  | "new"
  | "edit"
  | "impact-criteria"
  | "overview"
  | "complete-grant"
  | "outputs";

/**
 * V2 Grant Details - flat structure with properties at top level
 *
 * @example
 * grant.details?.title
 * grant.details?.programId
 */
export interface GrantDetails {
  title: string;
  amount?: string;
  currency?: string;
  description?: string;
  proposalURL?: string;
  startDate?: string | null;
  payoutAddress?: string;
  questions?: any[];
  selectedTrackIds?: string[];
  isCompleted?: boolean;
  completedAt?: string | null;
  lastDetailsUpdate?: string;
  programId?: string;
  fundUsage?: string;
}

/**
 * V2 Verification - represents a single verification attestation
 */
export interface Verification {
  uid: string;
  attester: string;
  reason?: string;
  createdAt: string;
}

/**
 * V2 Grant Milestone - flat structure with properties at top level
 *
 * @example
 * milestone.title
 * milestone.description
 * milestone.verified  // array of verifications in V2
 */
export interface GrantMilestone {
  uid: string;
  chainID: number;
  refUID?: string;
  type?: string;
  title: string;
  description?: string;
  priority?: number;
  endsAt?: number;
  startsAt?: number;
  currentStatus?: string;
  statusUpdatedAt?: string;
  statusHistory?: Array<{
    status: string;
    updatedAt: string;
    updatedBy?: string;
    statusReason?: string;
  }>;
  completed?: {
    uid?: string;
    chainID?: number;
    createdAt?: string;
    updatedAt?: string;
    attester?: string;
    data?: {
      reason?: string;
      proofOfWork?: string;
      deliverables?:
        | string
        | Array<{
            name?: string;
            proof?: string;
            description?: string;
          }>;
      completionPercentage?: number;
    };
  } | null;
  createdAt?: string;
  updatedAt?: string;
  /** V2: Array of verification attestations */
  verified: Verification[];
  // Additional fields for compatibility
  id?: string;
  schemaUID?: string;
  attester?: string;
  recipient?: string;
  revoked?: boolean;
  revocationTime?: number;
}

export interface GrantUpdate {
  uid: string;
  chainID: number;
  refUID: string;
  type?: string;
  title: string;
  text?: string;
  proofOfWork?: string;
  completionPercentage?: string;
  currentStatus?: string;
  statusUpdatedAt?: string;
  /** V2: Array of verification attestations */
  verified: Verification[];
  createdAt?: string;
  data?: {
    title?: string;
    text?: string;
    proofOfWork?: string;
    type?: string;
    completionPercentage?: string;
  };
}

export interface GrantCompletedTrackExplanation {
  trackUID: string;
  explanation: string;
}

export interface GrantCompleted {
  uid?: string;
  createdAt?: string;
  data?: {
    title?: string;
    text?: string;
    proofOfWork?: string;
    pitchDeckLink?: string;
    demoVideoLink?: string;
    trackExplanations?: GrantCompletedTrackExplanation[];
  };
}

export interface Grant {
  uid: string;
  chainID: number;
  type?: string;
  refUID?: string;
  projectUID?: string;
  communityUID?: string;
  programId?: string | null;
  originalProjectUID?: string | null;
  recipient?: string;
  attester?: string;
  data?: {
    communityUID?: string;
  };
  details?: GrantDetails;
  /** Array of grant milestones. May be undefined if not fetched. Default to [] when missing. */
  milestones?: GrantMilestone[];
  /** Array of grant updates. May be undefined if not fetched. Default to [] when missing. */
  updates?: GrantUpdate[];
  completed?: GrantCompleted | null;
  community?: Community;
  project?: {
    uid: string;
    chainID?: number;
    payoutAddress?: string;
    details?: {
      title?: string;
      slug?: string;
      description?: string;
      logoUrl?: string;
    };
  };
  categories?: string[];
  regions?: string[];
  amount?: string;
  createdAt?: string;
  updatedAt?: string;
}
