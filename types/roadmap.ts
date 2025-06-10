import {
  IGrantResponse,
  IGrantUpdate,
  IMilestoneResponse,
  IProjectImpact,
  IProjectMilestoneResponse,
  IProjectUpdate,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

// Create a unified milestone type that can represent both project and grant milestones
export type UnifiedMilestone = {
  uid: string; // Unique identifier
  type:
    | "project"
    | "grant"
    | "update"
    | "impact"
    | "activity"
    | "grant_update"
    | "milestone"; // Type of milestone or update
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
  endsAt?: number; // For sorting
  source: {
    projectMilestone?: IProjectMilestoneResponse;
    grantMilestone?: {
      milestone: IMilestoneResponse;
      grant: IGrantResponse;
    };
    type?: string;
    update?: IProjectUpdate | IGrantUpdate | IProjectImpact;
  };
  chainID: number;
  refUID: string;
  updateData?: IProjectUpdate | IGrantUpdate | IProjectImpact; // Original update data for rendering
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
