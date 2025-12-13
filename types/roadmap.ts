/**
 * Re-export all types from V2 roadmap
 * This file exists for backward compatibility with existing imports.
 * New code should import directly from @/types/v2/roadmap
 */

// Re-export with legacy aliases for backward compatibility
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
  ProjectUpdateDeliverable as V2ProjectUpdateDeliverable,
  UpdatesApiResponse as V2UpdatesApiResponse,
} from "@/types/v2/roadmap";
export * from "@/types/v2/roadmap";
