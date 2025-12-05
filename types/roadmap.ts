import type {
  IGrantUpdate,
  IProjectImpact,
  IProjectMilestoneResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import type { GrantMilestone, GrantResponse } from "@/types/v2/grant";

// Re-export V2 API types from their canonical location
export type {
  FundingApplicationMilestoneCompletion as V2FundingApplicationMilestoneCompletion,
  FundingAssociation as V2FundingAssociation,
  GrantInfo as V2GrantInfo,
  GrantMilestoneCompletionDetails as V2GrantMilestoneCompletionDetails,
  GrantMilestoneVerificationDetails as V2GrantMilestoneVerificationDetails,
  GrantMilestoneWithDetails as V2GrantMilestone,
  GrantUpdateWithDetails as V2GrantUpdate,
  IndicatorAssociation as V2IndicatorAssociation,
  ProjectMilestone as V2ProjectMilestone,
  ProjectMilestoneCompletionDetails as V2ProjectMilestoneCompletionDetails,
  ProjectUpdate as V2ProjectUpdate,
  ProjectUpdateAssociations as V2ProjectUpdateAssociations,
  // V2 API response types
  ProjectUpdateDeliverable as V2ProjectUpdateDeliverable,
  UpdatesApiResponse as V2UpdatesApiResponse,
} from "@/types/v2/roadmap";

// =============================================================================
// Legacy Types (for components that use the old structure)
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
      milestone: GrantMilestone;
      grant: GrantResponse;
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
