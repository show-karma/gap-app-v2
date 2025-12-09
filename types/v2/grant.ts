// V2 Grant API Response types

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
 * IMPORTANT: Always use top-level properties (e.g., `details.title`, `details.programId`).
 * The nested `data` field is DEPRECATED and only exists for SDK compatibility during migration.
 *
 * @example
 * // ✅ Correct V2 access
 * grant.details?.title
 * grant.details?.programId
 *
 * // ❌ Deprecated V1 access (avoid)
 * grant.details?.data?.title
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
  /**
   * @deprecated Use top-level properties instead. This field exists only for SDK compatibility.
   * Will be removed in a future version.
   */
  data?: {
    title?: string;
    amount?: string;
    description?: string;
    proposalURL?: string;
    startDate?: number;
    payoutAddress?: string;
    questions?: any[];
    programId?: string;
    type?: string;
    selectedTrackIds?: string[];
  };
}

/**
 * V2 Grant Milestone - flat structure with properties at top level
 *
 * IMPORTANT: Always use top-level properties (e.g., `milestone.title`, `milestone.description`).
 * The nested `data` field is DEPRECATED and only exists for SDK compatibility during migration.
 *
 * @example
 * // ✅ Correct V2 access
 * milestone.title
 * milestone.description
 * milestone.verified  // boolean in V2
 *
 * // ❌ Deprecated V1 access (avoid)
 * milestone.data?.title
 */
export interface GrantMilestone {
  uid: string;
  refUID?: string;
  type?: string;
  title: string;
  description?: string;
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
    createdAt?: string;
    updatedAt?: string;
    data?: {
      reason?: string;
      proofOfWork?: string;
      deliverables?: string;
    };
  } | null;
  createdAt?: string;
  updatedAt?: string;
  /** V2: Simple boolean. V1 used array of attesters. */
  verified?: boolean;
  /**
   * @deprecated Use top-level properties instead. This field exists only for SDK compatibility.
   * Will be removed in a future version.
   */
  data?: {
    title?: string;
    description?: string;
    endsAt?: number;
    startsAt?: number;
    type?: string;
    priority?: number;
  };
  // Additional fields for compatibility
  id?: string;
  schemaUID?: string;
  attester?: string;
  recipient?: string;
  revoked?: boolean;
  revocationTime?: number;
  chainID?: number;
}

export interface GrantUpdate {
  uid: string;
  refUID?: string;
  type?: string;
  title: string;
  text?: string;
  proofOfWork?: string;
  completionPercentage?: string;
  currentStatus?: string;
  statusUpdatedAt?: string;
  verified: boolean;
  createdAt?: string;
  data?: {
    title?: string;
    text?: string;
    proofOfWork?: string;
    type?: string;
    completionPercentage?: string;
  };
}

export interface GrantCompleted {
  uid?: string;
  createdAt?: string;
  chainID?: number;
  data?: {
    title?: string;
    text?: string;
    proofOfWork?: string;
    pitchDeckLink?: string;
    demoVideoLink?: string;
    trackExplanations?: Array<{
      trackUID: string;
      explanation: string;
    }>;
  };
}

import type { CommunityDetails } from "./community";

export interface CommunityResponse {
  uid: string;
  chainID: number;
  details?: CommunityDetails;
}

export interface GrantResponse {
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
  community?: CommunityResponse;
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
