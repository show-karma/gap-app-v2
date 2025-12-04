import type {
  IGrantResponse,
  IGrantUpdate,
  IMilestoneResponse,
  IProjectImpact,
  IProjectMilestoneResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

// =============================================================================
// V2 API Response Types (mirrors gap-indexer GetUpdatesApiResponse)
// =============================================================================

export type V2ProjectUpdateDeliverable = {
  name?: string;
  proof?: string;
  description?: string;
};

export type V2FundingAssociation = {
  name?: string;
  uid?: string;
};

export type V2IndicatorAssociation = {
  id?: string;
  name?: string;
  description?: string;
  unitOfMeasure?: string;
};

export type V2ProjectUpdateAssociations = {
  funding: V2FundingAssociation[];
  indicators: V2IndicatorAssociation[];
  deliverables: V2ProjectUpdateDeliverable[];
};

export type V2ProjectUpdate = {
  uid: string;
  title: string;
  description: string;
  verified: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string | null;
  associations: V2ProjectUpdateAssociations;
};

export type V2ProjectMilestoneCompletionDetails = {
  description: string;
  completedAt: string;
  completedBy: string;
  attestationUID?: string;
  proofOfWork?: string;
};

export type V2ProjectMilestone = {
  uid: string;
  title: string;
  description: string;
  dueDate: string | null;
  createdAt: string | null;
  recipient?: string;
  status: string;
  completionDetails: V2ProjectMilestoneCompletionDetails | null;
};

export type V2GrantMilestoneCompletionDetails = {
  description: string;
  completedAt: string;
  completedBy: string;
  attestationUID?: string;
  proofOfWork?: string;
};

export type V2GrantMilestoneVerificationDetails = {
  description: string;
  verifiedAt: string;
  verifiedBy: string;
  attestationUID?: string;
};

export type V2FundingApplicationMilestoneCompletion = {
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

export type V2GrantInfo = {
  uid: string;
  title?: string;
  communityName?: string;
  communitySlug?: string;
  communityImage?: string;
};

export type V2GrantMilestone = {
  uid: string;
  programId?: string;
  chainId: string;
  title: string;
  description: string;
  dueDate: string | null;
  createdAt: string | null;
  recipient?: string;
  status: string;
  grant?: V2GrantInfo;
  completionDetails: V2GrantMilestoneCompletionDetails | null;
  verificationDetails: V2GrantMilestoneVerificationDetails | null;
  fundingApplicationCompletion?: V2FundingApplicationMilestoneCompletion | null;
};

export type V2GrantUpdate = {
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
  grant?: V2GrantInfo;
};

export type V2UpdatesApiResponse = {
  projectUpdates: V2ProjectUpdate[];
  projectMilestones: V2ProjectMilestone[];
  grantMilestones: V2GrantMilestone[];
  grantUpdates: V2GrantUpdate[];
};

// =============================================================================
// Legacy Types (for backward compatibility during migration)
// =============================================================================

export type FundingAssociation = {
  name: string;
  uid: string;
};

export type IndicatorAssociation = {
  id?: string;
  indicatorId?: string;
  name: string;
  description?: string;
  unitOfMeasure?: string;
  datapoints?: Array<{
    value: number;
    startDate: string;
    endDate: string;
    proof?: string;
  }>;
};

export type ProjectUpdateDeliverable = {
  name: string;
  proof: string;
  description: string;
};

export type ProjectUpdateAssociations = {
  funding: FundingAssociation[];
  indicators: IndicatorAssociation[];
  deliverables: ProjectUpdateDeliverable[];
};

// API response structure for project updates - nested data structure
export type ProjectUpdateData = {
  title: string;
  text: string;
  type?: string;
  grants?: string[];
  deliverables?: ProjectUpdateDeliverable[];
  indicators?: Array<{
    indicatorId: string;
    name: string;
  }>;
};

// ProjectUpdate supports both flat structure (API response) and nested structure
// Flat: title, text, deliverables at root level
// Nested: title, text, deliverables inside data property
export type ProjectUpdate = {
  uid: string;
  type?: string;
  schemaUID?: string;
  refUID?: string;
  attester?: string;
  recipient?: string;
  revoked?: boolean;
  createdAt: string;
  updatedAt?: string;
  chainID?: number;
  txid?: string;
  verified?: boolean | string[];
  // Flat structure fields (from API)
  title?: string;
  text?: string;
  startDate?: string;
  endDate?: string;
  grants?: string[];
  deliverables?: ProjectUpdateDeliverable[];
  // Nested data structure (alternative format)
  data?: ProjectUpdateData;
  // Indicators with datapoints (at root level from API)
  indicators?: IndicatorAssociation[];
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
        };
      };
  createdAt: string;
  startsAt?: number;
  endsAt?: number;
  source: {
    projectMilestone?: IProjectMilestoneResponse;
    grantMilestone?: {
      milestone: IMilestoneResponse;
      grant: IGrantResponse;
    };
    type?: string;
  };
  chainID: number;
  refUID: string;
  projectUpdate?: ProjectUpdate;
  grantUpdate?: IGrantUpdate;
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
