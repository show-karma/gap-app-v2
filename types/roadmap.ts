import {
  IGrantResponse,
  IMilestoneResponse,
  IProjectMilestoneResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

// Create a unified milestone type that can represent both project and grant milestones
export type UnifiedMilestone = {
  uid: string; // Unique identifier
  type: "project" | "grant"; // Type of milestone
  title: string;
  description?: string;
  completed: boolean;
  createdAt: string;
  endsAt?: number; // For sorting
  source: {
    projectMilestone?: IProjectMilestoneResponse;
    grantMilestone?: {
      milestone: IMilestoneResponse;
      grant: IGrantResponse;
    };
  };
  chainID: number;
  refUID: string;
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
