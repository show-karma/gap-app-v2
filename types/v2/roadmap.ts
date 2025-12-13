// Roadmap API Response types

import type {
  IGrantUpdate,
  IProjectImpact,
  IProjectMilestoneResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import type { GrantMilestone, GrantResponse } from "./grant";

// =============================================================================
// API Response Types (mirrors gap-indexer GetUpdatesApiResponse)
// =============================================================================

export type ProjectUpdateDeliverable = {
  name?: string;
  proof?: string;
  description?: string;
};

export type FundingAssociation = {
  name?: string;
  uid?: string;
};

export type IndicatorAssociation = {
  id?: string;
  name?: string;
  description?: string;
  unitOfMeasure?: string;
};

export type ProjectUpdateAssociations = {
  funding: FundingAssociation[];
  indicators: IndicatorAssociation[];
  deliverables: ProjectUpdateDeliverable[];
};

export type ProjectUpdate = {
  uid: string;
  recipient: string;
  title: string;
  description: string;
  verified: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string | null;
  associations: ProjectUpdateAssociations;
};

export type ProjectMilestoneCompletionDetails = {
  description: string;
  completedAt: string;
  completedBy: string;
  attestationUID?: string;
  proofOfWork?: string;
};

export type ProjectMilestone = {
  uid: string;
  title: string;
  description: string;
  dueDate: string | null;
  createdAt: string | null;
  recipient?: string;
  status: string;
  completionDetails: ProjectMilestoneCompletionDetails | null;
};

export type GrantMilestoneCompletionDetails = {
  description: string;
  completedAt: string;
  completedBy: string;
  attestationUID?: string;
  proofOfWork?: string;
  completionPercentage?: number;
  deliverables?: ProjectUpdateDeliverable[];
};

export type GrantMilestoneVerificationDetails = {
  description: string;
  verifiedAt: string;
  verifiedBy: string;
  attestationUID?: string;
};

export type FundingApplicationMilestoneCompletion = {
  id: string;
  referenceNumber: string;
  milestoneFieldLabel: string;
  milestoneTitle: string;
  completionText: string;
  ownerAddress: string;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string | null;
  verificationComment?: string;
  createdAt: string;
  updatedAt: string;
};

export type GrantInfo = {
  uid: string;
  title?: string;
  communityName?: string;
  communitySlug?: string;
  communityImage?: string;
};

export type GrantMilestoneWithDetails = {
  uid: string;
  programId?: string;
  chainId: string;
  title: string;
  description: string;
  priority?: number;
  dueDate: string | null;
  createdAt: string | null;
  recipient?: string;
  status: string;
  grant?: GrantInfo;
  completionDetails: GrantMilestoneCompletionDetails | null;
  verificationDetails: GrantMilestoneVerificationDetails | null;
  fundingApplicationCompletion?: FundingApplicationMilestoneCompletion | null;
};

export type GrantUpdateWithDetails = {
  uid: string;
  refUID: string;
  chainId: number;
  recipient: string;
  title: string;
  text: string;
  proofOfWork: string;
  completionPercentage: string;
  currentStatus: string;
  statusUpdatedAt: string | null;
  verified: boolean;
  createdAt: string | null;
  grant?: GrantInfo;
};

export type UpdatesApiResponse = {
  projectUpdates: ProjectUpdate[];
  projectMilestones: ProjectMilestone[];
  grantMilestones: GrantMilestoneWithDetails[];
  grantUpdates: GrantUpdateWithDetails[];
};

// =============================================================================
// Unified Types (for backward compatibility with existing components)
// =============================================================================

/**
 * Lightweight grant update type for UI display.
 * Used in ActivityCard, UpdateCard, and useUpdateActions.
 */
export type ConversionGrantUpdate = {
  type: string;
  uid: string;
  refUID: string;
  chainID?: number;
  recipient: string;
  attester: string;
  createdAt: string;
  data: {
    type: string;
    title: string;
    text: string;
    proofOfWork?: string;
    completionPercentage?: string;
  };
  verified?: unknown[];
};

/**
 * Source tracking for unified milestones.
 * Uses inline types for minimal UI display requirements.
 */
export type UnifiedMilestoneSource = {
  projectMilestone?: {
    uid: string;
    attester?: string;
    completed?: {
      createdAt: string;
      attester?: string;
      data: {
        proofOfWork?: string;
        reason?: string;
      };
    };
    verified?: boolean;
  };
  grantMilestone?: {
    milestone: GrantMilestone;
    completionDetails?: GrantMilestoneCompletionDetails | null;
    grant: {
      uid: string;
      chainID: number;
      details?: {
        title?: string;
        programId?: string;
      };
      community?: {
        uid: string;
        chainID: number;
        details?: {
          slug?: string;
          name?: string;
          imageURL?: string;
        };
      };
    };
  };
  type?: string;
};

export type UnifiedMilestone = {
  uid: string;
  type: "project" | "grant" | "update" | "impact" | "activity" | "grant_update" | "milestone";
  title: string;
  description?: string;
  completed:
    | boolean
    | {
        createdAt: string;
        data: {
          proofOfWork?: string;
          reason?: string;
          type?: string;
          completionPercentage?: number;
          deliverables?: ProjectUpdateDeliverable[];
        };
      };
  createdAt: string;
  startsAt?: number;
  endsAt?: number;
  source: UnifiedMilestoneSource;
  chainID: number;
  refUID: string;
  projectUpdate?: ProjectUpdate;
  /** Grant update for display - uses conversion type for flexibility, or SDK type */
  grantUpdate?: ConversionGrantUpdate | IGrantUpdate;
  projectImpact?: IProjectImpact;
  mergedGrants?: Array<{
    grantUID: string;
    milestoneUID: string;
    grantTitle?: string;
    communityName?: string;
    communityImage?: string;
    chainID: number;
    programId?: string;
  }>;
};

// Aliases for backward compatibility during migration
export type V2ProjectUpdateDeliverable = ProjectUpdateDeliverable;
export type V2FundingAssociation = FundingAssociation;
export type V2IndicatorAssociation = IndicatorAssociation;
export type V2ProjectUpdateAssociations = ProjectUpdateAssociations;
export type V2ProjectUpdate = ProjectUpdate;
export type V2ProjectMilestoneCompletionDetails = ProjectMilestoneCompletionDetails;
export type V2ProjectMilestone = ProjectMilestone;
export type V2GrantMilestoneCompletionDetails = GrantMilestoneCompletionDetails;
export type V2GrantMilestoneVerificationDetails = GrantMilestoneVerificationDetails;
export type V2FundingApplicationMilestoneCompletion = FundingApplicationMilestoneCompletion;
export type V2GrantInfo = GrantInfo;
export type V2GrantMilestone = GrantMilestoneWithDetails;
export type V2GrantUpdate = GrantUpdateWithDetails;
export type V2UpdatesApiResponse = UpdatesApiResponse;
